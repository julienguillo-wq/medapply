import { useState, useEffect } from 'react';
import Card from './Card';
import Button from './Button';
import Badge from './Badge';
import { Icon } from './Icons';
import { useAuth } from '../contexts/AuthContext';
import { cleanDirector, getEmail } from '../services/siwfService';
import EmailStatusBadge from './EmailStatusBadge';
import { createCandidature, updateCandidature } from '../services/candidaturesService';
import { getEmailConfig, sendApplication } from '../services/emailConfigService';
import { getDocuments } from '../services/documentsService';

// Parse le nom brut du directeur pour extraire genre, titre, nom de famille
function parseDirectorInfo(rawDirector) {
  if (!rawDirector) return { salutation: 'Madame, Monsieur', closing: 'Madame, Monsieur' };

  const raw = rawDirector.trim();

  const isFemale = /^Frau\b/i.test(raw);
  const isMale = /^Herr\b/i.test(raw);

  const cleaned = raw
    .replace(/^(Herr|Frau)\s+/i, '')
    .replace(/\b(Prof\.|PD|Dr\.|med\.|phil\.|sc\.|rer\.|nat\.|habil\.)\s*/gi, '')
    .trim();

  const parts = cleaned.split(/\s+/);
  const lastName = parts[parts.length - 1] || cleaned;

  const hasProf = /\bProf\./i.test(raw);
  const hasPD = /\bPD\b/i.test(raw);
  const hasDr = /\bDr\./i.test(raw);

  if (!isFemale && !isMale) {
    if (hasProf || hasPD) {
      return {
        salutation: `Monsieur le Professeur / Madame la Professeure ${lastName}`,
        closing: `Professeur ${lastName}`,
      };
    }
    if (hasDr) {
      return {
        salutation: `Monsieur le Docteur / Madame la Docteure ${lastName}`,
        closing: `Docteur ${lastName}`,
      };
    }
    return { salutation: 'Madame, Monsieur', closing: 'Madame, Monsieur' };
  }

  const civility = isFemale ? 'Madame' : 'Monsieur';

  if (hasProf || hasPD) {
    const title = isFemale ? 'la Professeure' : 'le Professeur';
    return {
      salutation: `${civility} ${title} ${lastName}`,
      closing: `Professeur ${lastName}`,
    };
  }
  if (hasDr) {
    const title = isFemale ? 'la Docteure' : 'le Docteur';
    return {
      salutation: `${civility} ${title} ${lastName}`,
      closing: `Docteur ${lastName}`,
    };
  }

  return {
    salutation: `${civility} ${lastName}`,
    closing: `${civility} ${lastName}`,
  };
}

