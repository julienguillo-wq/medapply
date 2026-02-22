-- ============================================================
-- Migration 013: Ajouter city/canton aux campaign_items
-- Permet de créer des candidatures complètes après envoi
-- ============================================================

ALTER TABLE public.campaign_items ADD COLUMN IF NOT EXISTS establishment_city TEXT NOT NULL DEFAULT '';
ALTER TABLE public.campaign_items ADD COLUMN IF NOT EXISTS establishment_canton TEXT NOT NULL DEFAULT '';
