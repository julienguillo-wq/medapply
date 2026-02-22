// ============================================================
// Backend Express.js pour MedApply
// Gère l'envoi d'emails via SMTP Gmail (nodemailer)
// ============================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

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
    const { emailConfig, attachments } = await getUserSendContext(supabase, userId);

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

    // Envoyer l'email — HTML avec <br> pour éviter que Gmail
    // reformatte le bloc contact en blockquote/signature
    const htmlBody = body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');

    const mailOptions = {
      from: `${userName || emailConfig.email_address} <${emailConfig.email_address}>`,
      to,
      replyTo: emailConfig.email_address,
      subject,
      text: body,
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

    return res.json({
      success: true,
      messageId: info.messageId,
      attachmentsCount: attachments.length,
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
  const { name, sendPerDay, items, userId } = req.body;

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
        send_per_day: sendPerDay || 4,
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

  const accessToken = authHeader.split(' ')[1];
  const campaignId = req.params.id;

  try {
    const admin = getSupabaseAdmin();
    const supabase = getSupabaseClient(accessToken);

    // Récupérer la campagne
    const { data: campaign, error: campError } = await admin
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campError || !campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    if (campaign.status === 'paused') {
      return res.status(400).json({ error: 'Campagne en pause' });
    }

    // Récupérer le contexte d'envoi
    const { emailConfig, attachments, userName } = await getUserSendContext(supabase, campaign.user_id);

    // Récupérer les prochains items 'ready'
    const { data: readyItems, error: itemsError } = await admin
      .from('campaign_items')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('item_status', 'ready')
      .order('created_at', { ascending: true })
      .limit(campaign.send_per_day);

    if (itemsError) {
      return res.status(500).json({ error: itemsError.message });
    }

    if (!readyItems || readyItems.length === 0) {
      // Plus rien à envoyer → marquer comme terminée
      await admin
        .from('campaigns')
        .update({ status: 'completed' })
        .eq('id', campaignId);

      return res.json({ success: true, sent: 0, message: 'Tous les envois ont été effectués' });
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
    let userSpecialty = '';
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('specialty')
        .eq('id', campaign.user_id)
        .single();
      userSpecialty = profile?.specialty || '';
    } catch { /* ignore */ }

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
        continue;
      }

      try {
        const subject = `Candidature spontanée - ${item.specialty || userSpecialty || 'Médecine'} - ${userName}`;

        const letterHtml = item.motivation_letter
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>');

        const mailOptions = {
          from: `${userName} <${emailConfig.email_address}>`,
          to: item.director_email,
          replyTo: emailConfig.email_address,
          subject,
          text: item.motivation_letter,
          html: letterHtml,
          attachments,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[campaigns/send-next] Email envoyé à ${item.director_email}:`, info.messageId);

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

        sentCount++;
        results.push({ id: item.id, status: 'sent' });
      } catch (sendErr) {
        console.error(`[campaigns/send-next] Erreur envoi ${item.director_email}:`, sendErr.message);

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

    if (!remainingItems || remainingItems.length === 0) {
      await admin
        .from('campaigns')
        .update({ status: 'completed' })
        .eq('id', campaignId);
    }

    return res.json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      results,
    });
  } catch (err) {
    console.error('[campaigns/send-next] Erreur:', err.message);
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

app.listen(PORT, () => {
  console.log(`[MedApply Server] Démarré sur http://localhost:${PORT}`);
});
