import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from './Icons';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 md:ml-[260px] flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center shadow-[0_2px_8px_rgba(0,102,255,0.25)]">
                <span className="text-white font-bold text-xs">M</span>
              </div>
              <span className="font-bold text-base tracking-tight">MedApply</span>
            </div>
          </div>

          {/* Bouton déconnexion mobile */}
          <button
            onClick={signOut}
            className="p-2 -mr-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
            title="Se déconnecter"
          >
            <Icon.LogOut size={20} />
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 md:px-14 md:py-10 max-w-[1100px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
