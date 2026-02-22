-- ============================================================
-- Migration : Ajout du champ preferred_specialties
-- MedApply - Spécialités préférées
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_specialties TEXT[] DEFAULT '{}';
