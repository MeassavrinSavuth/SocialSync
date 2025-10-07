-- Migration: Add account_id column to post_analytics table for account-specific analytics
-- This allows storing analytics data per individual social media account

-- Add account_id column to post_analytics table
ALTER TABLE post_analytics ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES social_accounts(id) ON DELETE CASCADE;

-- Create index for account_id for better query performance
CREATE INDEX IF NOT EXISTS idx_post_analytics_account_id ON post_analytics(account_id);

-- Create composite index for user_id and account_id
CREATE INDEX IF NOT EXISTS idx_post_analytics_user_account ON post_analytics(user_id, account_id);

-- Update the comment to reflect the new structure
COMMENT ON COLUMN post_analytics.account_id IS 'Social account ID for account-specific analytics';
COMMENT ON TABLE post_analytics IS 'Analytics data for users across social media platforms and accounts';
