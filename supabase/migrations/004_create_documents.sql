-- ============================================================
-- Migration : Création de la table documents + storage bucket
-- MedApply - Gestion des documents de candidature
-- ============================================================

-- 1. Table documents (métadonnées des fichiers)
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL DEFAULT 'autre'
    CHECK (category IN ('diplome', 'certification', 'lettre_recommandation', 'cv', 'attestation', 'autre')),
  name TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL DEFAULT '',
  file_path TEXT NOT NULL DEFAULT '',
  file_size INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT '',
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Index
CREATE INDEX IF NOT EXISTS idx_documents_user ON public.documents (user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_category ON public.documents (user_id, category);

-- 3. RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs voient leurs propres documents"
  ON public.documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Utilisateurs créent leurs propres documents"
  ON public.documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateurs modifient leurs propres documents"
  ON public.documents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateurs suppriment leurs propres documents"
  ON public.documents FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKET + POLICIES
-- À exécuter SÉPARÉMENT dans le SQL Editor de Supabase
-- car les fonctions storage sont dans le schéma storage
-- ============================================================

-- 4. Créer le bucket "documents" (privé)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- 5. Policies sur le bucket storage
-- SELECT : un utilisateur peut lire ses propres fichiers
CREATE POLICY "Utilisateurs lisent leurs fichiers"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- INSERT : un utilisateur peut uploader dans son dossier
CREATE POLICY "Utilisateurs uploadent leurs fichiers"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE : un utilisateur peut modifier ses fichiers
CREATE POLICY "Utilisateurs modifient leurs fichiers"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE : un utilisateur peut supprimer ses fichiers
CREATE POLICY "Utilisateurs suppriment leurs fichiers"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
