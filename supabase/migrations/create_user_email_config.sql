-- ============================================================
-- Table : user_email_config
-- Stocke la configuration SMTP Gmail de chaque utilisateur
-- ============================================================

CREATE TABLE IF NOT EXISTS user_email_config (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL,
  smtp_password TEXT NOT NULL,
  smtp_verified BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Index pour lookup rapide par user_id
CREATE INDEX IF NOT EXISTS idx_user_email_config_user_id ON user_email_config(user_id);

-- ============================================================
-- RLS : chaque utilisateur ne voit que sa propre config
-- ============================================================

ALTER TABLE user_email_config ENABLE ROW LEVEL SECURITY;

-- SELECT : l'utilisateur peut lire sa propre config
CREATE POLICY "Users can read own email config"
  ON user_email_config FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT : l'utilisateur peut créer sa propre config
CREATE POLICY "Users can insert own email config"
  ON user_email_config FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE : l'utilisateur peut modifier sa propre config
CREATE POLICY "Users can update own email config"
  ON user_email_config FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE : l'utilisateur peut supprimer sa propre config
CREATE POLICY "Users can delete own email config"
  ON user_email_config FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Trigger : mettre à jour updated_at automatiquement
-- ============================================================

CREATE OR REPLACE FUNCTION update_email_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_email_config_updated_at
  BEFORE UPDATE ON user_email_config
  FOR EACH ROW
  EXECUTE FUNCTION update_email_config_updated_at();
