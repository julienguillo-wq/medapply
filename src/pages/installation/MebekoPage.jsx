import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import Card from '../../components/Card';
import { Icon } from '../../components/Icons';
import DocumentChecklist from '../../components/DocumentChecklist';
import TimelineTracker from '../../components/TimelineTracker';

const EU_DOCUMENTS = [
  { id: 'diplome', name: 'Diplôme de médecine — copie certifiée conforme', description: 'Copie certifiée par un notaire ou autorité compétente', tip: 'La copie doit être récente (moins de 6 mois)' },
  { id: 'trad_diplome', name: 'Traduction certifiée du diplôme', description: 'Si le diplôme n\'est pas en FR/DE/IT', tip: 'La traduction doit être faite par un traducteur assermenté' },
  { id: 'titre_postgrade', name: 'Titre postgrade / spécialiste', description: 'Si vous avez un titre de spécialiste', tip: null },
  { id: 'trad_titre', name: 'Traduction du titre postgrade', description: 'Si le titre n\'est pas en FR/DE/IT', tip: 'Même traducteur que pour le diplôme si possible' },
  { id: 'good_standing', name: 'Certificate of Good Standing', description: 'Attestation de bonne conduite professionnelle', tip: 'À demander auprès de l\'autorité médicale de votre pays — valable 3 mois' },
  { id: 'conformite_eu', name: 'Attestation de conformité EU', description: 'Pour les diplômes délivrés dans l\'UE/AELE', tip: null },
  { id: 'passeport', name: 'Pièce d\'identité / passeport', description: 'Copie en couleur, pages principales', tip: null },
  { id: 'photo', name: 'Photo d\'identité', description: 'Format passeport, fond blanc', tip: null },
  { id: 'cv', name: 'CV médical', description: 'Votre parcours professionnel médical complet', tip: 'Vous pouvez générer votre CV depuis le module Candidatures' },
  { id: 'formulaire', name: 'Formulaire de demande MEBEKO', description: 'Formulaire officiel à télécharger et remplir', tip: 'Disponible sur le site bag.admin.ch' },
];

const HORS_UE_DOCUMENTS = [
  { id: 'diplome', name: 'Diplôme de médecine — copie certifiée conforme', description: 'Copie certifiée par un notaire ou autorité compétente', tip: 'La copie doit être récente (moins de 6 mois)' },
  { id: 'trad_diplome', name: 'Traduction certifiée du diplôme', description: 'Traduction en FR, DE ou IT obligatoire', tip: 'La traduction doit être faite par un traducteur assermenté' },
  { id: 'titre_postgrade', name: 'Titre postgrade / spécialiste', description: 'Si vous avez un titre de spécialiste', tip: null },
  { id: 'trad_titre', name: 'Traduction du titre postgrade', description: 'Traduction en FR, DE ou IT', tip: null },
  { id: 'good_standing', name: 'Certificate of Good Standing', description: 'Attestation de bonne conduite professionnelle', tip: 'À demander auprès de l\'autorité médicale de votre pays — valable 3 mois' },
  { id: 'programme', name: 'Programme d\'études détaillé', description: 'Programme de formation complète avec heures/ECTS', tip: 'Demandez au secrétariat de votre faculté' },
  { id: 'passeport', name: 'Pièce d\'identité / passeport', description: 'Copie en couleur, pages principales', tip: null },
  { id: 'photo', name: 'Photo d\'identité', description: 'Format passeport, fond blanc', tip: null },
  { id: 'cv', name: 'CV médical', description: 'Votre parcours professionnel médical complet', tip: null },
  { id: 'formulaire', name: 'Formulaire de demande MEBEKO', description: 'Formulaire officiel à télécharger et remplir', tip: 'Disponible sur le site bag.admin.ch' },
];

const TIMELINE_STEPS = [
  { id: 'preparation', emoji: '\uD83D\uDCCB', label: 'Dossier en préparation', hint: 'Rassemblez tous les documents requis', badge: null },
  { id: 'sent', emoji: '\uD83D\uDCE4', label: 'Dossier envoyé', hint: 'Envoi postal recommandé à la MEBEKO', badge: null },
  { id: 'processing', emoji: '\u23F3', label: 'En traitement par la MEBEKO', hint: null, badge: null },
  { id: 'complement', emoji: '\uD83D\uDCE9', label: 'Demande de compléments', hint: 'Le cas échéant', badge: 'Optionnel' },
  { id: 'decision', emoji: '\u2705', label: 'Décision', hint: 'Reconnaissance obtenue ou refusée', badge: null },
];

