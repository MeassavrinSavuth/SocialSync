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


// CREATE EXTENSION IF NOT EXISTS "pgcrypto";

// CREATE TABLE users (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   email TEXT UNIQUE NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
//   password TEXT NOT NULL,
//   created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
//   updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
//   is_verified BOOLEAN DEFAULT FALSE,
//   is_active BOOLEAN DEFAULT TRUE
// );


