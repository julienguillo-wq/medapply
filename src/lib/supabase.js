// ============================================================
// Client Supabase pour l'application React MedApply
// ============================================================
// Initialisation lazy : le client est créé au premier appel
// de getSupabase(), pas au chargement du module ES.
// Cela garantit que window.SUPABASE_URL (posé par
// public/js/supabase-config.js) est disponible.
// ============================================================

import { createClient } from '@supabase/supabase-js';

let _supabase = null;

function getSupabase() {
  if (_supabase) return _supabase;

  const supabaseUrl = window.SUPABASE_URL;
  const supabaseAnonKey = window.SUPABASE_ANON_KEY;

  console.log('[Supabase] Création du client :', {
    url: supabaseUrl || '✗ MANQUANT',
    key: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}…` : '✗ MANQUANT',
  });

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      '⚠️ MedApply : Supabase non configuré.\n' +
      'window.SUPABASE_URL =', supabaseUrl, '\n' +
      'window.SUPABASE_ANON_KEY =', supabaseAnonKey, '\n' +
      'Vérifiez que public/js/supabase-config.js est chargé AVANT le bundle React.'
    );
  }

  _supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return _supabase;
}

// Export un proxy qui redirige tous les accès vers le client lazy
// Cela permet de garder `supabase.auth.getSession()` comme syntaxe
export const supabase = new Proxy({}, {
  get(_target, prop) {
    return getSupabase()[prop];
  },
});
