import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

let cachedStats = null;

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

  const token = authHeader.slice(7).trim();
  if (supabase) {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
      }
    } catch {
      return res.status(401).json({ error: 'Falha na validação do token.' });
    }
  }

  if (cachedStats) {
    return res.status(200).json(cachedStats);
  }

  if (supabase) {
    try {
      // 1. Tenta RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_system_stats');
      if (!rpcError && rpcData && typeof rpcData.totalRecords === 'number') {
        cachedStats = rpcData;
        return res.status(200).json(rpcData);
      }

      // 2. Consulta direta
      const [stRes, enRes, cpfRes] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }),
        supabase.from('students').select('*', { count: 'exact', head: true }).not('clean_cpf', 'is', null).neq('clean_cpf', '')
      ]);

      if (!stRes.error && !enRes.error && stRes.count !== null && enRes.count !== null) {
        const liveStats = {
          totalRecords: stRes.count,
          totalEnrollments: enRes.count,
          uniqueSchools: 0,
          withCpf: cpfRes.count ?? 0,
          withoutCpf: Math.max(0, stRes.count - (cpfRes.count ?? 0))
        };
        cachedStats = liveStats;
        return res.status(200).json(liveStats);
      }
    } catch {}
  }

  return res.status(503).json({
    error: 'Falha de comunicação: o dado não foi encontrado no banco de dados.'
  });
}

