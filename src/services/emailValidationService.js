import { supabase } from '../lib/supabase';

const API_BASE = '/api';

// In-memory cache: Map<establishmentId, row>
let _cache = null;

/**
 * Load all email validation data from Supabase into memory cache.
 * Called once at app startup alongside establishments loading.
 */
export async function loadEmailValidationData() {
  const { data, error } = await supabase
    .from('establishment_emails')
    .select('*');

  if (error) {
    console.warn('[emailValidation] Failed to load:', error.message);
    _cache = new Map();
    return;
  }

  _cache = new Map();
  for (const row of data || []) {
    _cache.set(String(row.establishment_id), row);
  }
}

/**
 * Synchronous lookup from the in-memory cache.
 * Returns the row or null.
 */
export function getValidationData(establishmentId) {
  if (!_cache) return null;
  return _cache.get(String(establishmentId)) || null;
}

/**
 * Clear the in-memory cache (e.g. on logout).
 */
export function invalidateCache() {
  _cache = null;
}

/**
 * Update an establishment email via the backend.
 * Also updates the local cache immediately.
 */
export async function updateEstablishmentEmail({ establishmentId, email, userId }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { success: false, error: 'Non authentifié' };
  }

  try {
    const res = await fetch(`${API_BASE}/update-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ establishmentId, email, userId }),
    });

    const result = await res.json();
    if (!res.ok) {
      return { success: false, error: result.error || 'Erreur serveur' };
    }

    // Update local cache
    if (_cache && result.data) {
      _cache.set(String(establishmentId), result.data);
    }

    return { success: true, data: result.data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