export default function ApplicationModal({ establishment, existingCandidature, onClose, onSaved }) {
  const { user, profile } = useAuth();

  const emailInfo = getEmail(establishment);
  const directorClean = cleanDirector(establishment.director);
  const { salutation, closing } = parseDirectorInfo(establishment.director);

  const [letter, setLetter] = useState(existingCandidature?.motivation_letter || '');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null); // { type: 'success'|'error', text }
  const [hasSmtpConfig, setHasSmtpConfig] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(existingCandidature?.director_email || emailInfo.email || '');
  const [emailManuallyEdited, setEmailManuallyEdited] = useState(false);
  const [mailSubject, setMailSubject] = useState(
    `Candidature spontanée - ${establishment.specialty || 'Médecine'} - ${[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || ''}`
  );
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [userDocuments, setUserDocuments] = useState([]);

  // Vérifier si l'utilisateur a configuré son email SMTP + charger les documents
  useEffect(() => {
    if (user?.id) {
      getEmailConfig(user.id).then(({ data }) => {
        setHasSmtpConfig(!!data?.smtp_verified);
      });
      getDocuments(user.id).then(({ data }) => {
        if (data) setUserDocuments(data);
      });
    }
  }, [user?.id]);

  const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user?.email || '';
  const userSpecialty = profile?.specialty || '';

  // Build signature title based on user gender
  const signatureTitle = profile?.gender === 'F'
    ? 'Médecin assistante'
    : profile?.gender === 'M'
      ? 'Médecin assistant'
      : 'Médecin assistant(e)';

  function handleGenerate() {
    setLetter(`Cher ${salutation},

Je m\u2019appelle Giulia Scattu et je souhaite d\u00e9poser ma candidature pour un poste de m\u00e9decin assistante au sein de votre service. J\u2019ai obtenu mon dipl\u00f4me en m\u00e9decine et chirurgie \u00e0 l\u2019Universit\u00e9 Vest Vasile Goldis d\u2019Arad (Roumanie) le 14 septembre 2024. D\u00e8s la fin de ma premi\u00e8re ann\u00e9e d\u2019\u00e9tudes, j\u2019ai effectu\u00e9 plusieurs stages pratiques dans des h\u00f4pitaux en Italie, en Roumanie et en Suisse. Plus r\u00e9cemment, j\u2019ai eu l\u2019opportunit\u00e9 d\u2019effectuer un stage \u00e0 l\u2019UGA de La Chaux-de-Fonds, ainsi que ma premi\u00e8re ann\u00e9e de formation en rotation entre le service de r\u00e9adaptation musculo squelettique et neurologique de Val-de-Ruz et l\u2019UGA de La Chaux-de-Fonds, et \u00e0 partir de Mai 2026 je serai dans le service des urgences de Neuch\u00e2tel. \u00c0 partir d\u2019octobre 2024, apr\u00e8s l\u2019obtention de mon dipl\u00f4me, je participerai \u00e9galement \u00e0 un stage organis\u00e9 par le Rotary en France, d\u2019abord en oncologie, puis en cardiologie \u00e0 Beauvais. Je souhaiterais vivement int\u00e9grer votre service en qualit\u00e9 de ${signatureTitle.toLowerCase()} \u00e0 partir du 1er Mai 2027.

En esp\u00e9rant que ma candidature retiendra votre attention, je reste \u00e0 votre disposition pour toute information compl\u00e9mentaire et je vous prie d\u2019agr\u00e9er, ${closing}, l\u2019expression de mes salutations distingu\u00e9es.

${userName}
${signatureTitle}`);
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

  function handleSendClick() {
    setShowConfirmation(true);
  }

  async function handleConfirmSend() {
    setShowConfirmation(false);
    const emailTo = recipientEmail;
    const subject = mailSubject;

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
        userName,
        userId: user.id,
        establishmentId: String(establishment.id),
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

  function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
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
        <div className="flex items-center gap-2 text-sm mb-2">
          <Icon.Mail size={15} className="text-gray-400 shrink-0" />
          {emailInfo.email ? (
            <span className="text-gray-600">{emailInfo.email}</span>
          ) : (
            <span className="text-gray-400">Pas d&apos;email disponible</span>
          )}
          <EmailStatusBadge status={emailInfo.status} compact />
        </div>
        {emailInfo.status === 'invalid' && (
          <div className="flex items-start gap-2 mb-5 p-2.5 bg-red-50 border border-red-100 rounded-xl">
            <Icon.AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-[13px] text-red-600">
              Cet email a été détecté comme invalide (bounce). Vérifiez l&apos;adresse avant d&apos;envoyer.
            </p>
          </div>
        )}
        {emailInfo.status !== 'invalid' && <div className="mb-3" />}

        {/* Letter section */}
        {!letter && !generating && (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center mx-auto mb-5 text-white shadow-[0_12px_40px_rgba(0,102,255,0.3)] animate-float">
              <Icon.Sparkle size={28} />
            </div>
            <p className="text-gray-500 text-sm mb-6">
              Générez votre lettre de motivation personnalisée
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
                  onChange={(e) => { setRecipientEmail(e.target.value); setEmailManuallyEdited(true); }}
                  placeholder="email@exemple.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary transition-colors"
                />
              </div>
              {emailInfo.source === 'pattern' && !emailManuallyEdited && (
                <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                  <span>&#9888;&#65039;</span> Email généré automatiquement — vérifiez qu&apos;il est correct avant d&apos;envoyer
                </p>
              )}
              {emailInfo.email && recipientEmail !== emailInfo.email && (
                <button
                  onClick={() => { setRecipientEmail(emailInfo.email); setEmailManuallyEdited(false); }}
                  className="text-xs text-primary hover:underline mt-1 cursor-pointer"
                >
                  Rétablir l&apos;email suggéré ({emailInfo.email})
                </button>
              )}
            </div>

            {/* Editable mail subject */}
            <div className="mb-4">
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Objet du mail</label>
              <input
                type="text"
                value={mailSubject}
                onChange={(e) => setMailSubject(e.target.value)}
                placeholder="Objet du mail"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary transition-colors"
              />
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
                onClick={handleSendClick}
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

      {/* Confirmation modal */}
      {showConfirmation && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4"
          onClick={() => setShowConfirmation(false)}
        >
          <div
            className="animate-scale bg-white rounded-2xl shadow-2xl max-w-[480px] w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-lg font-bold mb-4">Confirmer l&apos;envoi</h4>

            <div className="space-y-3 text-sm">
              <div>
                <span className="font-semibold text-gray-500">Destinataire :</span>{' '}
                <span className="text-gray-800">{directorClean || 'N/A'} ({recipientEmail})</span>
              </div>
              <div>
                <span className="font-semibold text-gray-500">Objet :</span>{' '}
                <span className="text-gray-800">{mailSubject}</span>
              </div>
              {hasSmtpConfig && userDocuments.length > 0 && (
                <div>
                  <span className="font-semibold text-gray-500">Pièces jointes :</span>
                  <ul className="mt-1.5 space-y-1">
                    {userDocuments.map((doc) => (
                      <li key={doc.id} className="flex items-center gap-2 text-gray-700">
                        <Icon.File size={14} className="text-gray-400 shrink-0" />
                        <span>{doc.file_name || doc.name}</span>
                        {doc.file_size && (
                          <span className="text-gray-400 text-xs">({formatFileSize(doc.file_size)})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!hasSmtpConfig && (
                <p className="text-xs text-amber-600">
                  L&apos;email s&apos;ouvrira dans votre client mail (pas de pièces jointes automatiques).
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => setShowConfirmation(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleConfirmSend}
                icon={<Icon.Send size={16} />}
                className="flex-1"
              >
                Confirmer l&apos;envoi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
