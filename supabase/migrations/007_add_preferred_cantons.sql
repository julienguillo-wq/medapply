-- ============================================================
-- Migration : Ajout du champ preferred_cantons
-- MedApply - Score de compatibilité
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_cantons TEXT[] DEFAULT '{}';
