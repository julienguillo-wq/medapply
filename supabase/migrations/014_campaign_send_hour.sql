-- ============================================================
-- Migration 014: Ajouter l'heure d'envoi configurable par campagne
-- ============================================================

ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS send_hour TEXT DEFAULT '08:00';
