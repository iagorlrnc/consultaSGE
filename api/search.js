import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

export default async function handler(req, res) {
  // SECURITY: Restrict CORS
  const origin = req.headers.origin || '';
  const allowed = ['http://localhost:5173', 'http://localhost:3000'];
  if (process.env.ALLOWED_ORIGIN) allowed.push(process.env.ALLOWED_ORIGIN);
  
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // SECURITY: Strict token verification with Supabase Auth
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autenticação obrigatória. Token de sessão ausente.' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Banco de dados não configurado.' });
  }

  const token = authHeader.slice(7).trim();
  let authenticatedUser = null;
  let supabaseUser = null;

  try {
    supabaseUser = createClient(SUPABASE_URL, SUPABASE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
    }
    authenticatedUser = user;
  } catch {
    return res.status(401).json({ error: 'Falha na validação do token de segurança.' });
  }

  const rawQuery = String(req.query.cpf || req.query.q || '').trim();
  if (!rawQuery) {
    return res.status(400).json({ error: 'Parâmetro de pesquisa não informado.' });
  }

  // Sanitize input to prevent PostgREST Filter Injection
  const digits = rawQuery.replace(/\D/g, '');
  if (digits.length === 0 && rawQuery.length < 3) {
    return res.status(400).json({ error: 'Informe pelo menos 3 caracteres para busca por nome.' });
  }

  try {
    let student = null;

    // 1. Search by sanitized CPF
    if (digits.length > 0) {
      const paddedCpf = digits.padStart(11, '0').slice(0, 11);
      const formattedCpf = paddedCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      
      // All values are strictly formatted numbers - immune to PostgREST filter injection
      const { data: sData } = await supabaseUser
        .from('students')
        .select('data, student_id')
        .or(`clean_cpf.eq.${paddedCpf},clean_cpf.eq.${digits},cpf.eq.${formattedCpf}`)
        .limit(1)
        .maybeSingle();

      if (sData) student = sData.data;
    }

    // 2. Search by Student ID (strictly numeric)
    if (!student && digits.length > 0) {
      const { data: sData } = await supabaseUser
        .from('students')
        .select('data, student_id')
        .eq('student_id', digits)
        .limit(1)
        .maybeSingle();

      if (sData) student = sData.data;
    }

    // 3. Search by Name (strictly sanitized text without PostgREST control characters)
    if (!student) {
      const safeName = rawQuery.replace(/[^\w\sÀ-ÿ]/gi, '').trim();
      if (safeName.length >= 3) {
        const { data: sData } = await supabaseUser
          .from('students')
          .select('data, student_id')
          .ilike('name', `%${safeName.toUpperCase()}%`)
          .limit(1)
          .maybeSingle();

        if (sData) student = sData.data;
      }
    }

    if (!student) {
      return res.status(404).json({
        found: false,
        message: 'Nenhum estudante localizado com o identificador informado.'
      });
    }

    const stId = String(student.studentId?.$numberLong || student.studentId || '');
    const { data: eData } = await supabaseUser
      .from('enrollments')
      .select('data')
      .eq('student_id', stId);

    const enrollments = (eData || []).map(r => r.data);

    // SECURITY & LGPD: Trilha de Auditoria Obrigatória (Art. 14 e 46)
    try {
      const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
      await supabaseUser.from('audit_log').insert({
        user_id: authenticatedUser.id,
        action: 'SEARCH_STUDENT',
        resource_type: 'student',
        resource_id: stId,
        ip_address: String(clientIp).split(',')[0].trim(),
        details: {
          operator_email: authenticatedUser.email,
          query_type: digits.length > 0 ? 'cpf_or_id' : 'name'
        }
      });
    } catch {
      // Non-blocking for client response
    }

    return res.status(200).json({
      found: true,
      student,
      enrollments
    });
  } catch {
    return res.status(500).json({ error: 'Erro interno na consulta.' });
  }
}
