// ============================================================
// Client Supabase pour l'application React MedApply
// ============================================================
// Utilise les variables définies dans public/js/supabase-config.js
// (chargé via <script> dans index.html avant le bundle React)
// ============================================================

import { createClient } from '@supabase/supabase-js';

// Récupérer la config depuis les variables globales (définies dans supabase-config.js)
const supabaseUrl = window.SUPABASE_URL;
const supabaseAnonKey = window.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('VOTRE_PROJET')) {
  console.error(
    '⚠️ MedApply : Supabase non configuré.\n' +
    'Modifiez le fichier public/js/supabase-config.js avec vos clés Supabase.'
  );
}

// Créer le client Supabase avec refresh automatique des tokens
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
