import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

interface LoginViewProps {
  onNotify: (msg: string) => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export const LoginView: React.FC<LoginViewProps> = ({ onNotify }) => {
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Cloudflare Turnstile state
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);
  const [scriptLoadTimeout, setScriptLoadTimeout] = useState<boolean>(false);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  // Client-side rate limiting tracker (proteção imediata antes do submit)
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [lockedUntil, setLockedUntil] = useState<number>(0);
  const [lockCountdown, setLockCountdown] = useState<number>(0);

  const siteKey = (import.meta.env?.VITE_CLOUDFLARE_SITE_KEY || '').trim();
  const isCaptchaConfigured = Boolean(siteKey);

  // Countdown timer para o rate limit client-side
  useEffect(() => {
    if (lockedUntil <= Date.now()) {
      setLockCountdown(0);
      return;
    }

    const timer = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockCountdown(0);
        setLockedUntil(0);
        setAttemptCount(0);
        clearInterval(timer);
      } else {
        setLockCountdown(remaining);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lockedUntil]);

  // Função centralizada para renderizar o widget Turnstile
  const initTurnstile = () => {
    if (!isCaptchaConfigured) {
      console.warn('VITE_CLOUDFLARE_SITE_KEY não configurada no arquivo de ambiente.');
      return;
    }

    if (
      window.turnstile &&
      turnstileContainerRef.current &&
      !turnstileWidgetId.current
    ) {
      try {
        turnstileWidgetId.current = window.turnstile.render(
          turnstileContainerRef.current,
          {
            sitekey: siteKey,
            callback: (token: string) => {
              setTurnstileToken(token);
              setTurnstileError(null);
              setErrorMsg(null);
            },
            'expired-callback': () => {
              setTurnstileToken(null);
            },
            'error-callback': () => {
              setTurnstileToken(null);
              setTurnstileError(
                'Falha na validação do Cloudflare Turnstile. Se estiver em produção, adicione o domínio do seu site na lista de "Allowed Domains" no painel da Cloudflare (Erro 110200) ou verifique se um bloqueador de anúncios impediu a requisição.'
              );
            },
            theme: 'light'
          }
        );
      } catch (e: any) {
        console.error('Erro ao renderizar widget Turnstile:', e);
        setTurnstileToken(null);
        setTurnstileError('Erro ao inicializar o componente de captcha.');
      }
    }
  };

  const handleReloadCaptcha = () => {
    setTurnstileError(null);
    setScriptLoadTimeout(false);
    setTurnstileToken(null);

    if (window.turnstile && turnstileWidgetId.current) {
      try {
        window.turnstile.remove(turnstileWidgetId.current);
      } catch {}
      turnstileWidgetId.current = null;
    }

    setTimeout(() => {
      initTurnstile();
    }, 100);
  };

  // Inicializar Cloudflare Turnstile e observar carregamento do script
  useEffect(() => {
    if (!isCaptchaConfigured) return;

    let checkInterval: any = null;
    let timeoutTimer: any = null;

    if (window.turnstile) {
      initTurnstile();
    } else {
      checkInterval = setInterval(() => {
        if (window.turnstile) {
          initTurnstile();
          clearInterval(checkInterval);
          if (timeoutTimer) clearTimeout(timeoutTimer);
        }
      }, 300);

      // Se após 6 segundos o script da Cloudflare não carregar (ex: firewall/adblocker)
      timeoutTimer = setTimeout(() => {
        if (!window.turnstile) {
          setScriptLoadTimeout(true);
          clearInterval(checkInterval);
        }
      }, 6000);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (window.turnstile && turnstileWidgetId.current) {
        try {
          window.turnstile.remove(turnstileWidgetId.current);
          turnstileWidgetId.current = null;
        } catch {}
      }
    };
  }, [siteKey, isCaptchaConfigured]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // 1. Verificação de Rate Limit Local
    if (lockedUntil > Date.now()) {
      setErrorMsg(
        `Muitas tentativas. Aguarde ${lockCountdown}s antes de tentar novamente.`
      );
      return;
    }

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      setErrorMsg('Por favor, informe seu usuário ou e-mail.');
      return;
    }
    if (!password) {
      setErrorMsg('Por favor, informe sua senha de acesso.');
      return;
    }

    // 2. Verificação do Cloudflare Turnstile (quando configurado no ambiente)
    if (isCaptchaConfigured && !turnstileToken) {
      if (turnstileError) {
        setErrorMsg('Erro na verificação anti-robô. Clique em "Recarregar Captcha" abaixo antes de prosseguir.');
      } else if (scriptLoadTimeout) {
        setErrorMsg('O script de verificação não carregou. Verifique sua conexão com a internet ou extensões.');
      } else {
        setErrorMsg('Por favor, valide o captcha anti-robôs da Cloudflare antes de entrar.');
      }
      return;
    }

