CREATE TABLE public.establishment_emails (
  establishment_id TEXT PRIMARY KEY,
  email_status TEXT NOT NULL DEFAULT 'suggested'
    CHECK (email_status IN ('suggested','validated','invalid','manually_verified')),
  email_manual TEXT,
  email_validated_at TIMESTAMPTZ,
  email_validated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  bounce_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_establishment_emails_status ON public.establishment_emails(email_status);

ALTER TABLE public.establishment_emails ENABLE ROW LEVEL SECURITY;

-- SELECT pour tous les authentifies
CREATE POLICY "read_all" ON public.establishment_emails FOR SELECT USING (auth.role()='authenticated');

-- Trigger updated_at (reutilise handle_updated_at de migration 001)
CREATE TRIGGER on_establishment_email_updated BEFORE UPDATE ON public.establishment_emails
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
