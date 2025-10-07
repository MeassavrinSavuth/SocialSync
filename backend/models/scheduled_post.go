package models

import (
	"time"

	"github.com/lib/pq"
)

// ScheduledPost represents a scheduled social media post
type ScheduledPost struct {
	ID            int                    `json:"id" db:"id"`
	UserID        string                 `json:"user_id" db:"user_id"` // UUID as string
	Content       string                 `json:"content" db:"content"`
	MediaURLs     pq.StringArray         `json:"media_urls" db:"media_urls"`
	Platforms     pq.StringArray         `json:"platforms" db:"platforms"`
	ScheduledTime time.Time              `json:"scheduled_time" db:"scheduled_time"`
	Status        string                 `json:"status" db:"status"` // pending, posted, failed, cancelled
	RetryCount    int                    `json:"retry_count" db:"retry_count"`
	ErrorMessage  *string                `json:"error_message,omitempty" db:"error_message"`
	CreatedAt     time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time              `json:"updated_at" db:"updated_at"`
	Targets       map[string]interface{} `json:"targets" db:"targets"`
}

// CreateScheduledPostRequest represents the request payload for creating a scheduled post
type CreateScheduledPostRequest struct {
	Content       string                 `json:"content" validate:"required"`
	MediaURLs     []string               `json:"media_urls"`
	Platforms     []string               `json:"platforms" validate:"required,min=1"`
	ScheduledTime time.Time              `json:"scheduled_time" validate:"required"`
	Targets       map[string]interface{} `json:"targets"`
}

// UpdateScheduledPostRequest represents the request payload for updating a scheduled post
type UpdateScheduledPostRequest struct {
	Content       *string    `json:"content,omitempty"`
	MediaURLs     *[]string  `json:"media_urls,omitempty"`
	Platforms     *[]string  `json:"platforms,omitempty"`
	ScheduledTime *time.Time `json:"scheduled_time,omitempty"`
}

// ScheduledPostStatus constants
const (
	StatusPending   = "pending"
	StatusPosted    = "posted"
	StatusFailed    = "failed"
	StatusCancelled = "cancelled"
)

// IsEditable returns true if the scheduled post can be edited
func (sp *ScheduledPost) IsEditable() bool {
	return sp.Status == StatusPending
}

// CanBeDeleted returns true if the scheduled post can be deleted
func (sp *ScheduledPost) CanBeDeleted() bool {
	return sp.Status == StatusPending || sp.Status == StatusFailed
}
