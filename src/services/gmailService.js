/**
 * Service frontend pour l'intégration Gmail (détection des réponses)
 */

import { supabase } from '../lib/supabase';

const API_BASE = '/api';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
}

/**
 * Récupère l'URL d'autorisation Google OAuth2 (scope gmail.readonly)
 */
export async function getGmailAuthUrl(userId) {
  try {
    const res = await fetch(`${API_BASE}/gmail/auth-url?userId=${userId}`);
    return await res.json();
  } catch (err) {
    return { url: null, error: err.message };
  }
}

/**
 * Vérifie si l'utilisateur a connecté son compte Gmail
 */
export async function getGmailStatus(userId) {
  const headers = await getAuthHeaders();
  if (!headers) return { connected: false };

  try {
    const res = await fetch(`${API_BASE}/gmail/status?userId=${userId}`, { headers });
    return await res.json();
  } catch {
    return { connected: false };
  }
}

/**
 * Déconnecte le compte Gmail (supprime les tokens)
 */
export async function disconnectGmail(userId) {
  const headers = await getAuthHeaders();
  if (!headers) return { success: false, error: 'Non authentifié' };

  try {
    const res = await fetch(`${API_BASE}/gmail/disconnect`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Déclenche la vérification des réponses Gmail pour l'utilisateur
 */
export async function checkReplies(userId) {
  const headers = await getAuthHeaders();
  if (!headers) return { checked: 0, newReplies: [] };

  try {
    const res = await fetch(`${API_BASE}/check-replies?userId=${userId}`, { headers });
    if (!res.ok) return { checked: 0, newReplies: [] };
    return await res.json();
  } catch {
    return { checked: 0, newReplies: [] };
  }
}
