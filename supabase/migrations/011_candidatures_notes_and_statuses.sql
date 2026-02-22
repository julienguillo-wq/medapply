-- ============================================================
-- Migration : Ajouter colonne notes + statuts supplémentaires
-- pour le suivi avancé des candidatures
-- ============================================================

-- 1. Ajouter la colonne notes
ALTER TABLE public.candidatures
  ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';

-- 2. Élargir la contrainte de statut pour inclure interview et accepted
ALTER TABLE public.candidatures
  DROP CONSTRAINT IF EXISTS candidatures_status_check;

ALTER TABLE public.candidatures
  ADD CONSTRAINT candidatures_status_check
  CHECK (status IN ('draft', 'sent', 'replied', 'rejected', 'interview', 'accepted'));
