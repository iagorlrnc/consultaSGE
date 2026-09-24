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
    return res.status(200).json([]);
  }

  const token = authHeader.slice(7).trim();
  let supabaseUser = null;
  try {
    supabaseUser = createClient(SUPABASE_URL, SUPABASE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }
  } catch {
    return res.status(401).json({ error: 'Falha na validação do token.' });
  }

  try {
    const { data, error } = await supabaseUser
      .from('students')
      .select('name, city')
      .not('clean_cpf', 'is', null)
      .limit(6);

    if (!error && data && data.length > 0) {
      return res.status(200).json(
        data.map(item => ({
          name: item.name,
          city: item.city || 'TOCANTINS'
        }))
      );
    }
  } catch {}

  return res.status(200).json([]);
}
