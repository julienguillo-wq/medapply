import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Icon } from './Icons';
import UserMenu from './UserMenu';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: Icon.Home },
  { to: '/profil', label: 'Profil', icon: Icon.User },
  { to: '/cv', label: 'CV', icon: Icon.FileText },
  { to: '/parcours', label: 'Parcours', icon: Icon.Activity },
  { to: '/documents', label: 'Documents', icon: Icon.File },
  { to: '/recherche', label: 'Recherche', icon: Icon.Map },
  { to: '/candidatures', label: 'Candidatures', icon: Icon.Send },
  { to: '/campagnes', label: 'Campagnes', icon: Icon.Layers },
];

const W_COLLAPSED = 64;
const W_EXPANDED = 240;

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  const expanded = hovered;

  return (
    <>
      {/* Backdrop (mobile only) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden animate-fade"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ width: expanded ? W_EXPANDED : W_COLLAPSED }}
        className={`
          h-screen fixed left-0 top-0 bg-white border-r border-gray-200 py-7 flex flex-col z-50
          transition-[width] duration-200 ease-in-out overflow-hidden
          ${mobileOpen ? 'translate-x-0 !w-[240px]' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        {/* Logo */}
        <div className={`flex items-center ${expanded ? 'justify-between px-5' : 'justify-center'} mb-10`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary-dark rounded-[10px] flex items-center justify-center shadow-[0_4px_12px_rgba(0,102,255,0.3)] shrink-0">
              <span className="text-white font-bold text-base">M</span>
            </div>
            {expanded && <span className="font-bold text-xl tracking-tight whitespace-nowrap">MedApply</span>}
          </div>
          {/* Close button mobile */}
          <button
            onClick={onMobileClose}
            className="md:hidden p-2 -mr-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <Icon.X size={20} />
          </button>
        </div>

        {/* Mode switch */}
        <button
          onClick={() => navigate('/mode')}
          className={`flex items-center gap-2 ${expanded ? 'px-4 mx-3' : 'justify-center mx-2'} py-2.5 mb-4 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer`}
        >
          <Icon.ChevronRight size={14} className="rotate-180 shrink-0" />
          {expanded && <span className="whitespace-nowrap">Changer de mode</span>}
        </button>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onMobileClose}
                title={!expanded ? item.label : undefined}
                className={({ isActive }) =>
                  `w-full flex items-center ${expanded ? 'gap-3.5 px-4 mx-0' : 'justify-center mx-0'} py-3.5 mb-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${expanded ? 'mx-3' : 'mx-2'} ${
                    isActive
                      ? 'bg-primary-bg text-primary font-semibold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                <IconComponent size={20} className="shrink-0" />
                {expanded && <span className="whitespace-nowrap">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* User menu */}
        {expanded ? (
          <div className="px-3">
            <UserMenu />
          </div>
        ) : (
          <div className="flex justify-center">
            <UserMenu collapsed />
          </div>
        )}
      </aside>
    </>
  );
}
