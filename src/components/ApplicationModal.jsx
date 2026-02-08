import { useState, useEffect } from 'react';
import Card from './Card';
import Button from './Button';
import Badge from './Badge';
import { Icon } from './Icons';
import { useAuth } from '../contexts/AuthContext';
import { cleanDirector, getEmail } from '../services/siwfService';
import { createCandidature, updateCandidature } from '../services/candidaturesService';
import { getEmailConfig, sendApplication } from '../services/emailConfigService';
import { getDocuments, getSignedUrl } from '../services/documentsService';

// Construit une formule d'appel personnalisée à partir du nom brut du directeur
// Ex: "Herr Prof. Dr. med. Hans Müller" → "Monsieur le Professeur Müller"
// Ex: "Frau Dr. med. Anna Schmidt" → "Madame la Docteure Schmidt"
function buildSalutation(rawDirector) {
  if (!rawDirector) return 'Madame, Monsieur';

  const raw = rawDirector.trim();

  // Détecter le genre via le préfixe allemand Herr/Frau
  const isFemale = /^Frau\b/i.test(raw);
  const isMale = /^Herr\b/i.test(raw);

  // Retirer les préfixes/titres pour extraire le nom de famille
  const cleaned = raw
    .replace(/^(Herr|Frau)\s+/i, '')
    .replace(/\b(Prof\.|PD|Dr\.|med\.|phil\.|sc\.|rer\.|nat\.|habil\.)\s*/gi, '')
    .trim();

  // Le nom de famille est le dernier mot
  const parts = cleaned.split(/\s+/);
  const lastName = parts[parts.length - 1] || cleaned;

  // Détecter le titre académique le plus élevé
  const hasProf = /\bProf\./i.test(raw);
  const hasPD = /\bPD\b/i.test(raw);
  const hasDr = /\bDr\./i.test(raw);

  if (!isFemale && !isMale) {
    // Genre inconnu : formule avec titre si disponible
    if (hasProf || hasPD) return `Monsieur le Professeur / Madame la Professeure ${lastName}`;
    if (hasDr) return `Monsieur le Docteur / Madame la Docteure ${lastName}`;
    return 'Madame, Monsieur';
  }

  const civility = isFemale ? 'Madame' : 'Monsieur';

  if (hasProf || hasPD) {
    const title = isFemale ? 'la Professeure' : 'le Professeur';
    return `${civility} ${title} ${lastName}`;
  }
  if (hasDr) {
    const title = isFemale ? 'la Docteure' : 'le Docteur';
    return `${civility} ${title} ${lastName}`;
  }

  return `${civility} ${lastName}`;
}

