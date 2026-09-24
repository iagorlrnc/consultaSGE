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

  let stats = {
    totalRecords: 239449,
    withCpf: 230917,
    withoutCpf: 8532,
    totalEnrollments: 361748,
    uniqueSchools: 495,
    genderCounts: {},
    raceCounts: {},
    disabilityCounts: {},
    topCities: []
  };

  try {
    const dsPath = path.join(process.cwd(), 'data_summary.json');
    if (fs.existsSync(dsPath)) {
      const ds = JSON.parse(fs.readFileSync(dsPath, 'utf8'));
      stats.totalRecords = ds.totalObjects || 239449;
      stats.withCpf = ds.validCpfCount || 0;
      stats.withoutCpf = ds.emptyCpfCount || 0;
      stats.genderCounts = ds.genderValues || {};
      stats.raceCounts = ds.raceColorValues || {};
      stats.disabilityCounts = ds.disabilityTypeValues || {};
      stats.topCities = ds.topCities || [];
    }

    const esPath = path.join(process.cwd(), 'enrollment_summary.json');
    if (fs.existsSync(esPath)) {
      const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));
      stats.totalEnrollments = es.totalRecords || 361748;
      stats.uniqueSchools = es.uniqueSchoolsCount || 0;
    }
  } catch {}

  cachedStats = stats;
  return res.status(200).json(stats);
}
