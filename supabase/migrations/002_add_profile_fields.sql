-- ============================================================
-- Migration : Ajout des champs phone, current_position, experience
-- MedApply - Profil conversationnel
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_position TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience TEXT;