    setLoading(true);
    try {
      await login(trimmedIdentifier, password, turnstileToken || undefined);
      onNotify('Bem-vindo ao Backup SGE!');
      setAttemptCount(0);
      setLockedUntil(0);
    } catch (err: any) {
      const newAttempts = attemptCount + 1;
      setAttemptCount(newAttempts);

      // Bloqueio por 30s após 5 falhas
      if (newAttempts >= 5) {
        const lockTime = Date.now() + 30000;
        setLockedUntil(lockTime);
        setLockCountdown(30);
        setErrorMsg(
          'Muitas tentativas incorretas. Sistema bloqueado temporariamente por 30 segundos.'
        );
      } else {
        const remainingAttempts = 5 - newAttempts;
        setErrorMsg(
          (err.message || 'Credenciais inválidas.') +
            ` (${remainingAttempts} tentativa${
              remainingAttempts > 1 ? 's' : ''
            } restante${remainingAttempts > 1 ? 's' : ''})`
        );
      }

      // Reset Turnstile após tentativa falha
      if (window.turnstile && turnstileWidgetId.current) {
        try {
          window.turnstile.reset(turnstileWidgetId.current);
          setTurnstileToken(null);
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-view">
      <div className="auth-backdrop-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      <div className="auth-card-container">
        <div className="auth-header">
          <div className="auth-titles">
            <h2>BACKUP SGE</h2>
            <span className="auth-state-tag">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" />
              </svg>
              Consulta &amp; Histórico Escolar
            </span>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-card-head">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <h3>Autenticação Segura</h3>
            </div>
            <p>Informe suas credenciais de acesso.</p>
          </div>

          {errorMsg && (
            <div className="auth-alert" style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#b91c1c' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="auth-alert auth-alert-success">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" autoComplete="on">
            <div className="form-group">
              <label htmlFor="loginIdentifier">E-mail ou Usuário</label>
              <div className="input-icon-wrapper">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </span>
                <input
                  type="text"
                  id="loginIdentifier"
                  name="username"
                  placeholder="Ex: consulta@seduc.to.gov.br"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  autoComplete="username"
                  disabled={lockCountdown > 0}
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <div className="label-row">
                <label htmlFor="loginPassword">Senha de Acesso</label>
              </div>
              <div className="input-icon-wrapper">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="loginPassword"
                  name="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={lockCountdown > 0}
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowPassword(p => !p)}
                  title="Mostrar/ocultar senha"
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Cloudflare Turnstile Captcha Widget */}
            <div className="turnstile-wrapper" style={{ margin: '1rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              {!isCaptchaConfigured && (
                <div style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  fontSize: '0.78rem',
                  lineHeight: '1.45',
                  textAlign: 'center',
                  width: '100%'
                }}>
                  <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <span>Aviso de Ambiente (Produção)</span>
                  </div>
                  <div style={{ marginTop: '0.25rem', color: '#78350f' }}>
                    A variável <code>VITE_CLOUDFLARE_SITE_KEY</code> não está configurada no painel da Vercel. O login está liberado em modo de contingência.
                  </div>
                </div>
              )}

              {isCaptchaConfigured && (
                <>
                  <div ref={turnstileContainerRef} id="cloudflare-turnstile" style={{ minHeight: '65px' }}></div>
                  
                  {turnstileToken && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.4rem', fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Verificação anti-robô concluída</span>
                    </div>
                  )}

                  {turnstileError && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      background: '#fef2f2',
                      border: '1px solid #fca5a5',
                      color: '#b91c1c',
                      fontSize: '0.78rem',
                      lineHeight: '1.45',
                      textAlign: 'center',
                      width: '100%'
                    }}>
                      <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Falha no Cloudflare Turnstile</div>
                      <div style={{ color: '#991b1b', marginBottom: '0.5rem' }}>{turnstileError}</div>
                      <button
                        type="button"
                        onClick={handleReloadCaptcha}
                        style={{
                          padding: '0.35rem 0.75rem',
                          background: '#dc2626',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        Recarregar Captcha
                      </button>
                    </div>
                  )}

                  {scriptLoadTimeout && !turnstileError && !turnstileToken && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      background: '#fffbeb',
                      border: '1px solid #fcd34d',
                      color: '#92400e',
                      fontSize: '0.78rem',
                      lineHeight: '1.45',
                      textAlign: 'center',
                      width: '100%'
                    }}>
                      <div style={{ fontWeight: 600 }}>Script do Turnstile demorou a responder</div>
                      <div style={{ marginTop: '0.2rem', marginBottom: '0.4rem', color: '#78350f' }}>
                        Verifique se seu navegador ou firewall está bloqueando conexões para <code>challenges.cloudflare.com</code>.
                      </div>
                      <button
                        type="button"
                        onClick={handleReloadCaptcha}
                        style={{
                          padding: '0.35rem 0.75rem',
                          background: '#d97706',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        Tentar novamente
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || lockCountdown > 0 || (isCaptchaConfigured && !turnstileToken)}
              className="btn btn-auth-submit"
              style={{
                opacity: (isCaptchaConfigured && !turnstileToken) || lockCountdown > 0 ? 0.65 : 1,
                cursor: (isCaptchaConfigured && !turnstileToken) || lockCountdown > 0 ? 'not-allowed' : 'pointer'
              }}
              title={isCaptchaConfigured && !turnstileToken ? 'Valide o captcha da Cloudflare para habilitar o login' : ''}
            >
              {loading ? (
                <>
                  <span className="btn-text">Autenticando...</span>
                  <div className="auth-spinner"></div>
                </>
              ) : lockCountdown > 0 ? (
                <span className="btn-text">Bloqueado ({lockCountdown}s)</span>
              ) : (
                <>
                  <span className="btn-text">Entrar no Sistema</span>
                  <span className="btn-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </span>
                </>
              )}
            </button>
          </form>

          <div className="auth-card-footer">
            <span className="security-notice">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Acesso restrito a operadores autorizados
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
