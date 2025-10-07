package models

import "github.com/google/uuid"

// Permission represents a specific permission in the system
type Permission struct {
	ID          uuid.UUID `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Description string    `json:"description" db:"description"`
	Resource    string    `json:"resource" db:"resource"` // e.g., "posts", "analytics", "workspace"
	Action      string    `json:"action" db:"action"`     // e.g., "create", "read", "update", "delete"
}

// Role represents a role with associated permissions
type Role struct {
	ID           uuid.UUID    `json:"id" db:"id"`
	Name         string       `json:"name" db:"name"`
	Description  string       `json:"description" db:"description"`
	IsSystemRole bool         `json:"is_system_role" db:"is_system_role"`
	Permissions  []Permission `json:"permissions"`
}

// WorkspaceRole represents a user's role in a specific workspace with custom permissions
type WorkspaceRole struct {
	ID                uuid.UUID    `json:"id" db:"id"`
	WorkspaceID       uuid.UUID    `json:"workspace_id" db:"workspace_id"`
	UserID            uuid.UUID    `json:"user_id" db:"user_id"`
	RoleID            uuid.UUID    `json:"role_id" db:"role_id"`
	Role              Role         `json:"role"`
	CustomPermissions []Permission `json:"custom_permissions"` // Additional permissions beyond role
}

// SocialAccountRole represents permissions for specific social media accounts
type SocialAccountRole struct {
	ID              uuid.UUID `json:"id" db:"id"`
	WorkspaceID     uuid.UUID `json:"workspace_id" db:"workspace_id"`
	UserID          uuid.UUID `json:"user_id" db:"user_id"`
	SocialAccountID uuid.UUID `json:"social_account_id" db:"social_account_id"`
	Platform        string    `json:"platform" db:"platform"`
	Permissions     []string  `json:"permissions" db:"permissions"` // JSON array of permissions
}

// Permission constants for different resources and actions
const (
	// Workspace permissions
	PermWorkspaceRead   = "workspace:read"
	PermWorkspaceUpdate = "workspace:update"
	PermWorkspaceDelete = "workspace:delete"
	PermWorkspaceInvite = "workspace:invite"

	// Member management permissions
	PermMemberRead       = "member:read"
	PermMemberInvite     = "member:invite"
	PermMemberRemove     = "member:remove"
	PermMemberRoleChange = "member:role_change"

	// Content permissions
	PermPostCreate   = "post:create"
	PermPostRead     = "post:read"
	PermPostUpdate   = "post:update"
	PermPostDelete   = "post:delete"
	PermPostPublish  = "post:publish"
	PermPostSchedule = "post:schedule"

	// Draft permissions
	PermDraftCreate = "draft:create"
	PermDraftRead   = "draft:read"
	PermDraftUpdate = "draft:update"
	PermDraftDelete = "draft:delete"

	// Comment permissions
	PermCommentCreate = "comment:create"
	PermCommentRead   = "comment:read"
	PermCommentUpdate = "comment:update"
	PermCommentDelete = "comment:delete"

	// Analytics permissions
	PermAnalyticsRead     = "analytics:read"
	PermAnalyticsExport   = "analytics:export"
	PermAnalyticsAdvanced = "analytics:advanced"

	// Social account permissions
	PermSocialAccountConnect    = "social:connect"
	PermSocialAccountDisconnect = "social:disconnect"
	PermSocialAccountRead       = "social:read"
	PermSocialAccountPost       = "social:post"

	// Media permissions
	PermMediaUpload = "media:upload"
	PermMediaDelete = "media:delete"
	PermMediaRead   = "media:read"
)

// System role names
const (
	RoleWorkspaceAdmin = "workspace_admin"
	RoleContentManager = "content_manager"
	RoleSocialManager  = "social_manager"
	RoleAnalyst        = "analyst"
	RoleContributor    = "contributor"
	RoleViewer         = "viewer"
)

// GetDefaultRolePermissions returns the default permissions for each system role
func GetDefaultRolePermissions() map[string][]string {
	return map[string][]string{
		RoleWorkspaceAdmin: {
			// Full workspace control
			PermWorkspaceRead, PermWorkspaceUpdate, PermWorkspaceDelete, PermWorkspaceInvite,
			// Full member management
			PermMemberRead, PermMemberInvite, PermMemberRemove, PermMemberRoleChange,
			// Full content control
			PermPostCreate, PermPostRead, PermPostUpdate, PermPostDelete, PermPostPublish, PermPostSchedule,
			PermDraftCreate, PermDraftRead, PermDraftUpdate, PermDraftDelete,
			// Full comment control
			PermCommentCreate, PermCommentRead, PermCommentUpdate, PermCommentDelete,
			// Full analytics access
			PermAnalyticsRead, PermAnalyticsExport, PermAnalyticsAdvanced,
			// Full social account control
			PermSocialAccountConnect, PermSocialAccountDisconnect, PermSocialAccountRead, PermSocialAccountPost,
			// Full media control
			PermMediaUpload, PermMediaDelete, PermMediaRead,
		},
		RoleContentManager: {
			// Limited workspace access
			PermWorkspaceRead,
			// Member read-only
			PermMemberRead,
			// Full content control
			PermPostCreate, PermPostRead, PermPostUpdate, PermPostDelete, PermPostPublish, PermPostSchedule,
			PermDraftCreate, PermDraftRead, PermDraftUpdate, PermDraftDelete,
			// Full comment control
			PermCommentCreate, PermCommentRead, PermCommentUpdate, PermCommentDelete,
			// Analytics read access
			PermAnalyticsRead, PermAnalyticsExport,
			// Social account posting
			PermSocialAccountRead, PermSocialAccountPost,
			// Media management
			PermMediaUpload, PermMediaDelete, PermMediaRead,
		},
		RoleSocialManager: {
			// Limited workspace access
			PermWorkspaceRead,
			// Member read-only
			PermMemberRead,
			// Post management for social
			PermPostCreate, PermPostRead, PermPostUpdate, PermPostPublish,
			PermDraftCreate, PermDraftRead, PermDraftUpdate,
			// Comment permissions
			PermCommentCreate, PermCommentRead, PermCommentUpdate, PermCommentDelete,
			// Analytics read access
			PermAnalyticsRead,
			// Full social account control
			PermSocialAccountConnect, PermSocialAccountDisconnect, PermSocialAccountRead, PermSocialAccountPost,
			// Media upload
			PermMediaUpload, PermMediaRead,
		},
		RoleAnalyst: {
			// Limited workspace access
			PermWorkspaceRead,
			// Member read-only
			PermMemberRead,
			// Content read-only
			PermPostRead, PermDraftRead,
			// Comment read-only
			PermCommentRead,
			// Full analytics access
			PermAnalyticsRead, PermAnalyticsExport, PermAnalyticsAdvanced,
			// Social account read-only
			PermSocialAccountRead,
			// Media read-only
			PermMediaRead,
		},
		RoleContributor: {
			// Limited workspace access
			PermWorkspaceRead,
			// Member read-only
			PermMemberRead,
			// Limited content creation
			PermPostCreate, PermPostRead, PermPostUpdate,
			PermDraftCreate, PermDraftRead, PermDraftUpdate, PermDraftDelete,
			// Comment permissions
			PermCommentCreate, PermCommentRead, PermCommentUpdate, PermCommentDelete,
			// Basic analytics
			PermAnalyticsRead,
			// Social account read and limited posting
			PermSocialAccountRead, PermSocialAccountPost,
			// Media upload
			PermMediaUpload, PermMediaRead,
		},
		RoleViewer: {
			// Read-only workspace access
			PermWorkspaceRead,
			// Member read-only
			PermMemberRead,
			// Content read-only
			PermPostRead, PermDraftRead,
			// Comment read-only
			PermCommentRead,
			// Basic analytics
			PermAnalyticsRead,
			// Social account read-only
			PermSocialAccountRead,
			// Media read-only
			PermMediaRead,
		},
	}
}

// HasPermission checks if a user has a specific permission in a workspace
func (wr *WorkspaceRole) HasPermission(permission string) bool {
	// Check role permissions
	for _, perm := range wr.Role.Permissions {
		if perm.Name == permission {
			return true
		}
	}

	// Check custom permissions
	for _, perm := range wr.CustomPermissions {
		if perm.Name == permission {
			return true
		}
	}

	return false
}

// CanAccessSocialAccount checks if a user can access a specific social account
func (sar *SocialAccountRole) CanAccessSocialAccount(action string) bool {
	for _, perm := range sar.Permissions {
		if perm == action {
			return true
		}
	}
	return false
}
