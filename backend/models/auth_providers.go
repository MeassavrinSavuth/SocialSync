package models

import "time"

type AuthProvider struct {
	ID         string    `json:"id"` // UUID
	UserID     string    `json:"user_id"` // FK to users.id
	Provider   string    `json:"provider"` // e.g., "google", "facebook"
	ProviderID string    `json:"provider_id"` // unique ID from provider (e.g., Google sub)
	CreatedAt  time.Time `json:"created_at"`
}
