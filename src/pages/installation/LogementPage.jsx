import { useOutletContext } from 'react-router-dom';
import Card from '../../components/Card';
import { Icon } from '../../components/Icons';
import ResourceCard from '../../components/ResourceCard';
import TipCard from '../../components/TipCard';
import StepChecklist from '../../components/StepChecklist';

const HOUSING_SITES = [
  { name: 'Homegate.ch', description: 'Le plus grand portail immobilier de Suisse', url: 'https://www.homegate.ch', iconBg: 'bg-red-100', iconText: 'text-red-600' },
  { name: 'ImmoScout24.ch', description: 'Annonces immobilieres dans toute la Suisse', url: 'https://www.immoscout24.ch', iconBg: 'bg-blue-100', iconText: 'text-blue-600' },
  { name: 'Comparis.ch/immobilier', description: 'Comparateur et annonces immobilieres', url: 'https://www.comparis.ch/immobilien', iconBg: 'bg-orange-100', iconText: 'text-orange-600' },
  { name: 'Anibis.ch', description: 'Petites annonces — logements entre particuliers', url: 'https://www.anibis.ch/fr/immobilier', iconBg: 'bg-purple-100', iconText: 'text-purple-600' },
];

const BUDGET_DATA = [
  { city: 'Zurich', range: '2\'000 – 2\'500 CHF', level: 'high' },
  { city: 'Geneve', range: '1\'800 – 2\'400 CHF', level: 'high' },
  { city: 'Lausanne', range: '1\'800 – 2\'200 CHF', level: 'medium' },
  { city: 'Berne', range: '1\'500 – 1\'900 CHF', level: 'medium' },
  { city: 'Bale', range: '1\'600 – 2\'000 CHF', level: 'medium' },
  { city: 'Lucerne', range: '1\'600 – 2\'000 CHF', level: 'medium' },
  { city: 'Fribourg', range: '1\'300 – 1\'700 CHF', level: 'low' },
  { city: 'Sion', range: '1\'200 – 1\'500 CHF', level: 'low' },
];

const LEVEL_COLORS = {
  high: 'bg-red-50 text-red-600',
  medium: 'bg-amber-50 text-amber-600',
  low: 'bg-emerald-50 text-emerald-600',
};

export default function LogementPage() {
  const { state, update } = useOutletContext();
  const logement = state.logement;

  const handleToggle = (field) => {
    update('logement', { ...logement, [field]: !logement[field] });
  };

  const checklistItems = [
    { id: 'housingFound', label: 'Logement trouve', checked: logement.housingFound },
    { id: 'leaseSigned', label: 'Bail signe', checked: logement.leaseSigned },
    { id: 'addressRegistered', label: 'Adresse enregistree en commune (controle des habitants)', checked: logement.addressRegistered },
  ];

  return (
    <div className="animate-fade">
      <div className="mb-8">
        <h1 className="text-2xl md:text-[28px] font-bold tracking-tight mb-2">Logement</h1>
        <p className="text-gray-500 text-[15px]">Trouvez votre logement et preparez votre installation</p>
      </div>

      {/* Section 1: Sites de recherche */}
      <h2 className="text-base font-semibold mb-4">Recherche de logement</h2>
      <div className="grid sm:grid-cols-2 gap-3 mb-8">
        {HOUSING_SITES.map((site) => (
          <ResourceCard key={site.name} {...site} />
        ))}
      </div>

      {/* Section 2: Budget moyen */}
      <Card className="mb-6 animate-slide">
        <h2 className="text-base font-semibold mb-1">Budget moyen par ville</h2>
        <p className="text-sm text-gray-400 mb-4">Loyer mensuel pour un 2-3 pieces</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {BUDGET_DATA.map((item) => (
            <div key={item.city} className={`p-3 rounded-xl text-center ${LEVEL_COLORS[item.level]}`}>
              <div className="text-xs font-medium opacity-70">{item.city}</div>
              <div className="text-sm font-bold mt-0.5">{item.range}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Conseils */}
      <div className="space-y-3 mb-8">
        <TipCard>
          <strong>Dossier de candidature locatif :</strong> Preparez un extrait de l'Office des poursuites, une attestation de salaire (ou contrat de travail), une copie de votre piece d'identite et une lettre de motivation.
        </TipCard>
        <TipCard variant="warning">
          Commencez vos recherches <strong>2-3 mois avant</strong> votre date d'arrivee prevue. Le marche est tres tendu dans les grandes villes.
        </TipCard>
      </div>

      {/* Section 3: Checklist */}
      <Card className="animate-slide">
        <h2 className="text-base font-semibold mb-4">Votre suivi</h2>
        <StepChecklist
          items={checklistItems}
          onToggle={(id) => handleToggle(id)}
        />
      </Card>
    </div>
  );
}
