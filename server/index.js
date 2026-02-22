// ============================================================
// Backend Express.js pour MedApply
// Gère l'envoi d'emails via SMTP Gmail (nodemailer)
// + Envoi automatique quotidien des campagnes via node-cron
// ============================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '25mb' }));

// Supabase admin client (utilise la service_role key pour accéder aux données)
const supabaseUrl = process.env.SUPABASE_URL || 'https://ywrkxyfzapujbdvlexmx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabaseClient(accessToken) {
  // Client avec le token de l'utilisateur pour respecter les RLS
  return createClient(supabaseUrl, supabaseServiceKey || process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

// ============================================================
// Gmail OAuth2 helpers
// ============================================================

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/gmail/callback'
  );
}

/**
 * Charge les tokens Gmail d'un utilisateur, les rafraîchit si expirés,
 * et retourne un client Gmail prêt à l'emploi.
 */
async function getGmailClient(userId) {
  const admin = getSupabaseAdmin();
  const { data: tokens, error } = await admin
    .from('gmail_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !tokens) return null;

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: new Date(tokens.token_expiry).getTime(),
  });

  // Auto-refresh si expiré
  if (new Date(tokens.token_expiry) <= new Date()) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      await admin
        .from('gmail_tokens')
        .update({
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token || tokens.refresh_token,
          token_expiry: new Date(credentials.expiry_date).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    } catch (refreshErr) {
      console.error(`[gmail] Token refresh failed for user ${userId}:`, refreshErr.message);
      return null;
    }
  }

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Recherche le threadId Gmail d'un message récemment envoyé via SMTP.
 * Attend 3s pour laisser Gmail indexer le message.
 */
async function lookupGmailThreadId(userId, recipientEmail, subject) {
  const gmail = await getGmailClient(userId);
  if (!gmail) return null;

  // Attendre 3s pour laisser Gmail indexer
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    const query = `to:${recipientEmail} subject:"${subject}" in:sent`;
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 1,
    });

    if (!res.data.messages || res.data.messages.length === 0) return null;

    const msg = res.data.messages[0];
    return { threadId: msg.threadId, messageId: msg.id };
  } catch (err) {
    console.error('[gmail] lookupGmailThreadId error:', err.message);
    return null;
  }
}

// ============================================================
// Helpers partagés
// ============================================================

/**
 * Récupère le profil, la config SMTP, les documents et la signature
 * d'un utilisateur. Réutilisé par send-application et campaigns.
 */
async function getUserSendContext(supabase, userId) {
  // Config SMTP
  const { data: emailConfig, error: configError } = await supabase
    .from('user_email_config')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (configError || !emailConfig) {
    throw new Error('Configuration email non trouvée. Configurez votre email dans Profil.');
  }

  // Documents (pièces jointes)
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId);

  const attachments = [];
  if (documents && documents.length > 0) {
    const admin = getSupabaseAdmin();
    for (const doc of documents) {
      try {
        const { data: fileData, error: dlError } = await admin.storage
          .from('documents')
          .download(doc.file_path);

        if (!dlError && fileData) {
          const buffer = Buffer.from(await fileData.arrayBuffer());
          attachments.push({
            filename: doc.file_name || doc.name,
            content: buffer,
            contentType: doc.mime_type || 'application/octet-stream',
          });
        }
      } catch (dlErr) {
        console.warn(`[getUserSendContext] Impossible de télécharger ${doc.file_name}:`, dlErr.message);
      }
    }
  }

  // Profil (pas de signature serveur — les infos contact sont dans le corps du mail)
  let userProfile = null;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, specialty, phone, email')
      .eq('id', userId)
      .single();

    userProfile = profile;
  } catch (sigErr) {
    console.warn('[getUserSendContext] Impossible de charger le profil:', sigErr.message);
  }

  const userName = userProfile
    ? [userProfile.first_name, userProfile.last_name].filter(Boolean).join(' ')
    : emailConfig.email_address;

  return { emailConfig, attachments, userProfile, userName };
}

