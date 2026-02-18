import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';

const modes = [
  {
    id: 'candidatures',
    title: 'Candidatures',
    subtitle: 'Je suis reconnu en Suisse et je cherche un poste',
    IconComp: Icon.Stethoscope,
    gradient: 'from-primary to-primary-dark',
    shadow: 'rgba(0,102,255,0.25)',
    hoverShadow: 'rgba(0,102,255,0.35)',
    bg: 'bg-primary-bg',
    text: 'text-primary',
    path: '/profil',
    features: ['Profil & CV', 'Recherche de postes', 'Candidatures IA', 'Suivi des dossiers'],
  },
  {
    id: 'installation',
    title: "S'installer en Suisse",
    subtitle: 'Je suis médecin étranger et je veux exercer en Suisse',
    IconComp: Icon.Plane,
    gradient: 'from-install to-install-dark',
    shadow: 'rgba(13,148,136,0.25)',
    hoverShadow: 'rgba(13,148,136,0.35)',
    bg: 'bg-install-bg',
    text: 'text-install',
    path: '/installation/diagnostic',
    features: ['Diagnostic MEBEKO', 'Dossier de reconnaissance', 'Test de langue', 'Permis & logement'],
  },
];

export default function ModeSelector() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const firstName = profile?.first_name || '';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl animate-fade">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-11 h-11 bg-gradient-to-br from-primary to-primary-dark rounded-[12px] flex items-center justify-center shadow-[0_4px_14px_rgba(0,102,255,0.3)]">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <span className="font-bold text-2xl tracking-tight">MedApply</span>
        </div>

        {/* Welcome */}
        <div className="text-center mb-10">
          <h1 className="text-[28px] md:text-[32px] font-bold tracking-tight mb-2">
            {firstName ? `Bonjour, ${firstName}` : 'Bienvenue'}
          </h1>
          <p className="text-gray-500 text-[15px]">Que souhaitez-vous faire aujourd'hui ?</p>
        </div>

        {/* Mode cards */}
        <div className="grid md:grid-cols-2 gap-5">
          {modes.map((mode, i) => (
            <button
              key={mode.id}
              onClick={() => navigate(mode.path)}
              className={`text-left p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer group animate-slide delay-${i + 1}`}
            >
              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center mb-5 shadow-[0_4px_14px_${mode.shadow}] group-hover:shadow-[0_6px_20px_${mode.hoverShadow}] transition-shadow`}>
                <mode.IconComp size={26} className="text-white" />
              </div>

              <h2 className="text-lg font-bold mb-1">{mode.title}</h2>
              <p className="text-sm text-gray-500 mb-5">{mode.subtitle}</p>

              {/* Features */}
              <div className="flex flex-col gap-2">
                {mode.features.map((feat) => (
                  <div key={feat} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <div className={`w-5 h-5 rounded-full ${mode.bg} ${mode.text} flex items-center justify-center flex-shrink-0`}>
                      <Icon.Check size={11} />
                    </div>
                    {feat}
                  </div>
                ))}
              </div>

              {/* Arrow */}
              <div className={`mt-6 flex items-center gap-2 text-sm font-semibold ${mode.text} group-hover:gap-3 transition-all`}>
                Commencer
                <Icon.Arrow size={16} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
