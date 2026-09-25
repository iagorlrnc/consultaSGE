import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

if (process.env.NODE_ENV === 'production') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const proto = req.headers['x-forwarded-proto'];
    if (proto && proto !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || '';
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('seu-projeto'));

let supabase: SupabaseClient | null = null;
if (USE_SUPABASE) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
  });
  console.log('⚡ Conectado ao Supabase');
}

// =============================================================================
// IN-MEMORY DATA (Anonymous aggregate statistics only)
// =============================================================================
let stats = {
  totalRecords: 239449,
  withCpf: 230917,
  withoutCpf: 8532,
  totalEnrollments: 361748,
  uniqueSchools: 495,
  genderCounts: {} as Record<string, number>,
  raceCounts: {} as Record<string, number>,
  disabilityCounts: {} as Record<string, number>,
  topCities: [] as any[]
};

// Load ONLY aggregate stats (no personal data / sample records)
const DATA_SUMMARY_PATH = path.join(process.cwd(), 'data_summary.json');
const ENROLLMENT_SUMMARY_PATH = path.join(process.cwd(), 'enrollment_summary.json');

if (fs.existsSync(DATA_SUMMARY_PATH)) {
  try {
    const ds = JSON.parse(fs.readFileSync(DATA_SUMMARY_PATH, 'utf8'));
    stats.totalRecords = ds.totalObjects || ds.totalRecords || stats.totalRecords;
    stats.withCpf = ds.validCpfCount || stats.withCpf;
    stats.withoutCpf = ds.emptyCpfCount || stats.withoutCpf;
    stats.genderCounts = ds.genderValues || {};
    stats.raceCounts = ds.raceColorValues || {};
    stats.disabilityCounts = ds.disabilityTypeValues || {};
    stats.topCities = ds.topCities || [];
  } catch {
    // Silently ignore
  }
}

if (fs.existsSync(ENROLLMENT_SUMMARY_PATH)) {
  try {
    const es = JSON.parse(fs.readFileSync(ENROLLMENT_SUMMARY_PATH, 'utf8'));
    stats.totalEnrollments = es.totalRecords || stats.totalEnrollments;
    stats.uniqueSchools = es.uniqueSchoolsCount || stats.uniqueSchools;
  } catch {
    // Silently ignore
  }
}

// =============================================================================
// =============================================================================
// SECURITY: CORS — Restrict to allowed origins only (VULN-013)
// For requests without Origin (e.g. server-to-server or trusted local tools),
// access is strictly guarded by Supabase JWT Bearer token authentication.
// =============================================================================
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

if (process.env.ALLOWED_ORIGIN) {
  ALLOWED_ORIGINS.push(process.env.ALLOWED_ORIGIN);
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origem não autorizada pelo CORS.'));
  },
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));

// =============================================================================
// SECURITY: HTTP Headers (VULN-010: Removed 'unsafe-inline' from script-src)
// =============================================================================
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-src https://challenges.cloudflare.com; img-src 'self' data:; connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com"
  );
  next();
});

// =============================================================================
// SECURITY: Cloudflare Turnstile Server-Side Verification (VULN-003, VULN-011)
// =============================================================================
async function verifyTurnstileToken(token?: string, remoteip?: string): Promise<boolean> {
  const secretKey = process.env.CLOUDFLARE_SECRET_KEY;
  if (!secretKey) {
    console.warn('⚠️ CLOUDFLARE_SECRET_KEY não configurada no servidor. Validação de Turnstile ignorada em desenvolvimento.');
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

    const outcome: any = await response.json();
    return Boolean(outcome.success);
  } catch (err) {
    console.error('Erro ao verificar Cloudflare Turnstile token:', err);
    return false;
  }
}

// =============================================================================
// SECURITY: Authentication Middleware (Supabase JWT)
// =============================================================================
interface AuthenticatedRequest extends Request {
  user?: { id: string; email?: string; role?: string };
}

