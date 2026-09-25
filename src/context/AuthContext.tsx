import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, AuthSession } from '../types/auth';
import { supabase } from '../lib/supabase';
import { loginApi } from '../lib/api';
import { Session, User } from '@supabase/supabase-js';

const AUTH_STORAGE_KEY = 'sge_auth_session';
const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos de inatividade conforme LGPD

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string, turnstileToken?: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  privacyMode: boolean;
  togglePrivacyMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapSupabaseUserToAuthUser(sbUser: User | null): AuthUser | null {
  if (!sbUser) return null;
  const meta = sbUser.user_metadata || {};
  const email = sbUser.email || '';
  const username = meta.username || email.split('@')[0] || 'admin';
  const name = meta.name || meta.full_name || username.toUpperCase();
  const role = meta.role || 'Operador / Auditor Estadual';
  const state = meta.state || 'Tocantins - TO';

  return {
    id: sbUser.id,
    name,
    email,
    username,
    role,
    state
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [privacyMode, setPrivacyMode] = useState<boolean>(false);

  useEffect(() => {
    // VULN-005: Limpar resquícios legados de localStorage por segurança
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {}

    // 1. Obter sessão atual do Supabase Auth
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn('Erro ao restaurar sessão do Supabase:', error);
      }
      if (session) {
        setToken(session.access_token);
        setUser(mapSupabaseUserToAuthUser(session.user));
      } else {
        // Sessão temporária em sessionStorage
        try {
          const cached = sessionStorage.getItem(AUTH_STORAGE_KEY);
          if (cached) {
            const parsed: AuthSession = JSON.parse(cached);
            if (parsed?.token && parsed?.user) {
              setToken(parsed.token);
              setUser(parsed.user);
            }
          }
        } catch {}
      }
      setIsLoading(false);
    });

    // 2. Escutar mudanças no estado de autenticação do Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      if (session) {
        setToken(session.access_token);
        setUser(mapSupabaseUserToAuthUser(session.user));
      } else {
        setToken(null);
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (
    identifier: string,
    password: string,
    turnstileToken?: string,
    _remember: boolean = false
  ) => {
    const cleanId = identifier.trim();
    if (!cleanId) throw new Error('Por favor, informe seu usuário ou e-mail.');
    if (!password) throw new Error('Por favor, informe sua senha de acesso.');

    // Converte identificador: tenta com o próprio se tiver @, senão tenta @seduc.to.gov.br e depois @sge.to.gov.br
    const candidateEmails = cleanId.includes('@')
      ? [cleanId.toLowerCase()]
      : [`${cleanId.toLowerCase()}@seduc.to.gov.br`, `${cleanId.toLowerCase()}@sge.to.gov.br`];

    let lastError: any = null;
    let authData: any = null;

    for (let i = 0; i < candidateEmails.length; i++) {
      const emailToUse = candidateEmails[i];
      // IMPORTANTE: Tokens Turnstile são de uso único. Só repassamos no primeiro teste para não queimar token repetido
      const currentToken = i === 0 ? turnstileToken : undefined;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: password,
        options: currentToken ? { captchaToken: currentToken } : undefined
      });

      if (!error && data?.session) {
        authData = data;
        lastError = null;
        break;
      }
      lastError = error;
    }

    if (lastError || !authData?.session) {
      // Se for erro específico de captcha retornado pelo Supabase Auth
      const errMsg = lastError?.message || '';
      if (errMsg.toLowerCase().includes('captcha')) {
        throw new Error('Falha na validação do Captcha pelo Supabase: ' + errMsg);
      }

      try {
        const session = await loginApi(cleanId, password, turnstileToken);
        if (session && session.token) {
          setToken(session.token);
          setUser(session.user);
          try {
            sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
          } catch {}
          return;
        }
      } catch (apiErr: any) {
        if (apiErr?.message && apiErr.message.toLowerCase().includes('captcha')) {
          throw apiErr;
        }
      }

      // VULN-009: Mensagem unificada anti-enumeração
      throw new Error('Credenciais inválidas. Verifique os dados informados.');
    }

    setToken(authData.session.access_token);
    setUser(mapSupabaseUserToAuthUser(authData.session.user));
    try {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        token: authData.session.access_token,
        user: mapSupabaseUserToAuthUser(authData.session.user)
      }));
    } catch {}
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Erro ao deslogar no Supabase:', e);
    }
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {}
  };

  // Auto-logout por inatividade (LGPD / Proteção em Terminais de Secretarias e Escolas)
  useEffect(() => {
    if (!user) return;

    let timeoutId: any = null;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        console.warn('Sessão encerrada por inatividade de 15 minutos (LGPD/Segurança).');
        await logout();
      }, IDLE_TIMEOUT_MS);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    let lastReset = Date.now();

    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle para executar resetTimer no máximo a cada 2 segundos
      if (now - lastReset > 2000) {
        lastReset = now;
        resetTimer();
      }
    };

    resetTimer();

    events.forEach(evt => window.addEventListener(evt, handleUserActivity, { passive: true }));

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(evt => window.removeEventListener(evt, handleUserActivity));
    };
  }, [user]);

  const togglePrivacyMode = () => {
    setPrivacyMode(prev => !prev);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token),
        isLoading,
        login,
        logout,
        privacyMode,
        togglePrivacyMode
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return ctx;
};
