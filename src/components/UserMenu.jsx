// ============================================================
// Menu utilisateur pour MedApply
// ============================================================
// Affiche les informations de l'utilisateur connecté
// avec menu déroulant (paramètres, déconnexion)
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from './Icons';

export default function UserMenu() {
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Fermer le menu au clic extérieur
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initiales de l'utilisateur pour l'avatar
  const initials = profile
    ? `${(profile.first_name || '')[0] || ''}${(profile.last_name || '')[0] || ''}`.toUpperCase() || '?'
    : '?';

  // Nom au format "Dr. Prénom I."
  const displayName = profile
    ? profile.first_name
      ? `Dr. ${profile.first_name} ${(profile.last_name || '')[0] ? profile.last_name[0].toUpperCase() + '.' : ''}`.trim()
      : profile.email
    : '';

  // Spécialité
  const specialty = profile?.specialty || '';

  // Skeleton de chargement si le profil n'est pas encore chargé
  if (!profile) {
    return (
      <div className="bg-gray-50 rounded-[14px] p-4 flex items-center gap-3 animate-pulse">
        <div className="w-[42px] h-[42px] rounded-full bg-gray-200 shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 bg-gray-200 rounded-md w-28" />
          <div className="h-3 bg-gray-200 rounded-md w-20" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Carte utilisateur cliquable */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="w-full bg-gray-50 hover:bg-gray-100 rounded-[14px] p-4 flex items-center gap-3 transition-colors cursor-pointer text-left"
      >
        <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white font-semibold text-[15px] shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{displayName}</div>
          {specialty && <div className="text-xs text-gray-500 truncate">{specialty}</div>}
        </div>
        <Icon.ChevronDown size={16} className={`text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Menu déroulant */}
      {menuOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-fade z-50">
          <a
            href="/profil"
            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            <Icon.User size={16} />
            <span>Mon profil</span>
          </a>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <Icon.LogOut size={16} />
            <span>Se déconnecter</span>
          </button>
        </div>
      )}
    </div>
  );
}
