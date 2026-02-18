import { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { Icon } from '../../components/Icons';

const NATIONALITIES = [
  'Allemagne', 'Autriche', 'Belgique', 'Bulgarie', 'Chypre', 'Croatie', 'Danemark',
  'Espagne', 'Estonie', 'Finlande', 'France', 'Grece', 'Hongrie', 'Irlande',
  'Italie', 'Lettonie', 'Lituanie', 'Luxembourg', 'Malte', 'Pays-Bas', 'Pologne',
  'Portugal', 'Republique tcheque', 'Roumanie', 'Slovaquie', 'Slovenie', 'Suede',
  'Islande', 'Liechtenstein', 'Norvege',
  '---',
  'Afghanistan', 'Algerie', 'Argentine', 'Australie', 'Bresil', 'Cameroun', 'Canada',
  'Chine', 'Colombie', 'Egypte', 'Etats-Unis', 'Inde', 'Irak', 'Iran', 'Israel',
  'Japon', 'Liban', 'Libye', 'Maroc', 'Mexique', 'Nigeria', 'Pakistan', 'Perou',
  'Russie', 'Senegal', 'Syrie', 'Tunisie', 'Turquie', 'Ukraine', 'Vietnam',
  'Autre',
];

const SPECIALTIES = [
  'Allergologie et immunologie clinique', 'Anesthesiologie', 'Angiologie',
  'Cardiologie', 'Chirurgie', 'Chirurgie cardiaque et vasculaire thoracique',
  'Chirurgie orale et maxillo-faciale', 'Chirurgie orthopedique et traumatologie',
  'Chirurgie pediatrique', 'Chirurgie plastique, reconstructive et esthetique',
  'Dermatologie et venereologie', 'Endocrinologie-diabetologie',
  'Gastroenterologie', 'Genetique medicale', 'Geriatrie', 'Gynecologie et obstetrique',
  'Hematologie', 'Infectiologie', 'Medecine du travail', 'Medecine generale',
  'Medecine intensive', 'Medecine interne generale', 'Medecine legale',
  'Medecine nucleaire', 'Medecine pharmaceutique', 'Medecine physique et readaptation',
  'Medecine tropicale et medecine des voyages', 'Nephrologie', 'Neurochirurgie',
  'Neurologie', 'Neuropathologie', 'Oncologie medicale',
  'Ophtalmologie', 'Oto-rhino-laryngologie', 'Pathologie',
  'Pediatrie', 'Pharmacologie et toxicologie cliniques', 'Pneumologie',
  'Psychiatrie et psychotherapie', 'Psychiatrie et psychotherapie d\'enfants et d\'adolescents',
  'Radiologie', 'Radio-oncologie / radiotherapie', 'Rhumatologie',
  'Urologie',
  'Pas encore de specialite',
];

const EU_COUNTRIES = [
  'Allemagne', 'Autriche', 'Belgique', 'Bulgarie', 'Chypre', 'Croatie', 'Danemark',
  'Espagne', 'Estonie', 'Finlande', 'France', 'Grece', 'Hongrie', 'Irlande',
  'Italie', 'Lettonie', 'Lituanie', 'Luxembourg', 'Malte', 'Pays-Bas', 'Pologne',
  'Portugal', 'Republique tcheque', 'Roumanie', 'Slovaquie', 'Slovenie', 'Suede',
  'Islande', 'Liechtenstein', 'Norvege',
];

const QUESTIONS = [
  { key: 'nationality', label: 'Quelle est votre nationalite ?', type: 'select', options: NATIONALITIES },
  { key: 'diplomaCountry', label: 'Dans quel pays avez-vous obtenu votre diplome de medecine ?', type: 'select', options: NATIONALITIES },
  { key: 'diplomaYear', label: 'Annee d\'obtention du diplome', type: 'select', options: Array.from({ length: 30 }, (_, i) => String(2025 - i)) },
  { key: 'specialty', label: 'Quelle est votre specialite (ou specialite visee) ?', type: 'select', options: SPECIALTIES },
  { key: 'hasSpecialistTitle', label: 'Avez-vous un titre de specialiste ?', type: 'choice', options: [{ value: true, label: 'Oui' }, { value: false, label: 'Non' }] },
];

function generateResult(data) {
  const isEU = EU_COUNTRIES.includes(data.nationality);
  const isDiplomaEU = EU_COUNTRIES.includes(data.diplomaCountry);

  const procedure = isEU && isDiplomaEU
    ? 'Reconnaissance directe (voie UE/AELE)'
    : 'Examen federal de medecine humaine (voie hors-UE)';

  const delay = isEU && isDiplomaEU ? '3-4 mois' : '6-12 mois';
  const cost = isEU && isDiplomaEU ? '800 CHF' : '1\'500-5\'000 CHF';

  const docs = [
    'Diplome de medecine (copie certifiee conforme)',
    !['France', 'Allemagne', 'Italie', 'Autriche'].includes(data.diplomaCountry) && 'Traduction certifiee du diplome',
    data.hasSpecialistTitle && 'Titre de specialiste (copie certifiee conforme)',
    data.hasSpecialistTitle && !['France', 'Allemagne', 'Italie', 'Autriche'].includes(data.diplomaCountry) && 'Traduction du titre de specialiste',
    'Certificate of Good Standing',
    isEU && isDiplomaEU && 'Attestation de conformite EU',
    'Piece d\'identite / passeport',
    'Photo d\'identite',
    'CV medical',
    'Formulaire de demande MEBEKO',
  ].filter(Boolean);

  return { procedure, delay, cost, docs, isEU: isEU && isDiplomaEU };
}

// Mock pre-filled data: Dr. Marco Bianchi
const MOCK_DATA = {
  nationality: 'Italie',
  diplomaCountry: 'Italie',
  diplomaYear: '2019',
  specialty: 'Medecine interne generale',
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
        <h1 className="text-2xl md:text-[28px] font-bold tracking-tight mb-2">Diagnostic d'eligibilite</h1>
        <p className="text-gray-500 text-[15px]">Repondez a quelques questions pour determiner votre parcours de reconnaissance</p>
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
            Question precedente
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
            <p className="text-sm text-gray-500">Basee sur vos reponses</p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Procedure</div>
            <div className="text-sm font-semibold">{result.procedure}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Delai estime</div>
            <div className="text-sm font-semibold">{result.delay}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Cout MEBEKO</div>
            <div className="text-sm font-semibold">{result.cost}</div>
          </div>
        </div>

        {/* Profile recap */}
        <div className="p-4 bg-install-bg/30 rounded-xl mb-6">
          <div className="text-xs font-bold text-install uppercase tracking-wide mb-3">Votre profil</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-500">Nationalite :</span> <strong>{data.nationality}</strong></div>
            <div><span className="text-gray-500">Diplome :</span> <strong>{data.diplomaCountry}, {data.diplomaYear}</strong></div>
            <div><span className="text-gray-500">Specialite :</span> <strong>{data.specialty}</strong></div>
            <div><span className="text-gray-500">Titre de specialiste :</span> <strong>{data.hasSpecialistTitle ? 'Oui' : 'Non'}</strong></div>
          </div>
        </div>

        {/* Documents needed */}
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Documents necessaires ({result.docs.length})</div>
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
