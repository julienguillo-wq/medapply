import { NavLink } from 'react-router-dom';
import { Icon } from './Icons';
import UserMenu from './UserMenu';

const navItems = [
  { to: '/profil', label: 'Profil', icon: Icon.User },
  { to: '/cv', label: 'CV', icon: Icon.FileText },
  { to: '/parcours', label: 'Parcours', icon: Icon.Activity },
  { to: '/documents', label: 'Documents', icon: Icon.File },
  { to: '/recherche', label: 'Recherche', icon: Icon.Map },
  { to: '/candidatures', label: 'Candidatures', icon: Icon.Send },
  { to: '/tableau-de-bord', label: 'Tableau de bord', icon: Icon.Grid },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Backdrop (mobile only) */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden animate-fade"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        w-[260px] h-screen fixed left-0 top-0 bg-white border-r border-gray-200 px-5 py-7 flex flex-col z-50
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        {/* Logo + close on mobile */}
        <div className="flex items-center justify-between px-3 mb-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary-dark rounded-[10px] flex items-center justify-center shadow-[0_4px_12px_rgba(0,102,255,0.3)]">
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

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3.5 px-4 py-3.5 mb-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-bg text-primary font-semibold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                <IconComponent size={20} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Menu utilisateur (remplace la carte statique) */}
        <UserMenu />
      </aside>
    </>
  );
}
