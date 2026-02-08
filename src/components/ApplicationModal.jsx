import { useState } from 'react';
import Card from './Card';
import Button from './Button';
import Badge from './Badge';
import { Icon } from './Icons';
import { useAuth } from '../contexts/AuthContext';
import { cleanDirector, getEmail } from '../services/siwfService';
import { createCandidature, updateCandidature } from '../services/candidaturesService';

export default function ApplicationModal({ establishment, existingCandidature, onClose, onSaved }) {
  const { user, profile } = useAuth();

  const emailInfo = getEmail(establishment);
  const directorClean = cleanDirector(establishment.director);

  const [letter, setLetter] = useState(existingCandidature?.motivation_letter || '');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user?.email || '';
  const userSpecialty = profile?.specialty || '';

  async function handleGenerate() {
    setGenerating(true);
    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) {
        setLetter("(Clé API Anthropic manquante — ajoutez VITE_ANTHROPIC_API_KEY dans .env)\n\nMadame, Monsieur,\n\nJe me permets de vous adresser ma candidature spontanée pour un poste de médecin assistant au sein de votre service de " + (establishment.specialty || 'médecine') + ".\n\nMon parcours de formation m'a permis de développer des compétences cliniques solides que je souhaite approfondir au sein de votre établissement, reconnu pour la qualité de sa formation postgraduée.\n\nJe reste à votre entière disposition pour un entretien et vous prie d'agréer, " + directorClean + ", l'expression de mes salutations distinguées.\n\nDr " + userName);
        setGenerating(false);
        return;
      }

      const systemPrompt = `Tu es un assistant spécialisé dans la rédaction de lettres de motivation médicales en Suisse.
Rédige des lettres formelles en français avec vouvoiement.
La lettre doit commencer directement par la formule d'appel (pas d'en-tête d'adresse).
Utilise un ton professionnel, concis et respectueux.
La lettre fait environ 200-250 mots.`;

      const userPrompt = `Rédige une lettre de motivation spontanée pour un poste de médecin assistant avec ces informations :

Candidat : Dr ${userName}
Spécialité visée : ${establishment.specialty || userSpecialty || 'médecine'}
Établissement : ${establishment.name}
Ville : ${establishment.city || ''} (${establishment.canton || ''})
Directeur : ${directorClean}
${userSpecialty ? `Spécialité du candidat : ${userSpecialty}` : ''}

La lettre doit être personnalisée pour cet établissement et cette spécialité.`;

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
          messages: [{ role: 'user', content: userPrompt }],
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
          director_email: emailInfo.email || '',
        });
      } else {
        result = await createCandidature(user.id, {
          establishment_id: String(establishment.id),
          establishment_name: establishment.name,
          establishment_city: establishment.city || '',
          establishment_canton: establishment.canton || '',
          director_name: directorClean,
          director_email: emailInfo.email || '',
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
    // Save first, then open mailto
    setSaving(true);
    try {
      let candidature = existingCandidature;
      if (existingCandidature?.id) {
        const result = await updateCandidature(existingCandidature.id, {
          motivation_letter: letter,
          director_email: emailInfo.email || '',
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
          director_email: emailInfo.email || '',
          specialty: establishment.specialty || '',
          status: 'sent',
          motivation_letter: letter,
          sent_at: new Date().toISOString(),
        });
        if (result.data) candidature = result.data;
      }

      if (candidature && onSaved) {
        onSaved(candidature);
      }
    } catch (err) {
      console.error('[ApplicationModal] Erreur sauvegarde avant envoi:', err);
    } finally {
      setSaving(false);
    }

    // Open mailto
    const email = emailInfo.email || '';
    const subject = encodeURIComponent(`Candidature spontanée - ${establishment.specialty || 'Médecine'} - Dr ${userName}`);
    const body = encodeURIComponent(letter);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_self');
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
              Générez une lettre de motivation personnalisée avec l&apos;IA
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
            <p className="text-gray-400 text-sm mb-6">L&apos;IA rédige votre lettre personnalisée</p>
            <div className="w-[200px] h-1 bg-gray-100 rounded-full mx-auto overflow-hidden">
              <div className="w-[30%] h-full bg-gradient-to-r from-primary via-primary-light to-primary rounded-full animate-shimmer" />
            </div>
          </div>
        )}

        {letter && !generating && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">Lettre de motivation</label>
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

            <div className="flex items-start gap-2 mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <Icon.FileText size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[13px] text-amber-700">
                N&apos;oubliez pas de joindre votre CV et vos documents lors de l&apos;envoi par email.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-5">
              <Button
                variant="secondary"
                onClick={handleSaveDraft}
                disabled={saving}
                icon={<Icon.Save size={16} />}
                className="flex-1"
              >
                {saving ? 'Sauvegarde...' : 'Sauvegarder brouillon'}
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={saving || !emailInfo.email}
                icon={<Icon.Send size={16} />}
                className="flex-1"
              >
                Envoyer par email
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
