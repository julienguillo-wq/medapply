/**
 * Service CRUD pour les candidatures (Supabase)
 */

import { supabase } from '../lib/supabase';

export async function createCandidature(userId, data) {
  try {
    const { data: candidature, error } = await supabase
      .from('candidatures')
      .insert({ user_id: userId, ...data })
      .select()
      .single();

    if (error) {
      console.error('[Candidatures] Erreur création:', error.message);
      return { data: null, error };
    }
    return { data: candidature, error: null };
  } catch (err) {
    console.error('[Candidatures] Erreur création:', err.message);
    return { data: null, error: err };
  }
}

export async function getCandidatures(userId) {
  try {
    const { data, error } = await supabase
      .from('candidatures')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Candidatures] Erreur chargement:', error.message);
      return { data: [], error };
    }
    return { data: data || [], error: null };
  } catch (err) {
    console.error('[Candidatures] Erreur chargement:', err.message);
    return { data: [], error: err };
  }
}

export async function updateCandidature(id, updates) {
  try {
    const { data, error } = await supabase
      .from('candidatures')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Candidatures] Erreur mise à jour:', error.message);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[Candidatures] Erreur mise à jour:', err.message);
    return { data: null, error: err };
  }
}

export async function deleteCandidature(id) {
  try {
    const { error } = await supabase
      .from('candidatures')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Candidatures] Erreur suppression:', error.message);
      return { error };
    }
    return { error: null };
  } catch (err) {
    console.error('[Candidatures] Erreur suppression:', err.message);
    return { error: err };
  }
}
