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
    // 1. Récupérer la config SMTP de l'utilisateur
    const supabase = getSupabaseClient(accessToken);
    const { data: emailConfig, error: configError } = await supabase
      .from('user_email_config')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (configError || !emailConfig) {
      return res.status(400).json({
        error: 'Configuration email non trouvée. Configurez votre email dans Profil.',
      });
    }

    // 2. Récupérer les documents de l'utilisateur depuis Supabase Storage
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
          console.warn(`[send-application] Impossible de télécharger ${doc.file_name}:`, dlErr.message);
        }
      }
    }

    // 3. Récupérer le profil utilisateur pour la signature
    let signature = '';
    try {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name, specialty, phone, email')
        .eq('id', userId)
        .single();

      if (userProfile) {
        const sigParts = [];
        const fullName = [userProfile.first_name, userProfile.last_name].filter(Boolean).join(' ');
        if (fullName) sigParts.push(fullName);
        if (userProfile.specialty) sigParts.push(`Médecin assistante en ${userProfile.specialty}`);
        if (userProfile.phone) sigParts.push(`Tél : ${userProfile.phone}`);
        if (userProfile.email) sigParts.push(userProfile.email);
        if (sigParts.length > 0) {
          signature = '\n\n—\n' + sigParts.join('\n');
        }
      }
    } catch (sigErr) {
      console.warn('[send-application] Impossible de charger le profil pour la signature:', sigErr.message);
    }

    // 4. Créer le transporteur SMTP
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: emailConfig.email_address,
        pass: emailConfig.smtp_password,
      },
    });

    // 5. Envoyer l'email
    const mailOptions = {
      from: `${userName || emailConfig.email_address} <${emailConfig.email_address}>`,
      to,
      replyTo: emailConfig.email_address,
      subject,
      text: body + signature,
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
          // Increment bounce_count via raw upsert
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

app.listen(PORT, () => {
  console.log(`[MedApply Server] Démarré sur http://localhost:${PORT}`);
});
