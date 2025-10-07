-- Add targets JSONB column to scheduled_posts to support per-platform account selection

ALTER TABLE scheduled_posts
  ADD COLUMN IF NOT EXISTS targets JSONB DEFAULT '{}'::jsonb;


