package middleware

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"social-sync-backend/lib"
	"social-sync-backend/models"

	"github.com/google/uuid"
)

// PermissionContextKey is the key for storing permissions in context
type PermissionContextKey string

const (
	UserPermissionsKey PermissionContextKey = "user_permissions"
	WorkspaceRoleKey   PermissionContextKey = "workspace_role"
)

// RequirePermission middleware checks if user has required permission in workspace
func RequirePermission(permission string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, err := GetUserIDFromContext(r)
			if err != nil {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			workspaceID := r.URL.Query().Get("workspace_id")
			if workspaceID == "" {
				// Try to get from URL path parameters (you might need to adjust this based on your routing)
				workspaceID = r.Header.Get("X-Workspace-ID")
			}

			if workspaceID == "" {
				http.Error(w, "Workspace ID required", http.StatusBadRequest)
				return
			}

			hasPermission, err := CheckUserPermission(userID, workspaceID, permission)
			if err != nil {
				http.Error(w, "Permission check failed", http.StatusInternalServerError)
				return
			}

			if !hasPermission {
				http.Error(w, "Insufficient permissions", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// LoadUserPermissions middleware loads user permissions into context
func LoadUserPermissions(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, err := GetUserIDFromContext(r)
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		workspaceID := r.URL.Query().Get("workspace_id")
		if workspaceID == "" {
			workspaceID = r.Header.Get("X-Workspace-ID")
		}

		if workspaceID != "" {
			permissions, err := GetUserPermissions(userID, workspaceID)
			if err == nil {
				ctx := context.WithValue(r.Context(), UserPermissionsKey, permissions)
				r = r.WithContext(ctx)
			}
		}

		next.ServeHTTP(w, r)
	})
}

// CheckUserPermission checks if a user has a specific permission in a workspace
func CheckUserPermission(userID, workspaceID, permission string) (bool, error) {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return false, fmt.Errorf("invalid user ID: %v", err)
	}

	workspaceUUID, err := uuid.Parse(workspaceID)
	if err != nil {
		return false, fmt.Errorf("invalid workspace ID: %v", err)
	}

	// First check if user is workspace admin (has all permissions)
	// Support both old and new role systems
	var isAdmin bool
	err = lib.DB.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM workspace_members 
			WHERE workspace_id = $1 AND user_id = $2 AND (role = 'Admin' OR role = 'workspace_admin')
		)
	`, workspaceUUID, userUUID).Scan(&isAdmin)

	if err != nil {
		return false, fmt.Errorf("database error: %v", err)
	}

	if isAdmin {
		return true, nil // Admins have all permissions
	}

	// Get user's role from workspace_members
	var userRole string
	err = lib.DB.QueryRow(`
		SELECT role FROM workspace_members 
		WHERE workspace_id = $1 AND user_id = $2
	`, workspaceUUID, userUUID).Scan(&userRole)

	if err == sql.ErrNoRows {
		return false, nil // User not in workspace
	}
	if err != nil {
		return false, fmt.Errorf("database error: %v", err)
	}

	// Check if roles table exists and has the role
	var permissionsJSON []byte
	err = lib.DB.QueryRow(`
		SELECT permissions FROM roles WHERE name = $1
	`, userRole).Scan(&permissionsJSON)

	if err == nil {
		// New system: Parse permissions from JSON
		var permissions []string
		if err := json.Unmarshal(permissionsJSON, &permissions); err == nil {
			// Check if permission exists in role permissions
			for _, perm := range permissions {
				if perm == permission {
					return true, nil
				}
			}
		}
	} else {
		// Fallback to old system role mapping
		rolePermissions := getLegacyRolePermissions(userRole)
		for _, perm := range rolePermissions {
			if perm == permission {
				return true, nil
			}
		}
	}

	// Check custom permissions for this user in this workspace
	customQuery := `
		SELECT permissions
		FROM workspace_user_permissions
		WHERE workspace_id = $1 AND user_id = $2
	`

	var customPermissionsJSON []byte
	err = lib.DB.QueryRow(customQuery, workspaceUUID, userUUID).Scan(&customPermissionsJSON)

	if err != nil && err != sql.ErrNoRows {
		return false, fmt.Errorf("database error checking custom permissions: %v", err)
	}

	if err == nil {
		var customPermissions []string
		if err := json.Unmarshal(customPermissionsJSON, &customPermissions); err == nil {
			for _, perm := range customPermissions {
				if perm == permission {
					return true, nil
				}
			}
		}
	}

	return false, nil
}

// GetUserPermissions returns all permissions for a user in a workspace
func GetUserPermissions(userID, workspaceID string) ([]string, error) {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %v", err)
	}

	workspaceUUID, err := uuid.Parse(workspaceID)
	if err != nil {
		return nil, fmt.Errorf("invalid workspace ID: %v", err)
	}

	// Check if user is workspace admin (support both old and new role systems)
	var isAdmin bool
	err = lib.DB.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM workspace_members 
			WHERE workspace_id = $1 AND user_id = $2 AND (role = 'Admin' OR role = 'workspace_admin')
		)
	`, workspaceUUID, userUUID).Scan(&isAdmin)

	if err != nil {
		return nil, fmt.Errorf("database error: %v", err)
	}

	if isAdmin {
		// Return all permissions for admin
		return getAllPermissions(), nil
	}

	var allPermissions []string

	// Get user's role from workspace_members
	var userRole string
	err = lib.DB.QueryRow(`
		SELECT role FROM workspace_members 
		WHERE workspace_id = $1 AND user_id = $2
	`, workspaceUUID, userUUID).Scan(&userRole)

	if err != nil {
		return nil, fmt.Errorf("database error: %v", err)
	}

	// Try to get permissions from roles table (new system)
	var permissionsJSON []byte
	err = lib.DB.QueryRow(`
		SELECT permissions FROM roles WHERE name = $1
	`, userRole).Scan(&permissionsJSON)

	if err == nil {
		// New system: Parse permissions from JSON
		var permissions []string
		if err := json.Unmarshal(permissionsJSON, &permissions); err == nil {
			allPermissions = append(allPermissions, permissions...)
		}
	} else {
		// Fallback to legacy role mapping
		permissions := getLegacyRolePermissions(userRole)
		allPermissions = append(allPermissions, permissions...)
	}

	// Get custom permissions
	customQuery := `
		SELECT permissions
		FROM workspace_user_permissions
		WHERE workspace_id = $1 AND user_id = $2
	`

	var customPermissionsJSON []byte
	err = lib.DB.QueryRow(customQuery, workspaceUUID, userUUID).Scan(&customPermissionsJSON)

	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("database error checking custom permissions: %v", err)
	}

	if err == nil {
		var customPermissions []string
		if err := json.Unmarshal(customPermissionsJSON, &customPermissions); err == nil {
			allPermissions = append(allPermissions, customPermissions...)
		}
	}

	// Remove duplicates
	permissionMap := make(map[string]bool)
	var uniquePermissions []string
	for _, perm := range allPermissions {
		if !permissionMap[perm] {
			permissionMap[perm] = true
			uniquePermissions = append(uniquePermissions, perm)
		}
	}

	return uniquePermissions, nil
}

