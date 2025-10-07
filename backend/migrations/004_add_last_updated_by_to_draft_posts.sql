-- Add last_updated_by to draft_posts to track who last modified/published a draft

ALTER TABLE draft_posts
  ADD COLUMN IF NOT EXISTS last_updated_by UUID REFERENCES users(id);


