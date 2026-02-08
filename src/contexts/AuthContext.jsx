// ============================================================
// Contexte d'authentification pour MedApply
// ============================================================
// Fournit l'état d'authentification et le profil utilisateur
// à toute l'application React via React Context
// ============================================================

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

// Hook personnalisé pour accéder au contexte d'auth
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Charger le profil utilisateur depuis la table profiles
  async function loadProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Erreur chargement profil:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error('Erreur inattendue chargement profil:', err);
      return null;
    }
  }

  useEffect(() => {
    // Vérifier la session existante au chargement
    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          const profileData = await loadProfile(session.user.id);
          setProfile(profileData);
        }
      } catch (err) {
        console.error('Erreur initialisation auth:', err);
      } finally {
        setLoading(false);
      }
    }

    initAuth();

    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          const profileData = await loadProfile(session.user.id);
          setProfile(profileData);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user);
        }
      }
    );

    // Nettoyer l'abonnement au démontage
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Déconnexion
  async function signOut() {
    await supabase.auth.signOut();
    // Rediriger vers la page de connexion
    window.location.href = '/login.html';
  }

  // Mettre à jour le profil
  async function updateProfile(updates) {
    if (!user) return { error: 'Non connecté' };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (!error && data) {
      setProfile(data);
    }
    return { data, error };
  }

  const value = {
    user,
    profile,
    loading,
    signOut,
    updateProfile,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