export default function MebekoPage() {
  const { state, update, isEUPath } = useOutletContext();
  const mebeko = state.mebeko;
  const [activeTab, setActiveTab] = useState('documents');

  const templateDocs = isEUPath ? EU_DOCUMENTS : HORS_UE_DOCUMENTS;
  const documents = templateDocs.map(doc => ({
    ...doc,
    status: mebeko.documents[doc.id]?.status || 'todo',
  }));

  const timelineSteps = TIMELINE_STEPS.map((step, i) => {
    const data = mebeko.timeline[step.id] || {};
    const prevDone = i === 0 || mebeko.timeline[TIMELINE_STEPS[i - 1].id]?.done;
    return {
      ...step,
      done: data.done || false,
      date: data.date || '',
      notes: data.notes || '',
      result: data.result || null,
      active: prevDone && !data.done,
    };
  });

  const handleDocStatusChange = (docId, status) => {
    const newDocs = { ...mebeko.documents, [docId]: { ...mebeko.documents[docId], status } };
    update('mebeko', { ...mebeko, documents: newDocs });
  };

  const handleDocUpload = (docId) => {
    const newDocs = { ...mebeko.documents, [docId]: { ...mebeko.documents[docId], status: 'uploaded' } };
    update('mebeko', { ...mebeko, documents: newDocs });
  };

  const handleTimelineToggle = (id) => {
    const current = mebeko.timeline[id] || {};
    const newTimeline = { ...mebeko.timeline, [id]: { ...current, done: !current.done, date: current.date || new Date().toISOString().slice(0, 10) } };
    update('mebeko', { ...mebeko, timeline: newTimeline });
  };

  const handleTimelineDate = (id, date) => {
    const current = mebeko.timeline[id] || {};
    const newTimeline = { ...mebeko.timeline, [id]: { ...current, date } };
    update('mebeko', { ...mebeko, timeline: newTimeline });
  };

  const handleTimelineNotes = (id, notes) => {
    const current = mebeko.timeline[id] || {};
    const newTimeline = { ...mebeko.timeline, [id]: { ...current, notes } };
    update('mebeko', { ...mebeko, timeline: newTimeline });
  };

  return (
    <div className="animate-fade">
      <div className="mb-8">
        <h1 className="text-2xl md:text-[28px] font-bold tracking-tight mb-2">Dossier MEBEKO</h1>
        <p className="text-gray-500 text-[15px]">
          {isEUPath
            ? 'Procédure de reconnaissance directe (voie UE/AELE)'
            : 'Procédure via examen fédéral (voie hors-UE)'}
        </p>
      </div>

      {/* Info banner */}
      {!state.diagnostic.completed && (
        <div className="flex items-start gap-3 p-4 bg-warning-bg/50 border border-warning/20 rounded-xl mb-6 text-sm text-amber-800">
          <Icon.AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-warning" />
          <span>Complétez d'abord le <strong>diagnostic d'éligibilité</strong> pour personnaliser la liste des documents.</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all cursor-pointer ${
            activeTab === 'documents' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2"><Icon.File size={16} /> Checklist</span>
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all cursor-pointer ${
            activeTab === 'timeline' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2"><Icon.Clock size={16} /> Suivi</span>
        </button>
      </div>

      {activeTab === 'documents' && (
        <Card className="animate-slide">
          <DocumentChecklist
            documents={documents}
            onStatusChange={handleDocStatusChange}
            onFileUpload={handleDocUpload}
          />
        </Card>
      )}

      {activeTab === 'timeline' && (
        <Card className="animate-slide">
          <h3 className="text-base font-semibold mb-1">Suivi de votre demande</h3>
          <p className="text-sm text-gray-400 mb-6">
            Délai moyen : {isEUPath ? '3-4 mois' : '6-12 mois'}
          </p>
          <TimelineTracker
            steps={timelineSteps}
            onToggle={handleTimelineToggle}
            onDateChange={handleTimelineDate}
            onNotesChange={handleTimelineNotes}
          />
        </Card>
      )}
    </div>
  );
}
