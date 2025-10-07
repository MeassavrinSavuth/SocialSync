-- Allow multiple social accounts per provider for a user by removing legacy unique constraint

-- Drop the old unique constraint if it exists
ALTER TABLE IF EXISTS social_accounts
  DROP CONSTRAINT IF EXISTS social_accounts_user_id_platform_key;

-- In some setups, the supporting index may remain with the same name; drop it defensively
DROP INDEX IF EXISTS social_accounts_user_id_platform_key;

-- Ensure the new unique index is present (user_id, provider, external_account_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_accounts_user_provider_ext
  ON social_accounts(user_id, provider, external_account_id);


