package controllers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"social-sync-backend/lib"
	"social-sync-backend/middleware"
	"social-sync-backend/models"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/lib/pq"
)

// GetWorkspaceRoles returns all available roles for a workspace
func GetWorkspaceRoles(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserIDFromContext(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	workspaceID := vars["workspaceId"]

	// Check if user has permission to read roles
	hasPermission, err := middleware.CheckUserPermission(userID, workspaceID, models.PermMemberRead)
	if err != nil {
		http.Error(w, "Permission check failed", http.StatusInternalServerError)
		return
	}

	if !hasPermission {
		http.Error(w, "Insufficient permissions", http.StatusForbidden)
		return
	}

	// Get all system roles
	roles := []models.Role{}

	// Create system roles with their default permissions
	defaultPermissions := models.GetDefaultRolePermissions()

	for roleName, permissions := range defaultPermissions {
		role := models.Role{
			ID:           uuid.New(),
			Name:         roleName,
			Description:  getRoleDescription(roleName),
			IsSystemRole: true,
			Permissions:  []models.Permission{},
		}

		// Convert permission strings to Permission objects
		for _, permName := range permissions {
			permission := models.Permission{
				ID:          uuid.New(),
				Name:        permName,
				Description: getPermissionDescription(permName),
				Resource:    getResourceFromPermission(permName),
				Action:      getActionFromPermission(permName),
			}
			role.Permissions = append(role.Permissions, permission)
		}

		roles = append(roles, role)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(roles)
}

// UpdateUserRole updates a user's role in a workspace
func UpdateUserRole(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserIDFromContext(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	workspaceID := vars["workspaceId"]
	targetUserID := vars["userId"]

	// Check if user has permission to change roles
	hasPermission, err := middleware.CheckUserPermission(userID, workspaceID, models.PermMemberRoleChange)
	if err != nil {
		http.Error(w, "Permission check failed", http.StatusInternalServerError)
		return
	}

	if !hasPermission {
		http.Error(w, "Insufficient permissions", http.StatusForbidden)
		return
	}

	var req struct {
		Role string `json:"role"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate role
	validRoles := []string{
		models.RoleWorkspaceAdmin,
		models.RoleContentManager,
		models.RoleSocialManager,
		models.RoleAnalyst,
		models.RoleContributor,
		models.RoleViewer,
	}

	isValidRole := false
	for _, validRole := range validRoles {
		if req.Role == validRole {
			isValidRole = true
			break
		}
	}

	if !isValidRole {
		http.Error(w, "Invalid role", http.StatusBadRequest)
		return
	}

	// Prevent users from changing their own role to avoid privilege escalation
	if userID == targetUserID {
		http.Error(w, "Cannot change your own role", http.StatusForbidden)
		return
	}

	// Update user role in database
	_, err = lib.DB.Exec(`
		UPDATE workspace_members 
		SET role = $1 
		WHERE workspace_id = $2 AND user_id = $3
	`, req.Role, workspaceID, targetUserID)

	if err != nil {
		http.Error(w, "Failed to update user role", http.StatusInternalServerError)
		return
	}

	// Broadcast role change to workspace so clients can refetch permissions
	if hub != nil {
		msg, _ := json.Marshal(map[string]interface{}{
			"type":    "member_role_changed",
			"user_id": targetUserID,
			"role":    req.Role,
		})
		hub.broadcast(workspaceID, websocket.TextMessage, msg)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "User role updated successfully",
		"role":    req.Role,
	})
}

// GetUserPermissions returns all permissions for a user in a workspace
func GetUserPermissions(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserIDFromContext(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	workspaceID := vars["workspaceId"]

	permissions, err := middleware.GetUserPermissions(userID, workspaceID)
	if err != nil {
		http.Error(w, "Failed to get user permissions", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"permissions": permissions,
	})
}

// GrantCustomPermission grants a custom permission to a user in a workspace
func GrantCustomPermission(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserIDFromContext(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	workspaceID := vars["workspaceId"]
	targetUserID := vars["userId"]

	// Check if user has permission to manage roles
	hasPermission, err := middleware.CheckUserPermission(userID, workspaceID, models.PermMemberRoleChange)
	if err != nil {
		http.Error(w, "Permission check failed", http.StatusInternalServerError)
		return
	}

	if !hasPermission {
		http.Error(w, "Insufficient permissions", http.StatusForbidden)
		return
	}

	var req struct {
		Permission string `json:"permission"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get current custom permissions
	var currentPermissionsJSON []byte
	err = lib.DB.QueryRow(`
		SELECT permissions 
		FROM workspace_user_permissions 
		WHERE workspace_id = $1 AND user_id = $2
	`, workspaceID, targetUserID).Scan(&currentPermissionsJSON)

	var currentPermissions []string
	if err != nil && err != sql.ErrNoRows {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if err == nil {
		json.Unmarshal(currentPermissionsJSON, &currentPermissions)
	}

	// Add new permission if not already present
	hasNewPermission := false
	for _, perm := range currentPermissions {
		if perm == req.Permission {
			hasNewPermission = true
			break
		}
	}

	if !hasNewPermission {
		currentPermissions = append(currentPermissions, req.Permission)
	}

	// Update or insert permissions
	newPermissionsJSON, _ := json.Marshal(currentPermissions)

	if err == sql.ErrNoRows {
		// Insert new record
		_, err = lib.DB.Exec(`
			INSERT INTO workspace_user_permissions (workspace_id, user_id, permissions)
			VALUES ($1, $2, $3)
		`, workspaceID, targetUserID, newPermissionsJSON)
	} else {
		// Update existing record
		_, err = lib.DB.Exec(`
			UPDATE workspace_user_permissions 
			SET permissions = $1 
			WHERE workspace_id = $2 AND user_id = $3
		`, newPermissionsJSON, workspaceID, targetUserID)
	}

	if err != nil {
		http.Error(w, "Failed to grant permission", http.StatusInternalServerError)
		return
	}

	// Notify workspace clients to refresh permissions (reuse member_role_changed for simplicity)
	if hub != nil {
		msg, _ := json.Marshal(map[string]interface{}{
			"type":       "member_role_changed",
			"user_id":    targetUserID,
			"permission": req.Permission,
			"action":     "granted",
		})
		hub.broadcast(workspaceID, websocket.TextMessage, msg)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message":    "Permission granted successfully",
		"permission": req.Permission,
	})
}

// RevokeCustomPermission revokes a custom permission from a user in a workspace
func RevokeCustomPermission(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserIDFromContext(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	workspaceID := vars["workspaceId"]
	targetUserID := vars["userId"]
	permission := vars["permission"]

	// Check if user has permission to manage roles
	hasPermission, err := middleware.CheckUserPermission(userID, workspaceID, models.PermMemberRoleChange)
	if err != nil {
		http.Error(w, "Permission check failed", http.StatusInternalServerError)
		return
	}

	if !hasPermission {
		http.Error(w, "Insufficient permissions", http.StatusForbidden)
		return
	}

	// Get current custom permissions
	var currentPermissionsJSON []byte
	err = lib.DB.QueryRow(`
		SELECT permissions 
		FROM workspace_user_permissions 
		WHERE workspace_id = $1 AND user_id = $2
	`, workspaceID, targetUserID).Scan(&currentPermissionsJSON)

	if err == sql.ErrNoRows {
		http.Error(w, "No custom permissions found", http.StatusNotFound)
		return
	}

	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	var currentPermissions []string
	json.Unmarshal(currentPermissionsJSON, &currentPermissions)

	// Remove the permission
	var newPermissions []string
	for _, perm := range currentPermissions {
		if perm != permission {
			newPermissions = append(newPermissions, perm)
		}
	}

	// Update permissions
	newPermissionsJSON, _ := json.Marshal(newPermissions)
	_, err = lib.DB.Exec(`
		UPDATE workspace_user_permissions 
		SET permissions = $1 
		WHERE workspace_id = $2 AND user_id = $3
	`, newPermissionsJSON, workspaceID, targetUserID)

	if err != nil {
		http.Error(w, "Failed to revoke permission", http.StatusInternalServerError)
		return
	}

	// Notify workspace clients to refresh permissions (reuse member_role_changed for simplicity)
	if hub != nil {
		msg, _ := json.Marshal(map[string]interface{}{
			"type":       "member_role_changed",
			"user_id":    targetUserID,
			"permission": permission,
			"action":     "revoked",
		})
		hub.broadcast(workspaceID, websocket.TextMessage, msg)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Permission revoked successfully",
	})
}

// SetSocialAccountPermissions sets permissions for a specific social media account
func SetSocialAccountPermissions(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserIDFromContext(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	workspaceID := vars["workspaceId"]
	targetUserID := vars["userId"]
	socialAccountID := vars["socialAccountId"]

	// Check if user has permission to manage social accounts
	hasPermission, err := middleware.CheckUserPermission(userID, workspaceID, models.PermSocialAccountConnect)
	if err != nil {
		http.Error(w, "Permission check failed", http.StatusInternalServerError)
		return
	}

	if !hasPermission {
		http.Error(w, "Insufficient permissions", http.StatusForbidden)
		return
	}

	var req struct {
		Permissions []string `json:"permissions"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Insert or update social account permissions
	_, err = lib.DB.Exec(`
		INSERT INTO social_account_permissions (workspace_id, user_id, social_account_id, permissions)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (workspace_id, user_id, social_account_id)
		DO UPDATE SET permissions = $4
	`, workspaceID, targetUserID, socialAccountID, pq.Array(req.Permissions))

	if err != nil {
		http.Error(w, "Failed to set social account permissions", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Social account permissions updated successfully",
	})
}

// Helper functions
func getRoleDescription(roleName string) string {
	descriptions := map[string]string{
		models.RoleWorkspaceAdmin: "Full administrative access to the workspace including member management, settings, and all content operations",
		models.RoleContentManager: "Manage all content creation, editing, publishing, and scheduling across all social media platforms",
		models.RoleSocialManager:  "Manage social media accounts, connections, and posting with limited content management access",
		models.RoleAnalyst:        "View and analyze performance data, generate reports, with read-only access to content",
		models.RoleContributor:    "Create and edit content, limited publishing capabilities, contribute to team projects",
		models.RoleViewer:         "Read-only access to workspace content, analytics, and social media data",
	}
	return descriptions[roleName]
}

func getPermissionDescription(permission string) string {
	descriptions := map[string]string{
		models.PermWorkspaceRead:   "View workspace information and settings",
		models.PermWorkspaceUpdate: "Edit workspace settings and information",
		models.PermWorkspaceDelete: "Delete the workspace",
		models.PermWorkspaceInvite: "Invite new members to the workspace",

		models.PermMemberRead:       "View workspace members and their roles",
		models.PermMemberInvite:     "Invite new members to the workspace",
		models.PermMemberRemove:     "Remove members from the workspace",
		models.PermMemberRoleChange: "Change member roles and permissions",

		models.PermPostCreate:   "Create new social media posts",
		models.PermPostRead:     "View social media posts and content",
		models.PermPostUpdate:   "Edit existing social media posts",
		models.PermPostDelete:   "Delete social media posts",
		models.PermPostPublish:  "Publish posts to social media platforms",
		models.PermPostSchedule: "Schedule posts for future publishing",

		models.PermDraftCreate: "Create draft posts",
		models.PermDraftRead:   "View draft posts",
		models.PermDraftUpdate: "Edit draft posts",
		models.PermDraftDelete: "Delete draft posts",

		models.PermAnalyticsRead:     "View analytics and performance data",
		models.PermAnalyticsExport:   "Export analytics data and reports",
		models.PermAnalyticsAdvanced: "Access advanced analytics features",

		models.PermSocialAccountConnect:    "Connect new social media accounts",
		models.PermSocialAccountDisconnect: "Disconnect social media accounts",
		models.PermSocialAccountRead:       "View connected social media accounts",
		models.PermSocialAccountPost:       "Post to connected social media accounts",

		models.PermMediaUpload: "Upload media files",
		models.PermMediaDelete: "Delete media files",
		models.PermMediaRead:   "View media files",
	}
	return descriptions[permission]
}

func getResourceFromPermission(permission string) string {
	if len(permission) == 0 {
		return ""
	}
	parts := []rune(permission)
	for i, r := range parts {
		if r == ':' {
			return string(parts[:i])
		}
	}
	return permission
}

func getActionFromPermission(permission string) string {
	if len(permission) == 0 {
		return ""
	}
	parts := []rune(permission)
	for i, r := range parts {
		if r == ':' {
			return string(parts[i+1:])
		}
	}
	return ""
}
