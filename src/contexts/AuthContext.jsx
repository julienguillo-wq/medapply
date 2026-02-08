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
    console.log('[AuthContext] loadProfile START pour userId:', userId);
    try {
      const query = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('[AuthContext] requête Supabase lancée, en attente de réponse...');

      // Timeout de 5s sur la requête elle-même
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('loadProfile timeout après 5s')), 5000)
      );

      const { data, error } = await Promise.race([query, timeout]);

      console.log('[AuthContext] requête Supabase terminée :', { data, error });

      if (error) {
        console.warn('[AuthContext] Profil non trouvé ou erreur:', error.code, error.message);
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

    // Vérifier la session existante au chargement
    async function initAuth() {
      console.log('[AuthContext] initAuth démarré');
      try {
        console.log('[AuthContext] Appel getSession...');
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
        console.log('[AuthContext] initAuth terminé → loading = false');
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    // Safety timeout : si initAuth prend plus de 10s, forcer loading à false
    const safetyTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('[AuthContext] ⚠️ Safety timeout (10s) — loading forcé à false');
        setLoading(false);
      }
    }, 10000);

    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] onAuthStateChange:', event, session?.user?.email);

        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          if (isMounted) {
            setUser(session.user);
            const profileData = await loadProfile(session.user.id);
            if (isMounted) {
              setProfile(profileData);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setUser(null);
            setProfile(null);
          }
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          if (isMounted) {
            setUser(session.user);
          }
        }
      }
    );

    // Nettoyer l'abonnement au démontage
    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
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
