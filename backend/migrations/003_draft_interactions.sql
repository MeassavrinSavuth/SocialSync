-- Create tables for draft interactions (comments and reactions)

CREATE TABLE IF NOT EXISTS draft_comments (
  id UUID PRIMARY KEY,
  draft_id UUID NOT NULL REFERENCES draft_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS draft_reactions (
  id UUID PRIMARY KEY,
  draft_id UUID NOT NULL REFERENCES draft_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_draft_comments_draft ON draft_comments(draft_id);
CREATE INDEX IF NOT EXISTS idx_draft_reactions_draft ON draft_reactions(draft_id);
CREATE INDEX IF NOT EXISTS idx_draft_reactions_draft_user ON draft_reactions(draft_id, user_id);


