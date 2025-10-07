package routes

import (
	"net/http"
	"social-sync-backend/controllers"
	"social-sync-backend/middleware"
	"social-sync-backend/models"

	"github.com/gorilla/mux"
)

// RegisterRoleManagementRoutes registers all role and permission management routes
func RegisterRoleManagementRoutes(r *mux.Router) {
	// Role management routes
	roleRouter := r.PathPrefix("/api/workspaces/{workspaceId}").Subrouter()

	// Get all available roles for a workspace
	roleRouter.Handle("/roles",
		middleware.JWTMiddleware(
			middleware.LoadUserPermissions(
				http.HandlerFunc(controllers.GetWorkspaceRoles),
			),
		),
	).Methods("GET")

	// Update user role in workspace
	roleRouter.Handle("/members/{userId}/role",
		middleware.JWTMiddleware(
			middleware.RequirePermission(models.PermMemberRoleChange)(
				http.HandlerFunc(controllers.UpdateUserRole),
			),
		),
	).Methods("PUT")

	// Get user permissions in workspace
	roleRouter.Handle("/permissions",
		middleware.JWTMiddleware(
			http.HandlerFunc(controllers.GetUserPermissions),
		),
	).Methods("GET")

	// Grant custom permission to user
	roleRouter.Handle("/members/{userId}/permissions",
		middleware.JWTMiddleware(
			middleware.RequirePermission(models.PermMemberRoleChange)(
				http.HandlerFunc(controllers.GrantCustomPermission),
			),
		),
	).Methods("POST")

	// Revoke custom permission from user
	roleRouter.Handle("/members/{userId}/permissions/{permission}",
		middleware.JWTMiddleware(
			middleware.RequirePermission(models.PermMemberRoleChange)(
				http.HandlerFunc(controllers.RevokeCustomPermission),
			),
		),
	).Methods("DELETE")

	// Social account permissions
	roleRouter.Handle("/members/{userId}/social-accounts/{socialAccountId}/permissions",
		middleware.JWTMiddleware(
			middleware.RequirePermission(models.PermSocialAccountConnect)(
				http.HandlerFunc(controllers.SetSocialAccountPermissions),
			),
		),
	).Methods("PUT")

	// Enhanced workspace routes with permission checks
	workspaceRouter := r.PathPrefix("/api/workspaces").Subrouter()

	// Create workspace (no special permission needed - any authenticated user can create)
	workspaceRouter.Handle("",
		middleware.JWTMiddleware(
			http.HandlerFunc(controllers.CreateWorkspace),
		),
	).Methods("POST")

	// List user's workspaces
	workspaceRouter.Handle("",
		middleware.JWTMiddleware(
			http.HandlerFunc(controllers.ListWorkspaces),
		),
	).Methods("GET")

	// Get workspace members with permission check
	workspaceRouter.Handle("/{workspaceId}/members",
		middleware.JWTMiddleware(
			middleware.RequirePermission(models.PermMemberRead)(
				http.HandlerFunc(controllers.ListWorkspaceMembers),
			),
		),
	).Methods("GET")

	// Note: Invite member route is handled in invitation.go to avoid conflicts
	// workspaceRouter.Handle("/{workspaceId}/invite", ...)

	// Remove member from workspace
	workspaceRouter.Handle("/{workspaceId}/members/{memberId}",
		middleware.JWTMiddleware(
			middleware.RequirePermission(models.PermMemberRemove)(
				http.HandlerFunc(controllers.RemoveWorkspaceMember),
			),
		),
	).Methods("DELETE")

	// Leave workspace (users can always leave unless they're the only admin)
	workspaceRouter.Handle("/{workspaceId}/leave",
		middleware.JWTMiddleware(
			http.HandlerFunc(controllers.LeaveWorkspace),
		),
	).Methods("POST")

	// Delete workspace
	workspaceRouter.Handle("/{workspaceId}",
		middleware.JWTMiddleware(
			middleware.RequirePermission(models.PermWorkspaceDelete)(
				http.HandlerFunc(controllers.DeleteWorkspace),
			),
		),
	).Methods("DELETE")

	// Note: UpdateWorkspace controller needs to be implemented
	// workspaceRouter.Handle("/{workspaceId}",
	//	middleware.JWTMiddleware(
	//		middleware.RequirePermission(models.PermWorkspaceUpdate)(
	//			http.HandlerFunc(controllers.UpdateWorkspace),
	//		),
	//	),
	//).Methods("PUT")
}
