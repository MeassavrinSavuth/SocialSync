package models

import (
	"time"

	"github.com/google/uuid"
)

// PostAnalytics represents aggregated metrics per user per platform snapshot
// CREATE TABLE post_analytics (
//
//	id SERIAL PRIMARY KEY,
//	user_id UUID NOT NULL,
//	platform TEXT NOT NULL,
//	snapshot_at TIMESTAMP DEFAULT NOW(),
//	total_posts INT,
//	total_likes INT DEFAULT 0,
//	total_comments INT DEFAULT 0,
//	total_shares INT DEFAULT 0,
//	total_views INT DEFAULT 0,
//	engagement INT DEFAULT 0,
//	top_posts JSONB
//
// );
type PostAnalytics struct {
	ID            int       `json:"id" db:"id"`
	UserID        uuid.UUID `json:"user_id" db:"user_id"`
	Platform      string    `json:"platform" db:"platform"`
	SnapshotAt    time.Time `json:"snapshot_at" db:"snapshot_at"`
	TotalPosts    int       `json:"total_posts" db:"total_posts"`
	TotalLikes    int       `json:"total_likes" db:"total_likes"`
	TotalComments int       `json:"total_comments" db:"total_comments"`
	TotalShares   int       `json:"total_shares" db:"total_shares"`
	TotalViews    int       `json:"total_views" db:"total_views"`
	Engagement    int       `json:"engagement" db:"engagement"`
	TopPosts      string    `json:"top_posts" db:"top_posts"` // JSONB stored as string
}

// TopPost represents a single top post stored in JSONB
type TopPost struct {
	ID          string    `json:"id"`
	Content     string    `json:"content"`
	Likes       int       `json:"likes"`
	Comments    int       `json:"comments"`
	Shares      int       `json:"shares"`
	Views       int       `json:"views"`
	Engagement  int       `json:"engagement"`
	CreatedAt   time.Time `json:"created_at"`
	PlatformURL string    `json:"platform_url,omitempty"`
}

// AnalyticsOverview represents aggregated analytics data for frontend display
type AnalyticsOverview struct {
	UserID          uuid.UUID             `json:"user_id"`
	TotalPosts      int                   `json:"total_posts"`
	TotalEngagement int                   `json:"total_engagement"`
	PlatformStats   []PlatformStats       `json:"platform_stats"`
	TopPosts        []TopPost             `json:"top_posts"`
	EngagementTrend []EngagementDataPoint `json:"engagement_trend"`
	DateRange       DateRange             `json:"date_range"`
}

// PlatformStats represents statistics for a specific platform
type PlatformStats struct {
	Platform        string  `json:"platform"`
	TotalPosts      int     `json:"total_posts"`
	TotalLikes      int     `json:"total_likes"`
	TotalComments   int     `json:"total_comments"`
	TotalShares     int     `json:"total_shares"`
	TotalViews      int     `json:"total_views"`
	TotalEngagement int     `json:"total_engagement"`
	AvgEngagement   float64 `json:"avg_engagement"`
}

// EngagementDataPoint represents a single data point for engagement trends
type EngagementDataPoint struct {
	Date       time.Time `json:"date"`
	Likes      int       `json:"likes"`
	Comments   int       `json:"comments"`
	Shares     int       `json:"shares"`
	Views      int       `json:"views"`
	Engagement int       `json:"engagement"`
}

// DateRange represents a date range for analytics queries
type DateRange struct {
	StartDate time.Time `json:"start_date"`
	EndDate   time.Time `json:"end_date"`
}

// AnalyticsFilters represents filters for analytics queries
type AnalyticsFilters struct {
	UserID    uuid.UUID `json:"user_id"`
	Platforms []string  `json:"platforms,omitempty"`
	DateRange DateRange `json:"date_range,omitempty"`
	Limit     int       `json:"limit,omitempty"`
}
