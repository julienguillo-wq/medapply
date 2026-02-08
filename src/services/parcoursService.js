import { supabase } from '../lib/supabase';

const LS_KEY = 'medpost_parcours';

/**
 * Charge le parcours depuis Supabase.
 * Retourne { specialty, totalDuration, stages[] } ou null si rien trouvé.
 */
export async function loadParcoursFromSupabase(userId) {
  // 1. Charger le parcours principal
  const { data: parcours, error: pErr } = await supabase
    .from('parcours')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (pErr || !parcours) return null;

  // 2. Charger les stages ordonnés
  const { data: stages, error: sErr } = await supabase
    .from('parcours_stages')
    .select('*')
    .eq('parcours_id', parcours.id)
    .order('sort_order', { ascending: true });

  if (sErr) {
    console.error('[parcoursService] Erreur chargement stages:', sErr.message);
    return null;
  }

  return {
    id: parcours.id,
    specialty: parcours.specialty,
    totalDuration: parcours.total_duration,
    completedMonths: 0,
    totalMonths: 0,
    stages: (stages || []).map(s => ({
      id: s.id,
      rotation: s.rotation,
      hospital: s.hospital,
      service: s.service,
      location: s.location,
      duration: s.duration,
      startDate: s.start_date,
      endDate: s.end_date,
      status: s.status,
      description: s.description,
    })),
  };
}

/**
 * Sauvegarde le parcours complet dans Supabase (upsert parcours + replace stages).
 */
export async function saveParcoursToSupabase(userId, data) {
  // 1. Upsert le parcours principal
  const { data: parcours, error: pErr } = await supabase
    .from('parcours')
    .upsert({
      ...(data.id ? { id: data.id } : {}),
      user_id: userId,
      specialty: data.specialty || '',
      total_duration: data.totalDuration || '5 ans',
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (pErr || !parcours) {
    console.error('[parcoursService] Erreur sauvegarde parcours:', pErr?.message);
    return { error: pErr };
  }

  // 2. Supprimer les anciens stages
  const { error: delErr } = await supabase
    .from('parcours_stages')
    .delete()
    .eq('parcours_id', parcours.id);

  if (delErr) {
    console.error('[parcoursService] Erreur suppression stages:', delErr.message);
    return { error: delErr };
  }

  // 3. Insérer les nouveaux stages
  if (data.stages && data.stages.length > 0) {
    const rows = data.stages.map((s, i) => ({
      parcours_id: parcours.id,
      user_id: userId,
      sort_order: i,
      rotation: s.rotation || '',
      hospital: s.hospital || '',
      service: s.service || '',
      location: s.location || '',
      duration: s.duration || '6 mois',
      start_date: s.startDate || '',
      end_date: s.endDate || '',
      status: s.status || 'planned',
      description: s.description || '',
    }));

    const { error: insErr } = await supabase
      .from('parcours_stages')
      .insert(rows);

    if (insErr) {
      console.error('[parcoursService] Erreur insertion stages:', insErr.message);
      return { error: insErr };
    }
  }

  // 4. Aussi sauvegarder en localStorage comme cache
  saveToLocalStorage(data);

  return { data: parcours };
}

/**
 * Charge depuis localStorage (fallback offline).
 */
export function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Sauvegarde en localStorage (cache local).
 */
export function saveToLocalStorage(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

/**
 * Migre les données localStorage vers Supabase (si elles existent et pas encore dans Supabase).
 */
export async function migrateLocalStorageToSupabase(userId) {
  const local = loadFromLocalStorage();
  if (!local || !local.stages || local.stages.length === 0) return false;

  // Vérifier si un parcours existe déjà dans Supabase
  const existing = await loadParcoursFromSupabase(userId);
  if (existing && existing.stages.length > 0) return false;

  // Migrer
  console.log('[parcoursService] Migration localStorage → Supabase');
  const { error } = await saveParcoursToSupabase(userId, local);
  return !error;
}
