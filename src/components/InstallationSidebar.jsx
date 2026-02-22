import { NavLink, useNavigate } from 'react-router-dom';
import { Icon } from './Icons';
import UserMenu from './UserMenu';
import ProgressTracker from './ProgressTracker';

const navItems = [
  { to: '/installation/diagnostic', label: 'Diagnostic', icon: Icon.MessageCircle, step: 'diagnostic' },
  { to: '/installation/mebeko', label: 'Dossier MEBEKO', icon: Icon.FileText, step: 'mebeko' },
  { to: '/installation/langue', label: 'Test de langue', icon: Icon.Globe, step: 'langue' },
  { to: '/installation/permis', label: 'Permis de travail', icon: Icon.Key, step: 'permis' },
  { to: '/installation/logement', label: 'Logement', icon: Icon.Home, step: 'logement' },
  { to: '/installation/pratique', label: 'Vie pratique', icon: Icon.Heart, step: 'pratique' },
];

const statusIcons = {
  completed: { icon: Icon.Check, bg: 'bg-install text-white', ring: '' },
  in_progress: { icon: null, bg: 'bg-install-bg text-install', ring: 'ring-2 ring-install' },
  todo: { icon: null, bg: 'bg-gray-100 text-gray-400', ring: '' },
};

export default function InstallationSidebar({ open, onClose, stepStatuses, progress }) {
  const navigate = useNavigate();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden animate-fade"
          onClick={onClose}
        />
      )}

      <aside className={`
        w-[260px] h-screen fixed left-0 top-0 bg-white border-r border-gray-200 px-5 py-7 flex flex-col z-50
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        {/* Logo + back + close */}
        <div className="flex items-center justify-between px-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-install to-install-dark rounded-[10px] flex items-center justify-center shadow-[0_4px_12px_rgba(13,148,136,0.3)]">
              <span className="text-white font-bold text-base">M</span>
            </div>
            <span className="font-bold text-xl tracking-tight">MedApply</span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-2 -mr-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <Icon.X size={20} />
          </button>
        </div>

        {/* Mode switch */}
        <button
          onClick={() => navigate('/mode')}
          className="flex items-center gap-2 px-4 py-2.5 mb-4 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
        >
          <Icon.ChevronRight size={14} className="rotate-180" />
          Changer de mode
        </button>

        {/* Progress */}
        <div className="px-3 mb-6">
          <ProgressTracker value={progress} label="Progression globale" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto">
          {navItems.map((item, i) => {
            const status = stepStatuses?.[item.step] || 'todo';
            const statusCfg = statusIcons[status];
            const StatusIcon = statusCfg.icon;
            const IconComponent = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3.5 px-4 py-3.5 mb-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-install-bg text-install font-semibold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                <div className="relative flex-shrink-0">
                  <IconComponent size={20} />
                  {/* Status dot */}
                  <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center ${statusCfg.bg} ${statusCfg.ring}`}>
                    {StatusIcon && <StatusIcon size={8} />}
                  </div>
                </div>
                <span className="flex-1">{item.label}</span>
                <span className="text-[10px] text-gray-400 font-normal">{i + 1}/6</span>
              </NavLink>
            );
          })}
        </nav>

        <UserMenu />
      </aside>
    </>
  );
}