// HasPermissionInContext checks if user has permission using context data
func HasPermissionInContext(r *http.Request, permission string) bool {
	permissions, ok := r.Context().Value(UserPermissionsKey).([]string)
	if !ok {
		return false
	}

	for _, perm := range permissions {
		if perm == permission {
			return true
		}
	}
	return false
}

// RequireAnyPermission checks if user has any of the specified permissions
func RequireAnyPermission(permissions ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, err := GetUserIDFromContext(r)
			if err != nil {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			workspaceID := r.URL.Query().Get("workspace_id")
			if workspaceID == "" {
				workspaceID = r.Header.Get("X-Workspace-ID")
			}

			if workspaceID == "" {
				http.Error(w, "Workspace ID required", http.StatusBadRequest)
				return
			}

			hasAnyPermission := false
			for _, permission := range permissions {
				if hasPermission, err := CheckUserPermission(userID, workspaceID, permission); err == nil && hasPermission {
					hasAnyPermission = true
					break
				}
			}

			if !hasAnyPermission {
				http.Error(w, "Insufficient permissions", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// getAllPermissions returns all available permissions in the system
func getAllPermissions() []string {
	return []string{
		models.PermWorkspaceRead, models.PermWorkspaceUpdate, models.PermWorkspaceDelete, models.PermWorkspaceInvite,
		models.PermMemberRead, models.PermMemberInvite, models.PermMemberRemove, models.PermMemberRoleChange,
		models.PermPostCreate, models.PermPostRead, models.PermPostUpdate, models.PermPostDelete, models.PermPostPublish, models.PermPostSchedule,
		models.PermDraftCreate, models.PermDraftRead, models.PermDraftUpdate, models.PermDraftDelete,
		models.PermAnalyticsRead, models.PermAnalyticsExport, models.PermAnalyticsAdvanced,
		models.PermSocialAccountConnect, models.PermSocialAccountDisconnect, models.PermSocialAccountRead, models.PermSocialAccountPost,
		models.PermMediaUpload, models.PermMediaDelete, models.PermMediaRead,
		models.PermTaskCreate, models.PermTaskRead, models.PermTaskUpdate, models.PermTaskDelete, models.PermTaskComment,
	}
}

// getLegacyRolePermissions maps old role names to permissions for backward compatibility
func getLegacyRolePermissions(roleName string) []string {
	legacyRoleMap := map[string][]string{
		"Admin": getAllPermissions(), // Old Admin role gets all permissions
		"Editor": {
			models.PermWorkspaceRead, models.PermMemberRead,
			models.PermPostCreate, models.PermPostRead, models.PermPostUpdate, models.PermPostDelete, models.PermPostSchedule,
			models.PermDraftCreate, models.PermDraftRead, models.PermDraftUpdate, models.PermDraftDelete,
			models.PermAnalyticsRead, models.PermSocialAccountRead,
			models.PermMediaUpload, models.PermMediaDelete, models.PermMediaRead,
			// Task permissions for Editor (can create, read, update, but not delete)
			models.PermTaskCreate, models.PermTaskRead, models.PermTaskUpdate, models.PermTaskComment,
		},
		"Viewer": {
			models.PermWorkspaceRead, models.PermMemberRead,
			models.PermPostRead, models.PermDraftRead,
			models.PermAnalyticsRead, models.PermSocialAccountRead, models.PermMediaRead,
			// Task read-only for Viewer
			models.PermTaskRead,
		},
	}

	// Get default permissions from new role system for new role names
	defaultPermissions := models.GetDefaultRolePermissions()
	if permissions, exists := defaultPermissions[roleName]; exists {
		return permissions
	}

	// Fallback to legacy mapping
	if permissions, exists := legacyRoleMap[roleName]; exists {
		return permissions
	}

	// Default to viewer permissions if role not found
	return legacyRoleMap["Viewer"]
}
