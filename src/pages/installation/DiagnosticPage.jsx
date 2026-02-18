import { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { Icon } from '../../components/Icons';

const NATIONALITIES = [
  'Allemagne', 'Autriche', 'Belgique', 'Bulgarie', 'Chypre', 'Croatie', 'Danemark',
  'Espagne', 'Estonie', 'Finlande', 'France', 'Grèce', 'Hongrie', 'Irlande',
  'Italie', 'Lettonie', 'Lituanie', 'Luxembourg', 'Malte', 'Pays-Bas', 'Pologne',
  'Portugal', 'République tchèque', 'Roumanie', 'Slovaquie', 'Slovénie', 'Suède',
  'Islande', 'Liechtenstein', 'Norvège',
  '---',
  'Afghanistan', 'Algérie', 'Argentine', 'Australie', 'Brésil', 'Cameroun', 'Canada',
  'Chine', 'Colombie', 'Égypte', 'États-Unis', 'Inde', 'Irak', 'Iran', 'Israël',
  'Japon', 'Liban', 'Libye', 'Maroc', 'Mexique', 'Nigeria', 'Pakistan', 'Pérou',
  'Russie', 'Sénégal', 'Syrie', 'Tunisie', 'Turquie', 'Ukraine', 'Vietnam',
  'Autre',
];

const SPECIALTIES = [
  'Allergologie et immunologie clinique', 'Anesthésiologie', 'Angiologie',
  'Cardiologie', 'Chirurgie', 'Chirurgie cardiaque et vasculaire thoracique',
  'Chirurgie orale et maxillo-faciale', 'Chirurgie orthopédique et traumatologie',
  'Chirurgie pédiatrique', 'Chirurgie plastique, reconstructive et esthétique',
  'Dermatologie et vénéréologie', 'Endocrinologie-diabétologie',
  'Gastroentérologie', 'Génétique médicale', 'Gériatrie', 'Gynécologie et obstétrique',
  'Hématologie', 'Infectiologie', 'Médecine du travail', 'Médecine générale',
  'Médecine intensive', 'Médecine interne générale', 'Médecine légale',
  'Médecine nucléaire', 'Médecine pharmaceutique', 'Médecine physique et réadaptation',
  'Médecine tropicale et médecine des voyages', 'Néphrologie', 'Neurochirurgie',
  'Neurologie', 'Neuropathologie', 'Oncologie médicale',
  'Ophtalmologie', 'Oto-rhino-laryngologie', 'Pathologie',
  'Pédiatrie', 'Pharmacologie et toxicologie cliniques', 'Pneumologie',
  'Psychiatrie et psychothérapie', 'Psychiatrie et psychothérapie d\'enfants et d\'adolescents',
  'Radiologie', 'Radio-oncologie / radiothérapie', 'Rhumatologie',
  'Urologie',
  'Pas encore de spécialité',
];

const EU_COUNTRIES = [
  'Allemagne', 'Autriche', 'Belgique', 'Bulgarie', 'Chypre', 'Croatie', 'Danemark',
  'Espagne', 'Estonie', 'Finlande', 'France', 'Grèce', 'Hongrie', 'Irlande',
  'Italie', 'Lettonie', 'Lituanie', 'Luxembourg', 'Malte', 'Pays-Bas', 'Pologne',
  'Portugal', 'République tchèque', 'Roumanie', 'Slovaquie', 'Slovénie', 'Suède',
  'Islande', 'Liechtenstein', 'Norvège',
];

const QUESTIONS = [
  { key: 'nationality', label: 'Quelle est votre nationalité ?', type: 'select', options: NATIONALITIES },
  { key: 'diplomaCountry', label: 'Dans quel pays avez-vous obtenu votre diplôme de médecine ?', type: 'select', options: NATIONALITIES },
  { key: 'diplomaYear', label: 'Année d\'obtention du diplôme', type: 'select', options: Array.from({ length: 30 }, (_, i) => String(2025 - i)) },
  { key: 'specialty', label: 'Quelle est votre spécialité (ou spécialité visée) ?', type: 'select', options: SPECIALTIES },
  { key: 'hasSpecialistTitle', label: 'Avez-vous un titre de spécialiste ?', type: 'choice', options: [{ value: true, label: 'Oui' }, { value: false, label: 'Non' }] },
];

function generateResult(data) {
  const isEU = EU_COUNTRIES.includes(data.nationality);
  const isDiplomaEU = EU_COUNTRIES.includes(data.diplomaCountry);

  const procedure = isEU && isDiplomaEU
    ? 'Reconnaissance directe (voie UE/AELE)'
    : 'Examen fédéral de médecine humaine (voie hors-UE)';

  const delay = isEU && isDiplomaEU ? '3-4 mois' : '6-12 mois';
  const cost = isEU && isDiplomaEU ? '800 CHF' : '1\'500-5\'000 CHF';

  const docs = [
    'Diplôme de médecine (copie certifiée conforme)',
    !['France', 'Allemagne', 'Italie', 'Autriche'].includes(data.diplomaCountry) && 'Traduction certifiée du diplôme',
    data.hasSpecialistTitle && 'Titre de spécialiste (copie certifiée conforme)',
    data.hasSpecialistTitle && !['France', 'Allemagne', 'Italie', 'Autriche'].includes(data.diplomaCountry) && 'Traduction du titre de spécialiste',
    'Certificate of Good Standing',
    isEU && isDiplomaEU && 'Attestation de conformité EU',
    'Pièce d\'identité / passeport',
    'Photo d\'identité',
    'CV médical',
    'Formulaire de demande MEBEKO',
  ].filter(Boolean);

  return { procedure, delay, cost, docs, isEU: isEU && isDiplomaEU };
}

// Mock pre-filled data: Dr. Marco Bianchi
const MOCK_DATA = {
  nationality: 'Italie',
  diplomaCountry: 'Italie',
  diplomaYear: '2019',
  specialty: 'Médecine interne générale',
  hasSpecialistTitle: false,
  specialistCountry: '',
};

export default function DiagnosticPage() {
  const { state, update } = useOutletContext();
  const navigate = useNavigate();
  const diag = state.diagnostic;

  const [step, setStep] = useState(diag.completed ? 'result' : 0);
  const [data, setData] = useState({ ...MOCK_DATA, ...diag.data });
  const [result, setResult] = useState(diag.result);

  const currentQ = typeof step === 'number' ? QUESTIONS[step] : null;

  // Skip specialist country question if no specialist title
  const totalSteps = QUESTIONS.length;

  const handleAnswer = (value) => {
    const newData = { ...data, [currentQ.key]: value };
    setData(newData);

    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      // Generate result
      const res = generateResult(newData);
      setResult(res);
      setStep('result');
      update('diagnostic', { completed: true, data: newData, result: res });
    }
  };

  const handleBack = () => {
    if (step === 'result') {
      setStep(totalSteps - 1);
    } else if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleReset = () => {
    setStep(0);
    setData(MOCK_DATA);
    setResult(null);
    update('diagnostic', { completed: false, data: MOCK_DATA, result: null });
  };

  return (
    <div className="animate-fade">
      <div className="mb-8">
        <h1 className="text-2xl md:text-[28px] font-bold tracking-tight mb-2">Diagnostic d'éligibilité</h1>
        <p className="text-gray-500 text-[15px]">Répondez à quelques questions pour déterminer votre parcours de reconnaissance</p>
      </div>

      {step === 'result' && result ? (
        <ResultView result={result} data={data} onReset={handleReset} onContinue={() => navigate('/installation/mebeko')} />
      ) : (
        <WizardView
          currentQ={currentQ}
          step={step}
          totalSteps={totalSteps}
          data={data}
          onAnswer={handleAnswer}
          onBack={handleBack}
        />
      )}
    </div>
  );
}

function WizardView({ currentQ, step, totalSteps, data, onAnswer, onBack }) {
  return (
    <div className="max-w-lg">
      {/* Progress */}
      <div className="flex items-center gap-3 mb-8">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < step ? 'bg-install' : i === step ? 'bg-install-light' : 'bg-gray-200'
            }`}
          />
        ))}
        <span className="text-xs text-gray-400 flex-shrink-0">{step + 1}/{totalSteps}</span>
      </div>

      <Card className="animate-slide">
        <h2 className="text-lg font-semibold mb-6">{currentQ.label}</h2>

        {currentQ.type === 'select' && (
          <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto">
            {currentQ.options.map((opt) => {
              if (opt === '---') return <hr key="sep" className="my-2 border-gray-200" />;
              const isSelected = data[currentQ.key] === opt;
              return (
                <button
                  key={opt}
                  onClick={() => onAnswer(opt)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-install-bg text-install border border-install/30'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {currentQ.type === 'choice' && (
          <div className="flex gap-3">
            {currentQ.options.map((opt) => {
              const isSelected = data[currentQ.key] === opt.value;
              return (
                <button
                  key={String(opt.value)}
                  onClick={() => onAnswer(opt.value)}
                  className={`flex-1 px-6 py-4 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-install-bg text-install border-2 border-install'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}

        {step > 0 && (
          <button
            onClick={onBack}
            className="mt-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <Icon.ChevronRight size={14} className="rotate-180" />
            Question précédente
          </button>
        )}
      </Card>
    </div>
  );
}

