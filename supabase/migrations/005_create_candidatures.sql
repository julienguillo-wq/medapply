-- ============================================================
-- Migration : Création de la table candidatures
-- MedApply - Système de candidature spontanée
-- ============================================================

-- 1. Création de la table candidatures
CREATE TABLE public.candidatures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  establishment_id TEXT NOT NULL DEFAULT '',
  establishment_name TEXT NOT NULL DEFAULT '',
  establishment_city TEXT NOT NULL DEFAULT '',
  establishment_canton TEXT NOT NULL DEFAULT '',
  director_name TEXT NOT NULL DEFAULT '',
  director_email TEXT NOT NULL DEFAULT '',
  specialty TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'replied', 'rejected')),
  motivation_letter TEXT NOT NULL DEFAULT '',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Activer Row Level Security (RLS)
ALTER TABLE public.candidatures ENABLE ROW LEVEL SECURITY;

-- 3. Politiques RLS : chaque utilisateur ne gère que ses propres candidatures
CREATE POLICY "Les utilisateurs peuvent voir leurs candidatures"
  ON public.candidatures
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent créer leurs candidatures"
  ON public.candidatures
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent modifier leurs candidatures"
  ON public.candidatures
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent supprimer leurs candidatures"
  ON public.candidatures
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Index pour les requêtes fréquentes
CREATE INDEX idx_candidatures_user_id ON public.candidatures (user_id);
CREATE INDEX idx_candidatures_user_status ON public.candidatures (user_id, status);

-- 5. Trigger pour updated_at automatique (réutilise la fonction de migration 001)
DROP TRIGGER IF EXISTS on_candidature_updated ON public.candidatures;
CREATE TRIGGER on_candidature_updated
  BEFORE UPDATE ON public.candidatures
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