function escapeHtml(text) {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Construit le HTML du mail : paragraphes + tableau contact.
 * Supprime le bloc contact textuel (après "Médecin assistante")
 * et le remplace par un <table> que Gmail ne collapse pas.
 */
function buildMailHtml(bodyText, userName, userProfile) {
  // Séparer le bloc contact du corps de la lettre
  let letterBody = bodyText;
  const lastSep = bodyText.lastIndexOf('\n\n');
  if (lastSep !== -1) {
    const tail = bodyText.substring(lastSep + 2);
    if (/Médecin assistante|Tél\s*:/i.test(tail)) {
      letterBody = bodyText.substring(0, lastSep);
    }
  }

  const escaped = escapeHtml(letterBody);
  const paragraphs = escaped.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');

  const phone = userProfile?.phone;
  const email = userProfile?.email;

  const contactTable = `<table cellpadding="0" cellspacing="0" style="margin-top:20px;border-top:1px solid #cccccc;padding-top:12px;">
  <tr><td style="font-size:14px;font-weight:bold;">${escapeHtml(userName)}</td></tr>
  <tr><td style="font-size:13px;color:#555;">Médecin assistante</td></tr>
  ${phone ? `<tr><td style="font-size:13px;color:#555;">Tél : ${escapeHtml(phone)}</td></tr>` : ''}
  ${email ? `<tr><td style="font-size:13px;"><a href="mailto:${escapeHtml(email)}" style="color:#1a73e8;">${escapeHtml(email)}</a></td></tr>` : ''}
</table>`;

  return `<div>${paragraphs}${contactTable}</div>`;
}

/**
 * Génère la lettre de motivation (template fixe, pas d'appel API).
 */
function generateMotivationLetter(directorName, specialty, userProfile) {
  const firstName = userProfile?.first_name || 'Giulia';
  const lastName = userProfile?.last_name || 'Scattu';

  return `Cher Docteur ${directorName || 'Madame, Monsieur'},

Je m\u2019appelle ${firstName} ${lastName} et je souhaite déposer ma candidature pour un poste de médecin assistante au sein de votre service. J\u2019ai obtenu mon diplôme en médecine et chirurgie à l\u2019Université Vest Vasile Goldis d\u2019Arad (Roumanie) le 14 septembre 2024. Dès la fin de ma première année d\u2019études, j\u2019ai effectué plusieurs stages pratiques dans des hôpitaux en Italie, en Roumanie et en Suisse. Plus récemment, j\u2019ai eu l\u2019opportunité d\u2019effectuer un stage à l\u2019UGA de La Chaux-de-Fonds, ainsi que ma première année de formation en rotation entre le service de réadaptation musculo squelettique et neurologique de Val-de-Ruz et l\u2019UGA de La Chaux-de-Fonds, et à partir de Mai 2026 je serai dans le service des urgences de Neuchâtel. À partir d\u2019octobre 2024, après l\u2019obtention de mon diplôme, je participerai également à un stage organisé par le Rotary en France, d\u2019abord en oncologie, puis en cardiologie à Beauvais. Je souhaiterais vivement intégrer votre service en qualité de médecin assistante à partir du 1er Mai 2027. En espérant que ma candidature retiendra votre attention, je reste à votre disposition pour toute information complémentaire et je vous prie d\u2019agréer, Madame, Monsieur, l\u2019expression de mes salutations distinguées.

Mes meilleures salutations,
${firstName} ${lastName}`;
}

// ============================================================
// Logique d'envoi de batch — fonction partagée
// Utilisée par l'endpoint POST /api/campaigns/:id/send-next
// ET par le cron job automatique
// ============================================================

/**
 * Envoie le prochain batch d'une campagne.
 * @param {string} campaignId - ID de la campagne
 * @param {object} [options] - { source: 'cron' | 'manual' }
 * @returns {{ sent: number, failed: number, results: Array, completed: boolean }}
 */
async function sendCampaignBatch(campaignId, options = {}) {
  const source = options.source || 'manual';
  const admin = getSupabaseAdmin();

  // Récupérer la campagne
  const { data: campaign, error: campError } = await admin
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (campError || !campaign) {
    throw new Error('Campagne non trouvée');
  }

  if (campaign.status === 'paused') {
    throw new Error('Campagne en pause');
  }

  // Récupérer le contexte d'envoi (utilise admin pour le cron, car pas de token utilisateur)
  const { emailConfig, attachments, userName, userProfile } = await getUserSendContext(admin, campaign.user_id);

  // Récupérer les prochains items 'ready'
  const { data: readyItems, error: itemsError } = await admin
    .from('campaign_items')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('item_status', 'ready')
    .order('created_at', { ascending: true })
    .limit(campaign.send_per_day);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  if (!readyItems || readyItems.length === 0) {
    // Plus rien à envoyer → marquer comme terminée
    await admin
      .from('campaigns')
      .update({ status: 'completed' })
      .eq('id', campaignId);

    console.log(`[${source}] Campagne ${campaignId} terminée — plus d'items à envoyer`);
    return { sent: 0, failed: 0, results: [], completed: true };
  }

  // Mettre à jour le statut de la campagne
  if (campaign.status === 'draft') {
    await admin
      .from('campaigns')
      .update({ status: 'in_progress' })
      .eq('id', campaignId);
  }

  // Créer le transporteur SMTP
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: emailConfig.email_address,
      pass: emailConfig.smtp_password,
    },
  });

  // Récupérer la spécialité de l'utilisateur pour le sujet
  const userSpecialty = userProfile?.specialty || '';

  let sentCount = 0;
  let failedCount = 0;
  const results = [];

  for (const item of readyItems) {
    if (!item.director_email) {
      // Pas d'email → marquer en échec
      await admin
        .from('campaign_items')
        .update({
          item_status: 'failed',
          error_message: 'Pas d\'email disponible',
        })
        .eq('id', item.id);
      failedCount++;
      results.push({ id: item.id, status: 'failed', error: 'Pas d\'email' });
      console.log(`[${source}] ${campaign.name} — ${item.establishment_name}: ECHEC (pas d'email)`);
      continue;
    }

    try {
      const subject = `Candidature spontanée - ${item.specialty || userSpecialty || 'Médecine'} - ${userName}`;

      const letterHtml = buildMailHtml(item.motivation_letter, userName, userProfile);

      const mailOptions = {
        from: `${userName} <${emailConfig.email_address}>`,
        to: item.director_email,
        replyTo: emailConfig.email_address,
        subject,
        html: letterHtml,
        attachments,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`[${source}] ${campaign.name} — Email envoyé à ${item.director_email}: ${info.messageId}`);

      await admin
        .from('campaign_items')
        .update({
          item_status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      // Marquer l'email comme validé
      try {
        await admin
          .from('establishment_emails')
          .upsert({
            establishment_id: item.establishment_id,
            email_status: 'validated',
            email_validated_at: new Date().toISOString(),
            email_validated_by: campaign.user_id,
          }, { onConflict: 'establishment_id' });
      } catch { /* ignore */ }

      // Créer la candidature correspondante (doublon = même user + même email)
      try {
        const { data: existingCand } = await admin
          .from('candidatures')
          .select('id')
          .eq('user_id', campaign.user_id)
          .eq('director_email', item.director_email)
          .eq('establishment_id', item.establishment_id)
          .maybeSingle();

        if (!existingCand) {
          const now = new Date().toISOString();
          // Lookup Gmail threadId si possible
          let gmailThreadId = null;
          let gmailMessageId = null;
          try {
            const gmailResult = await lookupGmailThreadId(campaign.user_id, item.director_email, subject);
            if (gmailResult) {
              gmailThreadId = gmailResult.threadId;
              gmailMessageId = gmailResult.messageId;
            }
          } catch { /* ignore */ }

          await admin
            .from('candidatures')
            .insert({
              user_id: campaign.user_id,
              establishment_id: item.establishment_id,
              establishment_name: item.establishment_name,
              establishment_city: item.establishment_city || '',
              establishment_canton: item.establishment_canton || '',
              director_name: item.director_name || '',
              director_email: item.director_email,
              specialty: item.specialty || '',
              status: 'sent',
              motivation_letter: item.motivation_letter || '',
              sent_at: now,
              gmail_thread_id: gmailThreadId,
              gmail_message_id: gmailMessageId,
            });
          console.log(`[${source}] Candidature créée pour ${item.establishment_name}`);
        }
      } catch (candErr) {
        console.warn(`[${source}] Candidature creation failed for ${item.establishment_name}:`, candErr.message);
      }

      sentCount++;
      results.push({ id: item.id, status: 'sent' });
    } catch (sendErr) {
      console.error(`[${source}] ${campaign.name} — Erreur envoi ${item.director_email}:`, sendErr.message);

      await admin
        .from('campaign_items')
        .update({
          item_status: 'failed',
          error_message: sendErr.message,
        })
        .eq('id', item.id);

      // Détecter les bounces
      const bouncePattern = /\b(550|551|553|mailbox not found|user unknown|no such user|address rejected)\b/i;
      if (bouncePattern.test(sendErr.message)) {
        try {
          const { data: existing } = await admin
            .from('establishment_emails')
            .select('bounce_count')
            .eq('establishment_id', item.establishment_id)
            .single();

          await admin
            .from('establishment_emails')
            .upsert({
              establishment_id: item.establishment_id,
              email_status: 'invalid',
              bounce_count: (existing?.bounce_count || 0) + 1,
            }, { onConflict: 'establishment_id' });
        } catch { /* ignore */ }
      }

      failedCount++;
      results.push({ id: item.id, status: 'failed', error: sendErr.message });
    }
  }

  // Mettre à jour les compteurs de la campagne
  await admin
    .from('campaigns')
    .update({
      sent_count: campaign.sent_count + sentCount,
      failed_count: campaign.failed_count + failedCount,
    })
    .eq('id', campaignId);

  // Vérifier si tous les items sont traités
  const { data: remainingItems } = await admin
    .from('campaign_items')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('item_status', 'ready');

  const completed = !remainingItems || remainingItems.length === 0;
  if (completed) {
    await admin
      .from('campaigns')
      .update({ status: 'completed' })
      .eq('id', campaignId);
    console.log(`[${source}] Campagne "${campaign.name}" terminée — tous les emails envoyés`);
  }

  return { sent: sentCount, failed: failedCount, results, completed };
}

// ============================================================
// Cron job — Envoi automatique toutes les 30 min (7h-18h)
// Vérifie l'heure configurée de chaque campagne (send_hour)
// ============================================================

const cronLog = []; // Historique des exécutions du cron (en mémoire)

cron.schedule('0,30 7-18 * * *', async () => {
  const timestamp = new Date().toISOString();

  // Heure actuelle en Europe/Zurich (HH:MM arrondie à la demi-heure)
  const nowZurich = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' });
  const [, timePart] = nowZurich.split(' ');
  const [hh, mm] = timePart.split(':');
  const currentSlot = `${hh}:${Number(mm) < 30 ? '00' : '30'}`;

  const admin = getSupabaseAdmin();

  try {
    // Trouver les campagnes actives dont l'heure d'envoi correspond au créneau actuel
    const { data: campaigns, error } = await admin
      .from('campaigns')
      .select('id, name, status, send_per_day, send_hour')
      .in('status', ['in_progress', 'draft']);

    if (error) {
      console.error('[cron] Erreur récupération campagnes:', error.message);
      cronLog.push({ timestamp, error: error.message, campaigns: 0, totalSent: 0, totalFailed: 0 });
      return;
    }

    if (!campaigns || campaigns.length === 0) return;

    // Filtrer par heure configurée (défaut 08:00)
    const matching = campaigns.filter(c => (c.send_hour || '08:00') === currentSlot);

    if (matching.length === 0) return;

    console.log(`\n[cron] ========== ${currentSlot} — ${matching.length} campagne(s) à envoyer ==========`);

    let totalSent = 0;
    let totalFailed = 0;
    const campaignResults = [];

    for (const campaign of matching) {
      // Vérifier qu'il reste des items 'ready'
      const { count } = await admin
        .from('campaign_items')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .eq('item_status', 'ready');

      if (!count || count === 0) {
        console.log(`[cron] Campagne "${campaign.name}" — aucun item restant, marquée comme terminée`);
        await admin.from('campaigns').update({ status: 'completed' }).eq('id', campaign.id);
        campaignResults.push({ id: campaign.id, name: campaign.name, sent: 0, failed: 0, skipped: true });
        continue;
      }

      console.log(`[cron] Campagne "${campaign.name}" (${campaign.send_hour || '08:00'}) — ${count} items restants, envoi de max ${campaign.send_per_day}...`);

      try {
        const result = await sendCampaignBatch(campaign.id, { source: 'cron' });
        totalSent += result.sent;
        totalFailed += result.failed;
        campaignResults.push({
          id: campaign.id,
          name: campaign.name,
          sent: result.sent,
          failed: result.failed,
          completed: result.completed,
        });
      } catch (batchErr) {
        console.error(`[cron] Erreur campagne "${campaign.name}":`, batchErr.message);
        campaignResults.push({
          id: campaign.id,
          name: campaign.name,
          sent: 0,
          failed: 0,
          error: batchErr.message,
        });
      }
    }

    const logEntry = { timestamp, slot: currentSlot, campaigns: matching.length, totalSent, totalFailed, details: campaignResults };
    cronLog.push(logEntry);
    if (cronLog.length > 100) cronLog.shift();

    console.log(`[cron] ========== Terminé: ${totalSent} envoyé(s), ${totalFailed} échoué(s) ==========\n`);
  } catch (err) {
    console.error('[cron] Erreur générale:', err.message);
    cronLog.push({ timestamp, error: err.message, campaigns: 0, totalSent: 0, totalFailed: 0 });
  }
}, {
  timezone: 'Europe/Zurich',
});

console.log('[cron] Scheduler actif — vérification toutes les 30 min (7h-18h, Europe/Zurich)');

// ============================================================
// GET /api/cron/status
// Retourne le statut du scheduler et l'historique des exécutions
// ============================================================
app.get('/api/cron/status', (req, res) => {
  res.json({
    active: true,
    schedule: '0,30 7-18 * * * (toutes les 30 min, 7h-18h)',
    timezone: 'Europe/Zurich',
    recentRuns: cronLog.slice(-10).reverse(),
  });
});

// ============================================================
// POST /api/cron/trigger
// Déclenche manuellement le cron job (pour test / debug)
// ============================================================
app.post('/api/cron/trigger', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[cron/trigger] Déclenchement manuel à ${timestamp}`);

  const admin = getSupabaseAdmin();

  try {
    const { data: campaigns, error } = await admin
      .from('campaigns')
      .select('id, name, status, send_per_day')
      .in('status', ['in_progress', 'draft']);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!campaigns || campaigns.length === 0) {
      return res.json({ success: true, message: 'Aucune campagne active', totalSent: 0, totalFailed: 0 });
    }

    let totalSent = 0;
    let totalFailed = 0;
    const campaignResults = [];

    for (const campaign of campaigns) {
      try {
        const result = await sendCampaignBatch(campaign.id, { source: 'cron/trigger' });
        totalSent += result.sent;
        totalFailed += result.failed;
        campaignResults.push({
          id: campaign.id,
          name: campaign.name,
          sent: result.sent,
          failed: result.failed,
          completed: result.completed,
        });
      } catch (batchErr) {
        campaignResults.push({
          id: campaign.id,
          name: campaign.name,
          error: batchErr.message,
        });
      }
    }

    cronLog.push({ timestamp, campaigns: campaigns.length, totalSent, totalFailed, details: campaignResults, manual: true });
    if (cronLog.length > 100) cronLog.shift();

    return res.json({ success: true, totalSent, totalFailed, campaigns: campaignResults });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/test-smtp
// Teste la connexion SMTP Gmail
// ============================================================
app.post('/api/test-smtp', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: email, pass: password },
      connectionTimeout: 10000,
    });

    await transporter.verify();
    return res.json({ success: true, message: 'Connexion SMTP réussie' });
  } catch (err) {
    console.error('[test-smtp] Erreur:', err.message);
    return res.status(400).json({
      success: false,
      error: err.message.includes('Invalid login')
        ? 'Identifiants incorrects. Utilisez un mot de passe d\'application Google (16 caractères).'
        : `Erreur de connexion SMTP : ${err.message}`,
    });
  }
});

// ============================================================
// POST /api/update-email
// Met à jour l'email d'un établissement (validation manuelle)
// ============================================================
app.post('/api/update-email', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token d\'authentification requis' });
  }

  const { establishmentId, email, userId } = req.body;
  if (!establishmentId || !userId) {
    return res.status(400).json({ error: 'establishmentId et userId requis' });
  }

  try {
    const admin = getSupabaseAdmin();
    const upsertData = {
      establishment_id: String(establishmentId),
      email_manual: email || null,
      email_status: email ? 'manually_verified' : 'suggested',
      email_validated_by: userId,
      email_validated_at: email ? new Date().toISOString() : null,
    };

    const { data, error } = await admin
      .from('establishment_emails')
      .upsert(upsertData, { onConflict: 'establishment_id' })
      .select()
      .single();

    if (error) {
      console.error('[update-email] Erreur:', error.message);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error('[update-email] Erreur:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/send-application
// Envoie un email de candidature via SMTP Gmail
// ============================================================
app.post('/api/send-application', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token d\'authentification requis' });
  }

  const accessToken = authHeader.split(' ')[1];

  const {
    to,
    subject,
    body,
    userName,
    userId,
    establishmentId,
  } = req.body;

  if (!to || !subject || !body || !userId) {
    return res.status(400).json({ error: 'Champs requis manquants (to, subject, body, userId)' });
  }

  try {
    const supabase = getSupabaseClient(accessToken);
    const { emailConfig, attachments, userProfile } = await getUserSendContext(supabase, userId);

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: emailConfig.email_address,
        pass: emailConfig.smtp_password,
      },
    });

    const htmlBody = buildMailHtml(body, userName, userProfile);

    const mailOptions = {
      from: `${userName || emailConfig.email_address} <${emailConfig.email_address}>`,
      to,
      replyTo: emailConfig.email_address,
      subject,
      html: htmlBody,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[send-application] Email envoyé:', info.messageId);

    // Mark email as validated in establishment_emails
    if (establishmentId) {
      try {
        const admin = getSupabaseAdmin();
        await admin
          .from('establishment_emails')
          .upsert({
            establishment_id: String(establishmentId),
            email_status: 'validated',
            email_validated_at: new Date().toISOString(),
            email_validated_by: userId,
          }, { onConflict: 'establishment_id' });
      } catch (valErr) {
        console.warn('[send-application] Validation tracking failed:', valErr.message);
      }
    }

    // Lookup Gmail threadId (async, non-blocking for the response)
    let gmailThreadId = null;
    let gmailMessageId = null;
    try {
      const gmailResult = await lookupGmailThreadId(userId, to, subject);
      if (gmailResult) {
        gmailThreadId = gmailResult.threadId;
        gmailMessageId = gmailResult.messageId;
        console.log(`[send-application] Gmail threadId: ${gmailThreadId}`);
      }
    } catch (gmailErr) {
      console.warn('[send-application] Gmail lookup failed:', gmailErr.message);
    }

    return res.json({
      success: true,
      messageId: info.messageId,
      attachmentsCount: attachments.length,
      gmailThreadId,
      gmailMessageId,
    });
  } catch (err) {
    console.error('[send-application] Erreur envoi:', err.message);

    // Detect bounce errors and mark as invalid
    let bounce = false;
    if (establishmentId) {
      const bouncePattern = /\b(550|551|553|mailbox not found|user unknown|no such user|address rejected)\b/i;
      if (bouncePattern.test(err.message)) {
        bounce = true;
        try {
          const admin = getSupabaseAdmin();
          const { data: existing } = await admin
            .from('establishment_emails')
            .select('bounce_count')
            .eq('establishment_id', String(establishmentId))
            .single();

          await admin
            .from('establishment_emails')
            .upsert({
              establishment_id: String(establishmentId),
              email_status: 'invalid',
              bounce_count: (existing?.bounce_count || 0) + 1,
            }, { onConflict: 'establishment_id' });
        } catch (valErr) {
          console.warn('[send-application] Bounce tracking failed:', valErr.message);
        }
      }
    }

    return res.status(500).json({
      error: `Erreur lors de l'envoi : ${err.message}`,
      bounce,
    });
  }
});