function ResultView({ result, data, onReset, onContinue }) {
  return (
    <div className="max-w-2xl">
      <Card className="animate-slide mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${result.isEU ? 'bg-install-bg text-install' : 'bg-warning-bg text-warning'}`}>
            <Icon.ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold">Votre diagnostic</h2>
            <p className="text-sm text-gray-500">Basée sur vos réponses</p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Procédure</div>
            <div className="text-sm font-semibold">{result.procedure}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Délai estimé</div>
            <div className="text-sm font-semibold">{result.delay}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Coût MEBEKO</div>
            <div className="text-sm font-semibold">{result.cost}</div>
          </div>
        </div>

        {/* Profile recap */}
        <div className="p-4 bg-install-bg/30 rounded-xl mb-6">
          <div className="text-xs font-bold text-install uppercase tracking-wide mb-3">Votre profil</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-500">Nationalité :</span> <strong>{data.nationality}</strong></div>
            <div><span className="text-gray-500">Diplôme :</span> <strong>{data.diplomaCountry}, {data.diplomaYear}</strong></div>
            <div><span className="text-gray-500">Spécialité :</span> <strong>{data.specialty}</strong></div>
            <div><span className="text-gray-500">Titre de spécialiste :</span> <strong>{data.hasSpecialistTitle ? 'Oui' : 'Non'}</strong></div>
          </div>
        </div>

        {/* Documents needed */}
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Documents nécessaires ({result.docs.length})</div>
          <div className="flex flex-col gap-2">
            {result.docs.map((doc, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  {i + 1}
                </div>
                {doc}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={onContinue} icon={<Icon.Arrow size={16} />}>
          Continuer vers le dossier MEBEKO
        </Button>
        <Button variant="ghost" onClick={onReset}>
          Refaire le diagnostic
        </Button>
      </div>
    </div>
  );
}
