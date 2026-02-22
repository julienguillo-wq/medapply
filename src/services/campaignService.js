import { supabase } from '../lib/supabase';

const API_BASE = '/api';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Non authentifié');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
}

/**
 * Crée une campagne avec ses items via le backend.
 */
export async function createCampaign({ name, sendPerDay, sendHour, items, userId }) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/campaigns/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, sendPerDay, sendHour, items, userId }),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Erreur création campagne');
  return result;
}

/**
 * Récupère les campagnes de l'utilisateur.
 */
export async function getCampaigns(userId) {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return { data: data || [], error };
}

/**
 * Récupère une campagne avec ses items.
 */
export async function getCampaign(campaignId) {
  const { data: campaign, error: campError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (campError) return { data: null, error: campError };

  const { data: items, error: itemsError } = await supabase
    .from('campaign_items')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true });

  return {
    data: { ...campaign, items: items || [] },
    error: itemsError,
  };
}

/**
 * Envoie le prochain batch d'une campagne.
 */
export async function sendNextBatch(campaignId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/campaigns/${campaignId}/send-next`, {
    method: 'POST',
    headers,
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Erreur envoi batch');
  return result;
}

/**
 * Met à jour le statut d'une campagne (pause/reprendre).
 */
export async function updateCampaignStatus(campaignId, status) {
  const { data, error } = await supabase
    .from('campaigns')
    .update({ status })
    .eq('id', campaignId)
    .select()
    .single();

  return { data, error };
}

/**
 * Récupère le statut du cron scheduler.
 */
export async function getCronStatus() {
  const res = await fetch(`${API_BASE}/cron/status`);
  return res.json();
}
