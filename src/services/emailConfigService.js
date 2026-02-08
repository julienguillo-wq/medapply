import { supabase } from '../lib/supabase';

const API_BASE = '/api';

/**
 * Récupère la config email SMTP de l'utilisateur connecté.
 */
export async function getEmailConfig(userId) {
  const { data, error } = await supabase
    .from('user_email_config')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found (normal si pas encore configuré)
    console.error('[emailConfigService] Fetch error:', error.message);
  }

  return { data: data || null, error: error?.code === 'PGRST116' ? null : error };
}

/**
 * Sauvegarde ou met à jour la config email SMTP.
 */
export async function saveEmailConfig(userId, emailAddress, smtpPassword, verified = false) {
  // Vérifier si une config existe déjà
  const { data: existing } = await supabase
    .from('user_email_config')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existing) {
    // UPDATE
    const { data, error } = await supabase
      .from('user_email_config')
      .update({
        email_address: emailAddress,
        smtp_password: smtpPassword,
        smtp_verified: verified,
      })
      .eq('user_id', userId)
      .select()
      .single();

    return { data, error };
  }

  // INSERT
  const { data, error } = await supabase
    .from('user_email_config')
    .insert({
      user_id: userId,
      email_address: emailAddress,
      smtp_password: smtpPassword,
      smtp_verified: verified,
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Teste la connexion SMTP via le backend.
 */
export async function testSmtpConnection(email, password) {
  try {
    const res = await fetch(`${API_BASE}/test-smtp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Envoie une candidature via le backend SMTP.
 */
export async function sendApplication({ to, subject, body, userName, userId }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { success: false, error: 'Non authentifié' };
  }

  try {
    const res = await fetch(`${API_BASE}/send-application`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ to, subject, body, userName, userId }),
    });

    const result = await res.json();
    if (!res.ok) {
      return { success: false, error: result.error || 'Erreur serveur' };
    }
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
