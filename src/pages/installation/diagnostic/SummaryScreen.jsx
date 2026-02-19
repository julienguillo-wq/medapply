import { useState } from 'react';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { Icon } from '../../../components/Icons';
import { EU_COUNTRIES, LANGUAGES, CANTONS, ONBOARDING_DOCUMENTS, SERVICE_PLANS, PHONE_CODES } from './constants';

function SectionHeader({ title, onEdit }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{title}</h3>
      <button
        onClick={onEdit}
        className="text-xs text-install hover:text-install-dark font-medium transition-colors cursor-pointer"
      >
        Modifier
      </button>
    </div>
  );
}

function LabelValue({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-xs text-gray-400">{label}</span>
      <div className="text-sm font-medium text-gray-800">{value}</div>
    </div>
  );
}

export default function SummaryScreen({ formData, onEditPhase, onSubmit }) {
  const [submitted, setSubmitted] = useState(false);
  const [dossierNumber, setDossierNumber] = useState(null);
  const { identity, career, documents, service } = formData;

  const isEU = EU_COUNTRIES.includes(identity.nationality);
  const langLabels = (identity.languages || []).map(id => LANGUAGES.find(l => l.id === id)?.label).filter(Boolean);
  const cantonLabels = (career.targetCantons || []).map(c => `${c} — ${CANTONS[c]}`);
  const selectedPlan = SERVICE_PLANS.find(p => p.id === service.selectedPlan);

  const docCounts = {
    has: Object.values(documents).filter(v => v === 'has').length,
    missing: Object.values(documents).filter(v => v === 'missing').length,
    docstart: Object.values(documents).filter(v => v === 'docstart').length,
  };
  const docStartDocs = ONBOARDING_DOCUMENTS.filter(d => documents[d.id] === 'docstart');

  const phoneCode = PHONE_CODES.find(p => p.code === identity.phoneCode);

  const handleSubmit = () => {
    const num = 'DS-' + String(Math.floor(100000 + Math.random() * 900000));
    setDossierNumber(num);
    setSubmitted(true);
    onSubmit(num);
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto animate-slide">
        <Card className="text-center">
          <div className="w-16 h-16 rounded-full bg-install-bg text-install flex items-center justify-center mx-auto mb-4">
            <Icon.Check size={32} />
          </div>
          <h2 className="text-xl font-bold mb-2">Dossier soumis avec succès !</h2>
          <p className="text-gray-500 text-sm mb-4">Votre numéro de dossier :</p>
          <div className="inline-block px-6 py-3 bg-install-bg rounded-xl mb-6">
            <span className="text-2xl font-bold text-install tracking-wider">{dossierNumber}</span>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Conservez ce numéro. Vous recevrez un email de confirmation avec les prochaines étapes.
          </p>
          <Button variant="install" onClick={() => window.location.href = '/installation/mebeko'} icon={<Icon.Arrow size={16} />} fullWidth>
            Continuer vers le dossier MEBEKO
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl animate-slide">
      <h2 className="text-lg font-semibold mb-2">Récapitulatif de votre dossier</h2>
      <p className="text-sm text-gray-500 mb-6">Vérifiez vos informations avant de soumettre votre demande.</p>

      {/* Identity */}
      <Card className="mb-4">
        <SectionHeader title="Identité et coordonnées" onEdit={() => onEditPhase(1)} />
        <div className="grid grid-cols-2 gap-3">
          <LabelValue label="Prénom" value={identity.firstName} />
          <LabelValue label="Nom" value={identity.lastName} />
          <LabelValue label="Email" value={identity.email} />
          <LabelValue label="Téléphone" value={`${identity.phoneCode} ${identity.phoneNumber}`} />
          <LabelValue label="Nationalité" value={
            <span>
              {identity.nationality}
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${isEU ? 'bg-install-bg text-install' : 'bg-amber-50 text-amber-600'}`}>
                {isEU ? 'UE' : 'Hors UE'}
              </span>
            </span>
          } />
          <LabelValue label="Résidence" value={identity.residenceCountry} />
          <LabelValue label="Langues" value={langLabels.join(', ')} />
        </div>
      </Card>

      {/* Career */}
      <Card className="mb-4">
        <SectionHeader title="Parcours médical" onEdit={() => onEditPhase(2)} />
        <div className="grid grid-cols-2 gap-3">
          <LabelValue label="Pays du diplôme" value={career.diplomaCountry} />
          <LabelValue label="Université" value={career.university} />
          <LabelValue label="Année du diplôme" value={career.diplomaYear} />
          <LabelValue label="Expérience clinique" value={career.clinicalExperienceYears} />
          <LabelValue label="Spécialiste" value={
            career.specialistStatus === 'yes' ? `Oui — ${career.specialistTitle} (${career.specialistCountry}, ${career.specialistYear})`
            : career.specialistStatus === 'in_progress' ? `En cours — ${career.specialistTitle} (prévu ${career.specialistExpectedYear})`
            : 'Non'
          } />
          {career.currentJobTitle && <LabelValue label="Poste actuel" value={`${career.currentJobTitle}${career.currentEstablishment ? ` — ${career.currentEstablishment}` : ''}`} />}
          {career.desiredArrivalDate && <LabelValue label="Arrivée souhaitée" value={career.desiredArrivalDate} />}
        </div>
        {cantonLabels.length > 0 && (
          <div className="mt-3">
            <span className="text-xs text-gray-400">Cantons ciblés</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {cantonLabels.map(c => (
                <span key={c} className="px-2 py-0.5 bg-install-bg text-install text-xs rounded-full font-medium">{c}</span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Documents */}
      <Card className="mb-4">
        <SectionHeader title="Documents" onEdit={() => onEditPhase(3)} />
        <div className="flex flex-wrap gap-3 mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
            ✅ {docCounts.has} prêts
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
            📋 {docCounts.missing} à obtenir
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-install-bg text-install">
            🤝 {docCounts.docstart} DocStart
          </span>
        </div>
        {docStartDocs.length > 0 && (
          <div className="p-3 bg-install-bg/30 rounded-lg">
            <span className="text-xs font-medium text-install">Délégués à DocStart :</span>
            <ul className="mt-1">
              {docStartDocs.map(d => (
                <li key={d.id} className="text-xs text-gray-600">• {d.name}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Service */}
      <Card className="mb-6">
        <SectionHeader title="Niveau de service" onEdit={() => onEditPhase(4)} />
        {selectedPlan && (
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="flex-1">
              <div className="text-sm font-bold">{selectedPlan.name}</div>
              <div className="text-xs text-gray-500">{selectedPlan.description}</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold">{selectedPlan.price}</div>
              <div className="text-xs text-gray-400">{selectedPlan.currency}</div>
            </div>
          </div>
        )}
        {service.includeMebekoTaxes && (
          <p className="mt-2 text-xs text-gray-500">+ Taxes MEBEKO incluses</p>
        )}
      </Card>

      <Button variant="install" onClick={handleSubmit} fullWidth icon={<Icon.Check size={16} />} size="large">
        Valider et envoyer mon dossier
      </Button>
    </div>
  );
}
