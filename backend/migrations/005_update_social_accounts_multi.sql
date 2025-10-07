-- Ensure social_accounts supports multiple accounts per user/provider

-- Add commonly needed columns if they do not exist yet
ALTER TABLE social_accounts
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar TEXT,
  ADD COLUMN IF NOT EXISTS scopes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS access_token_enc TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token_enc TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS workspace_id UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add external account id if missing (used to prevent duplicates per provider)
ALTER TABLE social_accounts
  ADD COLUMN IF NOT EXISTS external_account_id TEXT;

-- Create unique index to allow many accounts while preventing duplicates of same provider+account
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_accounts_user_provider_ext
  ON social_accounts(user_id, provider, external_account_id);