// ============================================================
// POST /api/campaigns/create
// Crée une campagne + génère les lettres de motivation
// ============================================================
app.post('/api/campaigns/create', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token d\'authentification requis' });
  }

  const accessToken = authHeader.split(' ')[1];
  const { name, sendPerDay, sendHour, items, userId } = req.body;

  if (!name || !items || !userId) {
    return res.status(400).json({ error: 'Champs requis manquants (name, items, userId)' });
  }

  try {
    const admin = getSupabaseAdmin();
    const supabase = getSupabaseClient(accessToken);

    // Récupérer le profil pour la génération des lettres
    let userProfile = null;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, specialty, phone, email')
        .eq('id', userId)
        .single();
      userProfile = profile;
    } catch {
      // Profile non trouvé, on utilise les valeurs par défaut
    }

    // 1. Créer la campagne
    const { data: campaign, error: campError } = await admin
      .from('campaigns')
      .insert({
        user_id: userId,
        name,
        status: 'draft',
        total_count: items.length,
        sent_count: 0,
        failed_count: 0,
        send_per_day: sendPerDay || 5,
        send_hour: sendHour || '08:00',
      })
      .select()
      .single();

    if (campError) {
      console.error('[campaigns/create] Erreur création:', campError.message);
      return res.status(500).json({ error: campError.message });
    }

    // 2. Créer les items avec les lettres générées
    const campaignItems = items.map(item => ({
      campaign_id: campaign.id,
      establishment_id: item.establishmentId,
      establishment_name: item.establishmentName,
      establishment_city: item.establishmentCity || '',
      establishment_canton: item.establishmentCanton || '',
      director_name: item.directorName || null,
      director_email: item.directorEmail || null,
      specialty: item.specialty || null,
      motivation_letter: generateMotivationLetter(
        item.directorName,
        item.specialty,
        userProfile
      ),
      item_status: 'ready',
    }));

    const { error: itemsError } = await admin
      .from('campaign_items')
      .insert(campaignItems);

    if (itemsError) {
      console.error('[campaigns/create] Erreur items:', itemsError.message);
      // Nettoyage : supprimer la campagne
      await admin.from('campaigns').delete().eq('id', campaign.id);
      return res.status(500).json({ error: itemsError.message });
    }

    console.log(`[campaigns/create] Campagne "${name}" créée: ${items.length} items`);
    return res.json({ success: true, campaign });
  } catch (err) {
    console.error('[campaigns/create] Erreur:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/campaigns/:id/send-next
// Envoie le prochain batch (send_per_day items 'ready')
// ============================================================
app.post('/api/campaigns/:id/send-next', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token d\'authentification requis' });
  }

  const campaignId = req.params.id;

  try {
    const result = await sendCampaignBatch(campaignId, { source: 'manual' });

    if (result.sent === 0 && result.completed) {
      return res.json({ success: true, sent: 0, message: 'Tous les envois ont été effectués' });
    }

    return res.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      results: result.results,
    });
  } catch (err) {
    console.error('[campaigns/send-next] Erreur:', err.message);

    if (err.message === 'Campagne non trouvée') {
      return res.status(404).json({ error: err.message });
    }
    if (err.message === 'Campagne en pause') {
      return res.status(400).json({ error: err.message });
    }

    return res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/campaigns/:id
// Retourne la campagne avec ses items
// ============================================================
app.get('/api/campaigns/:id', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token d\'authentification requis' });
  }

  const accessToken = authHeader.split(' ')[1];
  const campaignId = req.params.id;

  try {
    const supabase = getSupabaseClient(accessToken);

    const { data: campaign, error: campError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campError) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    const { data: items } = await supabase
      .from('campaign_items')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true });

    return res.json({ campaign: { ...campaign, items: items || [] } });
  } catch (err) {
    console.error('[campaigns/:id] Erreur:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/sync-campaigns
// Rattrapage : crée les candidatures manquantes pour les
// campaign_items déjà envoyés
// ============================================================
app.post('/api/sync-campaigns', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token d\'authentification requis' });
  }

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId requis' });

  const admin = getSupabaseAdmin();

  try {
    // Récupérer tous les campaign_items envoyés pour cet utilisateur
    const { data: campaigns } = await admin
      .from('campaigns')
      .select('id')
      .eq('user_id', userId);

    if (!campaigns || campaigns.length === 0) {
      return res.json({ success: true, created: 0, skipped: 0 });
    }

    const campaignIds = campaigns.map(c => c.id);

    const { data: sentItems } = await admin
      .from('campaign_items')
      .select('*')
      .in('campaign_id', campaignIds)
      .eq('item_status', 'sent');

    if (!sentItems || sentItems.length === 0) {
      return res.json({ success: true, created: 0, skipped: 0 });
    }

    // Récupérer les candidatures existantes pour cet utilisateur
    const { data: existingCands } = await admin
      .from('candidatures')
      .select('establishment_id, director_email')
      .eq('user_id', userId);

    const existingSet = new Set(
      (existingCands || []).map(c => `${c.establishment_id}|${c.director_email}`)
    );

    let created = 0;
    let skipped = 0;

    for (const item of sentItems) {
      const key = `${item.establishment_id}|${item.director_email}`;
      if (existingSet.has(key) || !item.director_email) {
        skipped++;
        continue;
      }

      try {
        await admin
          .from('candidatures')
          .insert({
            user_id: userId,
            establishment_id: item.establishment_id,
            establishment_name: item.establishment_name,
            establishment_city: item.establishment_city || '',
            establishment_canton: item.establishment_canton || '',
            director_name: item.director_name || '',
            director_email: item.director_email,
            specialty: item.specialty || '',
            status: 'sent',
            motivation_letter: item.motivation_letter || '',
            sent_at: item.sent_at || item.created_at,
          });

        existingSet.add(key);
        created++;
      } catch (insertErr) {
        console.warn(`[sync-campaigns] Insert failed for ${item.establishment_name}:`, insertErr.message);
        skipped++;
      }
    }

    console.log(`[sync-campaigns] User ${userId}: ${created} created, ${skipped} skipped`);
    return res.json({ success: true, created, skipped });
  } catch (err) {
    console.error('[sync-campaigns] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Backfill Gmail thread IDs
// ============================================================

/**
 * Pour un utilisateur, cherche les threadIds Gmail de toutes les
 * candidatures envoyées qui n'ont pas encore de gmail_thread_id.
 */
async function backfillThreadIds(userId) {
  const gmail = await getGmailClient(userId);
  if (!gmail) return { updated: 0, checked: 0 };

  const admin = getSupabaseAdmin();
  const { data: candidatures } = await admin
    .from('candidatures')
    .select('id, director_email, sent_at')
    .eq('user_id', userId)
    .not('director_email', 'eq', '')
    .not('sent_at', 'is', null)
    .is('gmail_thread_id', null);

  if (!candidatures || candidatures.length === 0) {
    return { updated: 0, checked: 0 };
  }

  let updated = 0;

  for (const cand of candidatures) {
    try {
      const res = await gmail.users.messages.list({
        userId: 'me',
        q: `to:${cand.director_email} in:sent`,
        maxResults: 1,
      });

      if (!res.data.messages || res.data.messages.length === 0) continue;

      const msg = res.data.messages[0];
      await admin
        .from('candidatures')
        .update({
          gmail_thread_id: msg.threadId,
          gmail_message_id: msg.id,
        })
        .eq('id', cand.id);

      updated++;
    } catch (err) {
      console.warn(`[backfill] Error for candidature ${cand.id}:`, err.message);
    }
  }

  console.log(`[backfill] User ${userId}: ${updated}/${candidatures.length} thread IDs found`);
  return { updated, checked: candidatures.length };
}

// POST /api/backfill-thread-ids
app.post('/api/backfill-thread-ids', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token d\'authentification requis' });
  }

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId requis' });

  try {
    const result = await backfillThreadIds(userId);
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('[backfill-thread-ids] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Gmail OAuth2 endpoints
// ============================================================

// GET /api/gmail/auth-url — Génère l'URL d'autorisation Google
app.get('/api/gmail/auth-url', (req, res) => {
  const oauth2Client = createOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    state: req.query.userId || '',
  });
  return res.json({ url });
});