export default function ApplicationModal({ establishment, existingCandidature, onClose, onSaved }) {
  const { user, profile } = useAuth();

  const emailInfo = getEmail(establishment);
  const directorClean = cleanDirector(establishment.director);
  const salutation = buildSalutation(establishment.director);

  const [letter, setLetter] = useState(existingCandidature?.motivation_letter || '');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null); // { type: 'success'|'error', text }
  const [hasSmtpConfig, setHasSmtpConfig] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(existingCandidature?.director_email || emailInfo.email || '');

  // Vérifier si l'utilisateur a configuré son email SMTP
  useEffect(() => {
    if (user?.id) {
      getEmailConfig(user.id).then(({ data }) => {
        setHasSmtpConfig(!!data?.smtp_verified);
      });
    }
  }, [user?.id]);

  const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user?.email || '';
  const userSpecialty = profile?.specialty || '';

  // Récupérer le contenu texte de la lettre de motivation uploadée
  async function fetchUserMotivationLetter() {
    if (!user?.id) return null;
    try {
      const { data: docs } = await getDocuments(user.id, 'lettre_motivation');
      if (!docs || docs.length === 0) return null;

      const doc = docs[0]; // Le plus récent
      const { url } = await getSignedUrl(doc.file_path);
      if (!url) return null;

      const mime = doc.mime_type || '';

      // Fichier texte : récupérer le contenu directement
      if (mime === 'text/plain' || doc.file_name?.endsWith('.txt')) {
        const res = await fetch(url);
        if (!res.ok) return null;
        const text = await res.text();
        return { type: 'text', content: text, fileName: doc.file_name };
      }

      // PDF ou DOCX : envoyer en base64 via l'API vision de Claude
      if (mime === 'application/pdf' || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        const buffer = await blob.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        return { type: 'document', mediaType: mime, base64, fileName: doc.file_name };
      }

      return null;
    } catch (err) {
      console.warn('[ApplicationModal] Impossible de charger la lettre de motivation:', err.message);
      return null;
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) {
        setLetter("(Clé API Anthropic manquante — ajoutez VITE_ANTHROPIC_API_KEY dans .env)\n\n" + salutation + ",\n\nJe me permets de vous adresser ma candidature spontanée pour un poste de médecin assistant dans votre service de " + (establishment.specialty || 'médecine') + ". Vous trouverez ci-joint ma lettre de motivation, mon CV ainsi que mes diplômes.\n\nJe reste à votre disposition pour un entretien et vous adresse mes meilleures salutations.\n\nDr " + userName);
        setGenerating(false);
        return;
      }

      // Tenter de récupérer la lettre de motivation uploadée
      const motivationLetter = await fetchUserMotivationLetter();

      const systemPrompt = `Tu es un assistant spécialisé dans la rédaction d'emails d'accompagnement pour des candidatures médicales en Suisse.
Rédige un email d'accompagnement court et professionnel (5-8 lignes maximum) pour une candidature spontanée.
La lettre de motivation complète, le CV et les diplômes seront joints en pièce jointe, il est donc inutile de répéter leur contenu.
L'email doit : se présenter brièvement, exprimer l'intérêt pour le poste/service, mentionner les pièces jointes, et conclure avec une formule de politesse suisse.
Rédige en français avec vouvoiement.
L'email commence directement par la formule d'appel (pas d'en-tête d'adresse, pas d'objet).

FORMULE D'APPEL :
- Utiliser EXACTEMENT la formule d'appel fournie dans les données (ex: "Monsieur le Professeur Müller"). Ne JAMAIS la modifier ni utiliser "Madame, Monsieur" si un nom est fourni.
- Suivre la formule d'appel d'une virgule puis retour à la ligne.

RÈGLES IMPÉRATIVES SUR LE VOCABULAIRE MÉDICAL :
- Le candidat est un MÉDECIN ASSISTANT en formation postgraduée, PAS un spécialiste confirmé.
- Ne JAMAIS écrire "spécialisé en", "fort d'une expérience en", "expert en" ou toute formulation qui implique un titre de spécialiste obtenu.
- Utiliser : "actuellement en formation postgraduée en [spécialité]", "médecin assistant en [spécialité]", ou "actuellement en tournée/tournus dans le service de [spécialité]".
- Écrire "je souhaite poursuivre ma formation en..." et NON "orienter ma carrière vers..." ou "mettre mes compétences de spécialiste au service de...".
- Le candidat CHERCHE un poste de formation, il ne propose pas ses services de spécialiste.`;

      let userPromptText = `Rédige un email d'accompagnement court (5-8 lignes) pour une candidature spontanée de médecin assistant avec ces informations :

Candidat : Dr ${userName}
Spécialité visée : ${establishment.specialty || userSpecialty || 'médecine'}
Établissement : ${establishment.name}
Ville : ${establishment.city || ''} (${establishment.canton || ''})
Directeur : ${directorClean}
Formule d'appel à utiliser : ${salutation}
${userSpecialty ? `Formation actuelle du candidat : médecin assistant en ${userSpecialty}` : ''}

Rappel : la lettre de motivation détaillée, le CV et les diplômes sont en pièces jointes. L'email doit être bref et donner envie d'ouvrir les documents joints.`;

      // Construire le contenu du message selon le type de lettre récupérée
      let messageContent;

      if (motivationLetter?.type === 'text') {
        userPromptText += `

Voici la lettre de motivation personnelle du candidat qui sera jointe. Inspire-toi de son style et ton pour rédiger l'email d'accompagnement, sans répéter le contenu de la lettre.

--- LETTRE DU CANDIDAT ---
${motivationLetter.content}
--- FIN DE LA LETTRE ---`;
        messageContent = userPromptText;
      } else if (motivationLetter?.type === 'document') {
        userPromptText += `

Voici la lettre de motivation personnelle du candidat qui sera jointe (en pièce jointe ci-dessous). Inspire-toi de son style et ton pour rédiger l'email d'accompagnement, sans répéter le contenu de la lettre.`;
        messageContent = [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: motivationLetter.mediaType,
              data: motivationLetter.base64,
            },
          },
          { type: 'text', text: userPromptText },
        ];
      } else {
        messageContent = userPromptText;
      }

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: messageContent }],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('[ApplicationModal] API error:', res.status, errText);
        setLetter("Erreur lors de la génération. Veuillez réessayer.");
        setGenerating(false);
        return;
      }

      const data = await res.json();
      const text = data.content?.[0]?.text || "Erreur : aucune réponse de l'IA.";
      setLetter(text);
    } catch (err) {
      console.error('[ApplicationModal] Erreur génération:', err);
      setLetter("Erreur lors de la génération. Vérifiez votre connexion et réessayez.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveDraft() {
    setSaving(true);
    try {
      let result;
      if (existingCandidature?.id) {
        result = await updateCandidature(existingCandidature.id, {
          motivation_letter: letter,
          director_email: recipientEmail,
        });
      } else {
        result = await createCandidature(user.id, {
          establishment_id: String(establishment.id),
          establishment_name: establishment.name,
          establishment_city: establishment.city || '',
          establishment_canton: establishment.canton || '',
          director_name: directorClean,
          director_email: recipientEmail,
          specialty: establishment.specialty || '',
          status: 'draft',
          motivation_letter: letter,
        });
      }
      if (result.data && onSaved) {
        onSaved(result.data);
      }
    } catch (err) {
      console.error('[ApplicationModal] Erreur sauvegarde:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSendEmail() {
    const emailTo = recipientEmail;
    const subject = `Candidature spontanée - ${establishment.specialty || 'Médecine'} - Dr ${userName}`;

    // Si pas de config SMTP, fallback sur mailto
    if (!hasSmtpConfig) {
      // Save first, then open mailto
      setSaving(true);
      try {
        let candidature = existingCandidature;
        if (existingCandidature?.id) {
          const result = await updateCandidature(existingCandidature.id, {
            motivation_letter: letter,
            director_email: emailTo,
            status: 'sent',
            sent_at: new Date().toISOString(),
          });
          if (result.data) candidature = result.data;
        } else {
          const result = await createCandidature(user.id, {
            establishment_id: String(establishment.id),
            establishment_name: establishment.name,
            establishment_city: establishment.city || '',
            establishment_canton: establishment.canton || '',
            director_name: directorClean,
            director_email: emailTo,
            specialty: establishment.specialty || '',
            status: 'sent',
            motivation_letter: letter,
            sent_at: new Date().toISOString(),
          });
          if (result.data) candidature = result.data;
        }
        if (candidature && onSaved) onSaved(candidature);
      } catch (err) {
        console.error('[ApplicationModal] Erreur sauvegarde avant envoi:', err);
      } finally {
        setSaving(false);
      }
      window.open(`mailto:${emailTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(letter)}`, '_self');
      return;
    }

    // Envoi via SMTP
    setSending(true);
    setSendResult(null);
    try {
      const result = await sendApplication({
        to: emailTo,
        subject,
        body: letter,
        userName: `Dr ${userName}`,
        userId: user.id,
      });

      if (result.success) {
        // Sauvegarder la candidature comme envoyée
        let candidature = existingCandidature;
        if (existingCandidature?.id) {
          const saveResult = await updateCandidature(existingCandidature.id, {
            motivation_letter: letter,
            director_email: emailTo,
            status: 'sent',
            sent_at: new Date().toISOString(),
          });
          if (saveResult.data) candidature = saveResult.data;
        } else {
          const saveResult = await createCandidature(user.id, {
            establishment_id: String(establishment.id),
            establishment_name: establishment.name,
            establishment_city: establishment.city || '',
            establishment_canton: establishment.canton || '',
            director_name: directorClean,
            director_email: emailTo,
            specialty: establishment.specialty || '',
            status: 'sent',
            motivation_letter: letter,
            sent_at: new Date().toISOString(),
          });
          if (saveResult.data) candidature = saveResult.data;
        }
        if (candidature && onSaved) onSaved(candidature);

        setSendResult({
          type: 'success',
          text: `Email envoyé avec succès${result.attachmentsCount ? ` (${result.attachmentsCount} pièce${result.attachmentsCount > 1 ? 's' : ''} jointe${result.attachmentsCount > 1 ? 's' : ''})` : ''} !`,
        });
      } else {
        setSendResult({ type: 'error', text: result.error || 'Erreur lors de l\'envoi' });
      }
    } catch (err) {
      console.error('[ApplicationModal] Erreur envoi SMTP:', err);
      setSendResult({ type: 'error', text: 'Erreur lors de l\'envoi. Vérifiez votre configuration email.' });
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="animate-fade fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 md:p-10"
      onClick={onClose}
    >
      <Card
        className="animate-scale max-w-[680px] w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold truncate">{establishment.name}</h3>
            <p className="text-gray-500 text-sm">
              {establishment.city}{establishment.canton ? ` (${establishment.canton})` : ''}
            </p>
          </div>
          <button onClick={onClose} className="bg-gray-100 rounded-[10px] p-2.5 cursor-pointer shrink-0 ml-3">
            <Icon.X size={18} />
          </button>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {establishment.specialty && <Badge variant="primary">{establishment.specialty}</Badge>}
          {establishment.category && <Badge>{establishment.category}</Badge>}
        </div>

        {/* Director info */}
        {establishment.director && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <Icon.User size={15} className="text-gray-400 shrink-0" />
            <span>{directorClean}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm mb-5">
          <Icon.Mail size={15} className="text-gray-400 shrink-0" />
          {emailInfo.email ? (
            <span className="text-gray-600">
              {emailInfo.email}
              {emailInfo.source === 'pattern' && (
                <span className="text-[11px] text-gray-400 ml-1.5">(suggéré)</span>
              )}
            </span>
          ) : (
            <span className="text-gray-400">Pas d&apos;email disponible</span>
          )}
        </div>

        {/* Letter section */}
        {!letter && !generating && (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center mx-auto mb-5 text-white shadow-[0_12px_40px_rgba(0,102,255,0.3)] animate-float">
              <Icon.Sparkle size={28} />
            </div>
            <p className="text-gray-500 text-sm mb-6">
              Générez un email d&apos;accompagnement personnalisé avec l&apos;IA
            </p>
            <Button
              onClick={handleGenerate}
              icon={<Icon.Sparkle size={18} />}
            >
              Générer la lettre
            </Button>
          </div>
        )}

        {generating && (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-5 text-white">
              <Icon.Sparkle size={28} />
            </div>
            <p className="text-gray-600 font-medium mb-2">Génération en cours...</p>
            <p className="text-gray-400 text-sm mb-6">L&apos;IA rédige votre email d&apos;accompagnement</p>
            <div className="w-[200px] h-1 bg-gray-100 rounded-full mx-auto overflow-hidden">
              <div className="w-[30%] h-full bg-gradient-to-r from-primary via-primary-light to-primary rounded-full animate-shimmer" />
            </div>
          </div>
        )}

        {letter && !generating && (
          <div>
            {/* Editable recipient email */}
            <div className="mb-4">
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Email du destinataire</label>
              <div className="relative">
                <Icon.Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="email@exemple.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary transition-colors"
                />
              </div>
              {emailInfo.email && recipientEmail !== emailInfo.email && (
                <button
                  onClick={() => setRecipientEmail(emailInfo.email)}
                  className="text-xs text-primary hover:underline mt-1 cursor-pointer"
                >
                  Rétablir l&apos;email suggéré ({emailInfo.email})
                </button>
              )}
            </div>

            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">Email d&apos;accompagnement</label>
              <Button
                variant="ghost"
                size="small"
                onClick={handleGenerate}
                icon={<Icon.Sparkle size={14} />}
              >
                Regénérer
              </Button>
            </div>
            <textarea
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              className="w-full min-h-[280px] p-4 border border-gray-200 rounded-xl text-sm leading-relaxed text-gray-700 resize-y focus:outline-none focus:border-primary transition-colors"
            />

            {hasSmtpConfig ? (
              <div className="flex items-start gap-2 mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <Icon.Mail size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[13px] text-blue-700">
                  L&apos;email sera envoyé directement depuis votre Gmail avec vos documents en pièces jointes.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2 mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <Icon.FileText size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[13px] text-amber-700">
                  Configurez votre email Gmail dans Profil pour envoyer directement avec pièces jointes. Sinon, l&apos;email s&apos;ouvrira dans votre client mail.
                </p>
              </div>
            )}

            {sendResult && (
              <div className={`mt-3 p-3 rounded-xl text-sm flex items-center gap-2 ${
                sendResult.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-100'
                  : 'bg-red-50 text-red-700 border border-red-100'
              }`}>
                {sendResult.type === 'success' ? <Icon.Check size={16} /> : <Icon.X size={16} />}
                {sendResult.text}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-5">
              <Button
                variant="secondary"
                onClick={handleSaveDraft}
                disabled={saving || sending}
                icon={<Icon.Save size={16} />}
                className="flex-1"
              >
                {saving ? 'Sauvegarde...' : 'Sauvegarder brouillon'}
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={saving || sending || !recipientEmail}
                icon={<Icon.Send size={16} />}
                className="flex-1"
              >
                {sending ? 'Envoi en cours...' : hasSmtpConfig ? 'Envoyer via Gmail' : 'Envoyer par email'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
