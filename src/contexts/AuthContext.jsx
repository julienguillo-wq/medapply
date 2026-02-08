// ============================================================
// Contexte d'authentification pour MedApply
// ============================================================
// Fournit l'état d'authentification et le profil utilisateur
// à toute l'application React via React Context
// ============================================================

import { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  const profilePromiseRef = useRef(null);

  // Charger le profil — dédupliqué : si un appel est déjà en cours, retourne la même promesse
  function loadProfile(userId) {
    if (profilePromiseRef.current) {
      console.log('[AuthContext] loadProfile déjà en cours → réutilisation promesse existante');
      return profilePromiseRef.current;
    }

    console.log('[AuthContext] loadProfile START pour userId:', userId);

    const promise = (async () => {
      try {
        const query = supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        console.log('[AuthContext] requête Supabase lancée...');

        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('loadProfile timeout après 15s')), 15000)
        );

        const { data, error } = await Promise.race([query, timeout]);

        console.log('[AuthContext] requête Supabase terminée :', { data, error });

        if (error) {
          console.warn('[AuthContext] Profil erreur:', error.code, error.message);
          return null;
        }
        console.log('[AuthContext] Profil chargé:', data?.email || data?.id);
        return data;
      } catch (err) {
        console.error('[AuthContext] loadProfile ERREUR:', err.message || err);
        return null;
      } finally {
        profilePromiseRef.current = null;
      }
    })();

    profilePromiseRef.current = promise;
    return promise;
  }

  useEffect(() => {
    let isMounted = true;

    // Gérer un utilisateur authentifié (appelé par initAuth ou onAuthStateChange)
    async function handleUser(sessionUser) {
      setUser(sessionUser);
      const profileData = await loadProfile(sessionUser.id);
      if (isMounted) {
        setProfile(profileData);
        setLoading(false);
        console.log('[AuthContext] ✓ État final : user OK, profile', profileData ? 'OK' : 'null', ', loading = false');
      }
    }

    async function initAuth() {
      console.log('[AuthContext] initAuth démarré');
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[AuthContext] Erreur getSession:', sessionError.message);
        }

        console.log('[AuthContext] Session:', session ? `trouvée (${session.user.email})` : 'aucune');

        if (session?.user && isMounted) {
          await handleUser(session.user);
        } else if (isMounted) {
          console.log('[AuthContext] Pas de session → loading = false');
          setLoading(false);
        }
      } catch (err) {
        console.error('[AuthContext] Erreur initAuth:', err);
        if (isMounted) setLoading(false);
      }
    }

    initAuth();

    // Safety timeout
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('[AuthContext] ⚠️ Safety timeout (20s) → loading = false');
        setLoading(false);
      }
    }, 20000);

    // Écouter les changements d'état d'authentification
    // INITIAL_SESSION est ignoré : initAuth gère déjà le cas via getSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] onAuthStateChange:', event, session?.user?.email);

        if (event === 'INITIAL_SESSION') {
          console.log('[AuthContext] INITIAL_SESSION ignoré (géré par initAuth)');
          return;
        }

        if (event === 'SIGNED_IN' && session?.user) {
          if (isMounted) {
            await handleUser(session.user);
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
