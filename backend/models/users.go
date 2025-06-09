package models

import "time"

type User struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"` // Add this line
	Email      string    `json:"email"`
	Password   string    `json:"password"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
	IsVerified bool      `json:"is_verified"`
	IsActive   bool      `json:"is_active"`
}

