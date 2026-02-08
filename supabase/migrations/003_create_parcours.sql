-- ============================================================
-- Migration : Création de la table parcours_stages
-- MedApply - Parcours de spécialisation
-- ============================================================

-- 1. Table pour stocker les métadonnées du parcours (spécialité, durée totale)
CREATE TABLE IF NOT EXISTS public.parcours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  specialty TEXT NOT NULL DEFAULT '',
  total_duration TEXT NOT NULL DEFAULT '5 ans',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Table pour stocker les étapes/stages du parcours
CREATE TABLE IF NOT EXISTS public.parcours_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parcours_id UUID REFERENCES public.parcours(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  rotation TEXT NOT NULL DEFAULT '',
  hospital TEXT NOT NULL DEFAULT '',
  service TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  duration TEXT NOT NULL DEFAULT '6 mois',
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('completed', 'in_progress', 'planned')),
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Index pour ordonner les stages
CREATE INDEX IF NOT EXISTS idx_parcours_stages_order
  ON public.parcours_stages (parcours_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_parcours_user
  ON public.parcours (user_id);

-- 4. RLS sur parcours
ALTER TABLE public.parcours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs voient leur propre parcours"
  ON public.parcours FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Utilisateurs créent leur propre parcours"
  ON public.parcours FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateurs modifient leur propre parcours"
  ON public.parcours FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateurs suppriment leur propre parcours"
  ON public.parcours FOR DELETE
  USING (auth.uid() = user_id);

-- 5. RLS sur parcours_stages
ALTER TABLE public.parcours_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs voient leurs propres stages"
  ON public.parcours_stages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Utilisateurs créent leurs propres stages"
  ON public.parcours_stages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateurs modifient leurs propres stages"
  ON public.parcours_stages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateurs suppriment leurs propres stages"
  ON public.parcours_stages FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Trigger updated_at pour parcours
DROP TRIGGER IF EXISTS on_parcours_updated ON public.parcours;
CREATE TRIGGER on_parcours_updated
  BEFORE UPDATE ON public.parcours
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 7. Trigger updated_at pour parcours_stages
DROP TRIGGER IF EXISTS on_parcours_stage_updated ON public.parcours_stages;
CREATE TRIGGER on_parcours_stage_updated
  BEFORE UPDATE ON public.parcours_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
