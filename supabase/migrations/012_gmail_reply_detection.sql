-- ============================================================
-- Migration 012: Gmail reply detection
-- Ajoute le stockage des tokens OAuth2 Gmail et les colonnes
-- de suivi des réponses sur les candidatures.
-- ============================================================

-- Table pour stocker les tokens OAuth2 Gmail (lecture seule)
CREATE TABLE IF NOT EXISTS public.gmail_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,
  gmail_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.gmail_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gmail tokens"
  ON public.gmail_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gmail tokens"
  ON public.gmail_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gmail tokens"
  ON public.gmail_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own gmail tokens"
  ON public.gmail_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Nouvelles colonnes sur candidatures pour le suivi des threads Gmail
ALTER TABLE public.candidatures ADD COLUMN IF NOT EXISTS gmail_thread_id TEXT;
ALTER TABLE public.candidatures ADD COLUMN IF NOT EXISTS gmail_message_id TEXT;
ALTER TABLE public.candidatures ADD COLUMN IF NOT EXISTS reply_snippet TEXT;
ALTER TABLE public.candidatures ADD COLUMN IF NOT EXISTS reply_detected_at TIMESTAMPTZ;
