// ============================================================
// Garde d'authentification pour MedApply
// ============================================================
// Protège les routes : redirige vers /login.html si non connecté
// Affiche un écran de chargement pendant la vérification
// ============================================================

import { useAuth } from '../contexts/AuthContext';

export default function AuthGuard({ children }) {
  const { isAuthenticated, loading } = useAuth();

  // Afficher un écran de chargement pendant la vérification de la session
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm font-medium">Chargement...</span>
          </div>
        </div>
      </div>
    );
  }

  // Si non authentifié, rediriger vers la page de connexion
  if (!isAuthenticated) {
    window.location.href = '/login.html';
    return null;
  }

  // Utilisateur authentifié : afficher le contenu protégé
  return children;
}
