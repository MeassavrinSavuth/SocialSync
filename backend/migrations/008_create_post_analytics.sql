-- Migration: Create post_analytics table for analytics data storage
-- This table stores aggregated analytics data for users across platforms

CREATE TABLE IF NOT EXISTS post_analytics (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    snapshot_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_posts INTEGER DEFAULT 0,
    total_likes INTEGER DEFAULT 0,
    total_comments INTEGER DEFAULT 0,
    total_shares INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    engagement INTEGER DEFAULT 0,
    top_posts JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_post_analytics_user_id ON post_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_post_analytics_platform ON post_analytics(platform);
CREATE INDEX IF NOT EXISTS idx_post_analytics_snapshot_at ON post_analytics(snapshot_at);
CREATE INDEX IF NOT EXISTS idx_post_analytics_user_platform ON post_analytics(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_post_analytics_user_snapshot ON post_analytics(user_id, snapshot_at);

-- Add comments for documentation
COMMENT ON TABLE post_analytics IS 'Aggregated analytics data for users across social media platforms';
COMMENT ON COLUMN post_analytics.user_id IS 'User ID who owns the analytics data';
COMMENT ON COLUMN post_analytics.platform IS 'Social media platform (facebook, twitter, youtube, etc.)';
COMMENT ON COLUMN post_analytics.snapshot_at IS 'When this analytics snapshot was taken';
COMMENT ON COLUMN post_analytics.total_posts IS 'Total number of posts for this platform';
COMMENT ON COLUMN post_analytics.total_likes IS 'Total number of likes across all posts';
COMMENT ON COLUMN post_analytics.total_comments IS 'Total number of comments across all posts';
COMMENT ON COLUMN post_analytics.total_shares IS 'Total number of shares across all posts';
COMMENT ON COLUMN post_analytics.total_views IS 'Total number of views across all posts';
COMMENT ON COLUMN post_analytics.engagement IS 'Total engagement score (likes + comments + shares)';
COMMENT ON COLUMN post_analytics.top_posts IS 'JSON array of top performing posts with their metrics';
