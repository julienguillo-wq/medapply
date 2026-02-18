import { useOutletContext } from 'react-router-dom';
import Card from '../../components/Card';
import { Icon } from '../../components/Icons';
import ResourceCard from '../../components/ResourceCard';
import TipCard from '../../components/TipCard';

const SECTIONS = [
  {
    id: 'healthInsurance',
    title: 'Assurance maladie',
    subtitle: 'Obligatoire dans les 3 mois suivant votre arrivée',
    icon: Icon.ShieldCheck,
    iconBg: 'bg-red-100',
    iconText: 'text-red-600',
    resources: [
      { name: 'Comparis.ch', description: 'Comparez les primes d\'assurance maladie', url: 'https://www.comparis.ch/krankenkassen', iconBg: 'bg-orange-100', iconText: 'text-orange-600' },
      { name: 'Priminfo.admin.ch', description: 'Portail officiel des primes LAMal', url: 'https://www.priminfo.admin.ch', iconBg: 'bg-blue-100', iconText: 'text-blue-600' },
    ],
    tip: 'Comparez les primes, elles varient énormément par canton. La franchise la plus haute (2\'500 CHF) réduit vos primes mensuelles.',
  },
  {
    id: 'bankAccount',
    title: 'Compte bancaire',
    subtitle: 'Nécessaire pour recevoir votre salaire',
    icon: Icon.CreditCard,
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600',
    resources: [
      { name: 'PostFinance', description: 'Banque postale suisse — simple et accessible', url: 'https://www.postfinance.ch', iconBg: 'bg-yellow-100', iconText: 'text-yellow-600' },
      { name: 'Neon', description: 'Néobanque suisse gratuite', url: 'https://www.neon-free.ch', iconBg: 'bg-cyan-100', iconText: 'text-cyan-600' },
      { name: 'UBS', description: 'Grande banque suisse traditionnelle', url: 'https://www.ubs.com/ch', iconBg: 'bg-red-100', iconText: 'text-red-600' },
      { name: 'Revolut', description: 'Banque en ligne internationale', url: 'https://www.revolut.com', iconBg: 'bg-violet-100', iconText: 'text-violet-600' },
    ],
    tip: 'PostFinance et Neon sont les plus simples pour commencer. L\'ouverture de compte peut se faire en ligne.',
  },
  {
    id: 'phoneSubscription',
    title: 'Téléphonie / Internet',
    subtitle: 'Abonnement mobile et internet fixe',
    icon: Icon.Phone,
    iconBg: 'bg-indigo-100',
    iconText: 'text-indigo-600',
    resources: [
      { name: 'Swisscom', description: 'Opérateur historique suisse', url: 'https://www.swisscom.ch', iconBg: 'bg-blue-100', iconText: 'text-blue-600' },
      { name: 'Salt', description: 'Forfaits compétitifs', url: 'https://www.salt.ch', iconBg: 'bg-green-100', iconText: 'text-green-600' },
      { name: 'Sunrise', description: 'Deuxième opérateur suisse', url: 'https://www.sunrise.ch', iconBg: 'bg-amber-100', iconText: 'text-amber-600' },
      { name: 'Wingo', description: 'Low-cost par Swisscom', url: 'https://www.wingo.ch', iconBg: 'bg-pink-100', iconText: 'text-pink-600' },
    ],
    tip: null,
  },
  {
    id: 'halfFare',
    title: 'Transports',
    subtitle: 'Abonnements CFF et transports publics',
    icon: Icon.Map,
    iconBg: 'bg-purple-100',
    iconText: 'text-purple-600',
    resources: [
      { name: 'CFF (SBB)', description: 'Chemins de fer fédéraux — demi-tarif et AG', url: 'https://www.sbb.ch', iconBg: 'bg-red-100', iconText: 'text-red-600' },
    ],
    tip: 'Le demi-tarif à 185 CHF/an est indispensable. Il divise par deux le prix de tous les transports publics en Suisse. L\'abonnement général (AG) est rentable si vous voyagez quotidiennement.',
  },
];

export default function PratiquePage() {
  const { state, update } = useOutletContext();
  const pratique = state.pratique;

  const handleToggle = (field) => {
    update('pratique', { ...pratique, [field]: !pratique[field] });
  };

  const completedCount = Object.values(pratique).filter(Boolean).length;
  const totalCount = Object.keys(pratique).length;

  return (
    <div className="animate-fade">
      <div className="mb-8">
        <h1 className="text-2xl md:text-[28px] font-bold tracking-tight mb-2">Vie pratique</h1>
        <p className="text-gray-500 text-[15px]">Les dernières démarches pour votre installation en Suisse</p>
      </div>

      {/* Progress summary */}
      <Card className="mb-8 animate-slide">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-600">Démarches complétées</div>
            <div className="text-2xl font-bold mt-1">{completedCount}<span className="text-gray-400 text-lg font-normal">/{totalCount}</span></div>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-install-bg flex items-center justify-center relative">
            <svg className="absolute inset-0" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="#CCFBF1" strokeWidth="4" />
              <circle
                cx="32" cy="32" r="28"
                fill="none" stroke="#0D9488" strokeWidth="4"
                strokeDasharray={`${(completedCount / totalCount) * 175.9} 175.9`}
                strokeLinecap="round"
                transform="rotate(-90 32 32)"
                className="transition-all duration-500"
              />
            </svg>
            <span className="text-sm font-bold text-install">{Math.round((completedCount / totalCount) * 100)}%</span>
          </div>
        </div>
      </Card>

      {/* Sections */}
      <div className="space-y-6">
        {SECTIONS.map((section) => {
          const SectionIcon = section.icon;
          const isChecked = pratique[section.id];

          return (
            <Card key={section.id} className="animate-slide">
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-11 h-11 rounded-xl ${section.iconBg} ${section.iconText} flex items-center justify-center flex-shrink-0`}>
                  <SectionIcon size={22} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">{section.title}</h2>
                    <button
                      onClick={() => handleToggle(section.id)}
                      className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-install border-install text-white'
                          : 'border-gray-300 hover:border-install'
                      }`}
                    >
                      {isChecked && <Icon.Check size={14} />}
                    </button>
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">{section.subtitle}</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                {section.resources.map((res) => (
                  <ResourceCard key={res.name} {...res} />
                ))}
              </div>

              {section.tip && (
                <TipCard>{section.tip}</TipCard>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
