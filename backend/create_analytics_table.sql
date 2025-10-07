-- Create post_analytics table for analytics data storage
CREATE TABLE IF NOT EXISTS post_analytics (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
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
