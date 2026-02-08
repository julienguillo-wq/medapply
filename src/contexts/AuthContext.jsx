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
    console.log('[AuthContext] loadProfile pour userId:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('[AuthContext] Profil erreur:', error.code, error.message);
        return null;
      }
      console.log('[AuthContext] Profil chargé:', data?.email || data?.id);
      return data;
    } catch (err) {
      console.error('[AuthContext] loadProfile ERREUR:', err.message || err);
      return null;
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      console.log('[AuthContext] initAuth démarré');
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[AuthContext] Erreur getSession:', sessionError.message);
        }

        console.log('[AuthContext] Session:', session ? `trouvée (${session.user.email})` : 'aucune');

        if (session?.user && isMounted) {
          setUser(session.user);
          const profileData = await loadProfile(session.user.id);
          if (isMounted) {
            setProfile(profileData);
          }
        }
      } catch (err) {
        console.error('[AuthContext] Erreur initAuth:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
          console.log('[AuthContext] ✓ loading = false');
        }
      }
    }

    initAuth();

    // Listener uniquement pour SIGNED_OUT et TOKEN_REFRESHED
    // loadProfile n'est JAMAIS appelé ici — seul initAuth le fait
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AuthContext] onAuthStateChange:', event);

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user);
        }
      }
    );

    return () => {
      isMounted = false;
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
