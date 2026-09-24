import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// =============================================================================
// RATE LIMITING & SECURITY NOTICE (VULN-019)
// Em ambientes serverless (Vercel/AWS Lambda), instâncias isoladas possuem memória
// efêmera. Para produção com alta escala, recomenda-se migrar este Map para
// um store compartilhado como Redis (Upstash) ou RPC/tabela atômica no Supabase.
// =============================================================================
const loginAttempts = new Map();

async function verifyTurnstileToken(token, remoteip) {
  const secretKey = process.env.CLOUDFLARE_SECRET_KEY;
  if (!secretKey) {
    console.warn('⚠️ CLOUDFLARE_SECRET_KEY não configurada na API serverless. Ignorando validação em desenvolvimento.');
    return true;
  }

  if (!token) return false;

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteip) formData.append('remoteip', remoteip);

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const outcome = await response.json();
    return Boolean(outcome.success);
  } catch (err) {
    console.error('Erro ao verificar Cloudflare Turnstile token na API serverless:', err);
    return false;
  }
}

export default async function handler(req, res) {
  // SECURITY: Restrict CORS
  const origin = req.headers.origin || '';
  const allowed = ['http://localhost:5173', 'http://localhost:3000'];
  if (process.env.ALLOWED_ORIGIN) allowed.push(process.env.ALLOWED_ORIGIN);
  
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  const ipKey = String(clientIp).split(',')[0].trim();
  const now = Date.now();
  const attempt = loginAttempts.get(ipKey) || { count: 0, lockedUntil: 0 };

  if (attempt.lockedUntil > now) {
    const remaining = Math.ceil((attempt.lockedUntil - now) / 1000);
    return res.status(429).json({
      success: false,
      message: `Muitas tentativas. Aguarde ${remaining}s antes de tentar novamente.`
    });
  }

  try {
    const { username, password, turnstileToken } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, informe o e-mail/usuário e a senha.'
      });
    }

    // 1. Validação Server-Side Cloudflare Turnstile (VULN-003, VULN-011)
    if (process.env.CLOUDFLARE_SECRET_KEY) {
      const isTurnstileValid = await verifyTurnstileToken(turnstileToken, ipKey);
      if (!isTurnstileValid) {
        return res.status(400).json({
          success: false,
          message: 'Validação de segurança anti-robô obrigatória ou expirada. Tente novamente.'
        });
      }
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        message: 'Serviço de autenticação não configurado.'
      });
    }

    const cleanUser = String(username).trim();
    const candidateEmails = cleanUser.includes('@')
      ? [cleanUser.toLowerCase()]
      : [`${cleanUser.toLowerCase()}@seduc.to.gov.br`, `${cleanUser.toLowerCase()}@sge.to.gov.br`];

    let lastError = null;
    let authData = null;

    for (const emailToAuth of candidateEmails) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToAuth,
        password: String(password)
      });

      if (!error && data?.session) {
        authData = data;
        lastError = null;
        break;
      }
      lastError = error;
    }

    if (lastError || !authData?.session) {
      attempt.count++;
      // Bloqueio progressivo (VULN-007)
      if (attempt.count >= 15) {
        attempt.lockedUntil = now + 15 * 60 * 1000;
      } else if (attempt.count >= 10) {
        attempt.lockedUntil = now + 2 * 60 * 1000;
      } else if (attempt.count >= 5) {
        attempt.lockedUntil = now + 30 * 1000;
      }
      loginAttempts.set(ipKey, attempt);

      // VULN-009: Mensagem unificada anti-enumeração
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas. Verifique os dados informados.'
      });
    }

    // Sucesso no login - reset de tentativas
    loginAttempts.delete(ipKey);

    const sbUser = authData.session.user;
    const meta = sbUser.user_metadata || {};

    return res.status(200).json({
      success: true,
      token: authData.session.access_token,
      expiresIn: authData.session.expires_in,
      user: {
        id: sbUser.id,
        name: meta.name || cleanUser,
        username: meta.username || cleanUser.split('@')[0],
        email: sbUser.email,
        role: meta.role || 'Operador / Auditor Estadual',
        state: meta.state || 'Tocantins - TO'
      }
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro interno no servidor de autenticação.' });
  }
}
