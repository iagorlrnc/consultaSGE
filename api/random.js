import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ['http://localhost:5173', 'http://localhost:3000'];
  if (process.env.ALLOWED_ORIGIN) allowed.push(process.env.ALLOWED_ORIGIN);
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();

  // SECURITY: Require verified authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autenticação obrigatória. Token ausente.' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Banco de dados não configurado.' });
  }

  const token = authHeader.slice(7).trim();
  let supabaseUser = null;
  try {
    supabaseUser = createClient(SUPABASE_URL, SUPABASE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
    }
  } catch {
    return res.status(401).json({ error: 'Falha na validação do token de segurança.' });
  }

  try {
    const { data: rows, error } = await supabaseUser
      .from('students')
      .select('data')
      .not('cpf', 'is', null)
      .limit(1);

    if (error || !rows || rows.length === 0) {
      return res.status(404).json({ error: 'Nenhum registro localizado.' });
    }

    const student = rows[0].data;
    const stId = String(student.studentId?.$numberLong || student.studentId || '');
    const { data: eData } = await supabaseUser.from('enrollments').select('data').eq('student_id', stId);

    return res.status(200).json({
      found: true,
      student,
      enrollments: (eData || []).map(r => r.data),
      sampleMeta: {
        name: student.name,
        city: student.address?.city
      }
    });
  } catch {
    return res.status(500).json({ error: 'Erro interno na consulta.' });
  }
}