const activeTokens = new Map<string, { username: string; createdAt: number }>();
const TOKEN_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Autenticação obrigatória. Faça login para acessar.' });
    return;
  }
  const token = authHeader.slice(7).trim();

  // 1. Verify Active Session Token
  const localRecord = activeTokens.get(token);
  if (localRecord && Date.now() - localRecord.createdAt <= TOKEN_EXPIRY_MS) {
    req.user = { id: localRecord.username, role: 'operator' };
    next();
    return;
  }

  // 2. Verify Supabase Auth JWT
  if (USE_SUPABASE && supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        req.user = {
          id: user.id,
          email: user.email,
          role: (user.user_metadata?.role as string) || 'operator'
        };
        next();
        return;
      }
    } catch {}
  }

  res.status(401).json({ error: 'Sessão expirada ou inválida. Faça login novamente.' });
}

// =============================================================================
// SECURITY: Rate Limiting com Bloqueio Progressivo (VULN-007)
// =============================================================================
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const searchAttempts = new Map<string, { count: number; windowStart: number }>();

const SEARCH_RATE_LIMIT = 30; // max requests per minute
const SEARCH_RATE_WINDOW_MS = 60000;

function checkLoginRateLimit(ip: string): { allowed: boolean; remainingSec: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true, remainingSec: 0 };
  if (record.lockedUntil > now) {
    return { allowed: false, remainingSec: Math.ceil((record.lockedUntil - now) / 1000) };
  }
  if (now - record.lockedUntil > 60000) {
    loginAttempts.delete(ip);
  }
  return { allowed: true, remainingSec: 0 };
}

function recordFailedLogin(ip: string) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  record.count++;

  // Bloqueio progressivo:
  // 5 a 9 tentativas: 30 segundos
  // 10 a 14 tentativas: 2 minutos (120s)
  // 15+ tentativas: 15 minutos (900s)
  if (record.count >= 15) {
    record.lockedUntil = now + 15 * 60 * 1000;
  } else if (record.count >= 10) {
    record.lockedUntil = now + 2 * 60 * 1000;
  } else if (record.count >= 5) {
    record.lockedUntil = now + 30 * 1000;
  }

  loginAttempts.set(ip, record);
}

function resetLoginAttempts(ip: string) {
  loginAttempts.delete(ip);
}

function checkSearchRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = searchAttempts.get(ip);
  if (!record || now - record.windowStart > SEARCH_RATE_WINDOW_MS) {
    searchAttempts.set(ip, { count: 1, windowStart: now });
    return true;
  }
  record.count++;
  return record.count <= SEARCH_RATE_LIMIT;
}

// =============================================================================
// API ROUTES
// =============================================================================

// POST /api/login — Public
app.post('/api/login', async (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const { allowed, remainingSec } = checkLoginRateLimit(clientIp);

  if (!allowed) {
    return res.status(429).json({
      success: false,
      message: `Muitas tentativas incorretas. Aguarde ${remainingSec}s antes de tentar novamente.`
    });
  }

  try {
    const { username, password, turnstileToken } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, informe o usuário e a senha.'
      });
    }

    // 1. Validação server-side do Cloudflare Turnstile (VULN-003, VULN-011)
    if (process.env.CLOUDFLARE_SECRET_KEY) {
      const isTurnstileValid = await verifyTurnstileToken(turnstileToken, clientIp);
      if (!isTurnstileValid) {
        return res.status(400).json({
          success: false,
          message: 'Validação de segurança anti-robô obrigatória ou expirada. Tente novamente.'
        });
      }
    }

    const cleanUser = String(username).trim();

    // 2. Autenticação forte via Supabase Auth (bcrypt nativo)
    if (USE_SUPABASE && supabase) {
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

      if (!lastError && authData?.session) {
        resetLoginAttempts(clientIp);
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
      }
    }

    // VULN-006: Fallback de contingência local inseguro com senha em texto plano removido.
    // VULN-009: Mensagem unificada anti-enumeração de usuários.
    recordFailedLogin(clientIp);
    return res.status(401).json({
      success: false,
      message: 'Credenciais inválidas. Verifique os dados informados.'
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro interno no processamento do login.' });
  }
});
  } catch {
    return res.status(500).json({ success: false, message: 'Erro interno no processamento do login.' });
  }
});

// POST /api/logout
app.post('/api/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    activeTokens.delete(authHeader.slice(7).trim());
  }
  return res.status(200).json({ success: true, message: 'Sessão encerrada.' });
});

