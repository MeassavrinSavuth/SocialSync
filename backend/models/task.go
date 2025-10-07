package models

import "time"

type Task struct {
	ID            string     `json:"id"`
	WorkspaceID   string     `json:"workspace_id"`
	Title         string     `json:"title"`
	Description   string     `json:"description"`
	Status        string     `json:"status"`
	AssignedTo    *string    `json:"assigned_to"` // UUID of user, nullable
	CreatedBy     string     `json:"created_by"`
	LastUpdatedBy *string    `json:"last_updated_by"` // UUID of user who last updated, nullable
	DueDate       *time.Time `json:"due_date"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// Optional projection the API may attach alongside Task in responses
type Assignee struct {
	ID     *string `json:"id"`
	Name   *string `json:"name"`
	Avatar *string `json:"avatar"`
}
