import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias. ' +
    'Configure o arquivo .env antes de iniciar a aplicação.'
  );
}

// SECURITY GUARD: Impede execução no navegador caso acidentalmente seja injetada a chave service_role
try {
  const payloadBase64 = SUPABASE_ANON_KEY.split('.')[1];
  if (payloadBase64) {
    const decoded = JSON.parse(atob(payloadBase64));
    if (decoded.role === 'service_role') {
      throw new Error(
        'ALERTA CRÍTICO DE SEGURANÇA: A chave VITE_SUPABASE_ANON_KEY contém privilégios de service_role. ' +
        'Substitua imediatamente pela chave pública anônima (anon key) no arquivo .env para evitar vazamento.'
      );
    }
  }
} catch (e: any) {
  if (e.message?.includes('ALERTA CRÍTICO DE SEGURANÇA')) throw e;
}

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
  }
});