// GET /api/search — Protected: requires real authentication + rate limited + audit logged
app.get('/api/search', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
  if (!checkSearchRateLimit(clientIp)) {
    return res.status(429).json({
      error: 'Muitas requisições de busca. Aguarde um momento antes de tentar novamente.'
    });
  }

  const rawQuery = String(req.query.cpf || req.query.q || '').trim();
  if (!rawQuery) {
    return res.status(400).json({ error: 'Parâmetro de pesquisa não informado.' });
  }

  // Sanitize input to eliminate PostgREST Filter Injection
  const digits = rawQuery.replace(/\D/g, '');
  if (digits.length === 0 && rawQuery.length < 3) {
    return res.status(400).json({ error: 'Informe pelo menos 3 caracteres para busca por nome.' });
  }

  let student: any = null;
  let enrollments: any[] = [];

  if (USE_SUPABASE && supabase) {
    try {
      // 1. Search by sanitized CPF
      if (digits.length > 0) {
        const paddedCpf = digits.padStart(11, '0').slice(0, 11);
        const formattedCpf = paddedCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        
        const { data: sData } = await supabase
          .from('students')
          .select('data, student_id')
          .or(`clean_cpf.eq.${paddedCpf},clean_cpf.eq.${digits},cpf.eq.${formattedCpf}`)
          .limit(1)
          .maybeSingle();

        if (sData) student = sData.data;
      }

      // 2. Search by numeric Student ID
      if (!student && digits.length > 0) {
        const { data: sData } = await supabase
          .from('students')
          .select('data, student_id')
          .eq('student_id', digits)
          .limit(1)
          .maybeSingle();

        if (sData) student = sData.data;
      }

      // 3. Search by Name (strictly sanitized text without PostgREST delimiters)
      if (!student) {
        const safeName = rawQuery.replace(/[^\w\sÀ-ÿ]/gi, '').trim();
        if (safeName.length >= 3) {
          const { data: sData } = await supabase
            .from('students')
            .select('data, student_id')
            .ilike('name', `%${safeName.toUpperCase()}%`)
            .limit(1)
            .maybeSingle();

          if (sData) student = sData.data;
        }
      }

      if (student) {
        const stId = String(student.studentId?.$numberLong || student.studentId || '');
        if (stId) {
          const { data: eData } = await supabase
            .from('enrollments')
            .select('data')
            .eq('student_id', stId);

          enrollments = (eData || []).map((r: any) => r.data);
        }

        // LGPD: Trilha de Auditoria Obrigatória (Art. 14 e 46)
        try {
          const operatorId = req.user?.id || req.user?.email || 'operator';
          await supabase.from('audit_log').insert({
            user_id: operatorId,
            action: 'SEARCH_STUDENT',
            resource_type: 'student',
            resource_id: stId,
            ip_address: String(clientIp).split(',')[0].trim(),
            details: {
              query_type: digits.length > 0 ? 'cpf_or_id' : 'name'
            }
          });
        } catch (auditErr) {
          console.error('[AUDIT_ERROR] Falha ao registrar log de auditoria LGPD na busca:', auditErr);
        }
      }
    } catch {
      // Non-revealing catch
    }
  }

  if (!student) {
    return res.status(404).json({
      found: false,
      message: 'Nenhum estudante localizado com o identificador informado.'
    });
  }

  return res.status(200).json({
    found: true,
    student,
    enrollments
  });
});

// GET /api/stats — Protected: requires real authentication
app.get('/api/stats', requireAuth, (_req: Request, res: Response) => {
  return res.status(200).json(stats);
});

// Static files in production
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('(.*)', (_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start Server
const serverInstance = app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🌐 Servidor Backup SGE rodando na porta ${PORT}`);
  console.log(`👉 Modo: ${USE_SUPABASE ? '☁️ Supabase' : '📁 Local'}`);
  console.log('====================================================');
});

serverInstance.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    const fallbackPort = PORT + 1;
    console.warn(`⚠️ Porta ${PORT} em uso. Tentando porta ${fallbackPort}...`);
    app.listen(fallbackPort, () => {
      console.log(`🌐 Servidor iniciado na porta fallback ${fallbackPort}`);
    });
  } else {
    console.error('Erro ao iniciar servidor.');
  }
});
