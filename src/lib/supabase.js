// ============================================================
// Client Supabase pour l'application React MedApply
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = window.SUPABASE_URL || '';
const supabaseAnonKey = window.SUPABASE_ANON_KEY || '';

console.log('[Supabase] createClient avec :', {
  url: supabaseUrl || '✗ MANQUANT',
  key: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}…` : '✗ MANQUANT',
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
