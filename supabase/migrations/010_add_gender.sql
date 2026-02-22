-- ============================================================
-- Migration : Ajout du champ gender
-- MedApply - Genre pour signature personnalisée
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;