// GET /api/gmail/callback — Reçoit le code Google, échange contre tokens
app.get('/api/gmail/callback', async (req, res) => {
  const { code, state: userId } = req.query;

  if (!code || !userId) {
    return res.status(400).send('Paramètres manquants');
  }

  try {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Récupérer l'email Gmail
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const gmailEmail = profile.data.emailAddress;

    // Stocker les tokens
    const admin = getSupabaseAdmin();
    await admin
      .from('gmail_tokens')
      .upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: new Date(tokens.expiry_date).toISOString(),
        gmail_email: gmailEmail,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    console.log(`[gmail] Tokens saved for user ${userId} (${gmailEmail})`);

    // Backfill thread IDs pour les candidatures existantes (async, non-bloquant)
    backfillThreadIds(userId).catch(err =>
      console.warn('[gmail/callback] Backfill error:', err.message)
    );

    // Rediriger vers le frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/profil?gmail=connected`);
  } catch (err) {
    console.error('[gmail/callback] Error:', err.message);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/profil?gmail=error`);
  }
});

// GET /api/gmail/status — Vérifie si l'utilisateur a des tokens Gmail
app.get('/api/gmail/status', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token d\'authentification requis' });
  }

  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: 'userId requis' });

  try {
    const admin = getSupabaseAdmin();
    const { data: tokens } = await admin
      .from('gmail_tokens')
      .select('gmail_email, token_expiry')
      .eq('user_id', userId)
      .single();

    if (!tokens) {
      return res.json({ connected: false });
    }

    return res.json({ connected: true, email: tokens.gmail_email });
  } catch {
    return res.json({ connected: false });
  }
});

// POST /api/gmail/disconnect — Supprime les tokens Gmail
app.post('/api/gmail/disconnect', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token d\'authentification requis' });
  }

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId requis' });

  try {
    const admin = getSupabaseAdmin();
    await admin.from('gmail_tokens').delete().eq('user_id', userId);
    console.log(`[gmail] Tokens deleted for user ${userId}`);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/check-replies — Vérifie les réponses Gmail
// ============================================================
app.get('/api/check-replies', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token d\'authentification requis' });
  }

  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: 'userId requis' });

  try {
    const result = await checkRepliesForUser(userId);
    return res.json(result);
  } catch (err) {
    console.error('[check-replies] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Vérifie les réponses Gmail pour un utilisateur donné.
 * Cherche les threads avec plus d'un message.
 */
async function checkRepliesForUser(userId) {
  const gmail = await getGmailClient(userId);
  if (!gmail) return { checked: 0, newReplies: [] };

  const admin = getSupabaseAdmin();
  const { data: candidatures } = await admin
    .from('candidatures')
    .select('id, gmail_thread_id, gmail_message_id, status')
    .eq('user_id', userId)
    .eq('status', 'sent')
    .not('gmail_thread_id', 'is', null);

  if (!candidatures || candidatures.length === 0) {
    return { checked: 0, newReplies: [] };
  }

  const newReplies = [];

  for (const cand of candidatures) {
    try {
      const thread = await gmail.users.threads.get({
        userId: 'me',
        id: cand.gmail_thread_id,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject'],
      });

      if (!thread.data.messages || thread.data.messages.length <= 1) continue;

      // Trouver le dernier message qui n'est pas le nôtre
      const replyMsg = thread.data.messages[thread.data.messages.length - 1];
      if (replyMsg.id === cand.gmail_message_id) continue;

      const snippet = thread.data.messages[thread.data.messages.length - 1].snippet || '';

      await admin
        .from('candidatures')
        .update({
          status: 'replied',
          reply_snippet: snippet.substring(0, 500),
          reply_detected_at: new Date().toISOString(),
        })
        .eq('id', cand.id);

      newReplies.push({ candidatureId: cand.id, snippet: snippet.substring(0, 200) });
    } catch (threadErr) {
      console.warn(`[check-replies] Thread ${cand.gmail_thread_id} error:`, threadErr.message);
    }
  }

  console.log(`[check-replies] User ${userId}: checked ${candidatures.length}, ${newReplies.length} new replies`);
  return { checked: candidatures.length, newReplies };
}

// ============================================================
// Cron job — Vérification des réponses Gmail (toutes les 2h, 7h-20h)
// ============================================================

cron.schedule('0 7-20/2 * * *', async () => {
  const timestamp = new Date().toISOString();
  console.log(`\n[cron/replies] ========== Vérification réponses à ${timestamp} ==========`);

  const admin = getSupabaseAdmin();

  try {
    const { data: usersWithTokens } = await admin
      .from('gmail_tokens')
      .select('user_id');

    if (!usersWithTokens || usersWithTokens.length === 0) {
      console.log('[cron/replies] Aucun utilisateur avec tokens Gmail');
      return;
    }

    let totalReplies = 0;
    for (const { user_id } of usersWithTokens) {
      try {
        const result = await checkRepliesForUser(user_id);
        totalReplies += result.newReplies.length;
      } catch (err) {
        console.error(`[cron/replies] Error for user ${user_id}:`, err.message);
      }
    }

    console.log(`[cron/replies] ========== Terminé: ${totalReplies} nouvelle(s) réponse(s) ==========\n`);
  } catch (err) {
    console.error('[cron/replies] Erreur générale:', err.message);
  }
}, {
  timezone: 'Europe/Zurich',
});

console.log('[cron] Scheduler réponses actif — vérification toutes les 2h (7h-20h, Europe/Zurich)');

app.listen(PORT, () => {
  console.log(`[MedApply Server] Démarré sur http://localhost:${PORT}`);
});
