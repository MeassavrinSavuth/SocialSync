package routes

import (
	"social-sync-backend/controllers"
	"social-sync-backend/middleware"

	"github.com/gorilla/mux"
)

func RegisterDraftPostRoutes(r *mux.Router) {
	drafts := r.PathPrefix("/api/workspaces/{workspaceId}/drafts").Subrouter()
	drafts.Use(middleware.JWTMiddleware)
	drafts.HandleFunc("", controllers.ListDraftPosts).Methods("GET")
	drafts.HandleFunc("", controllers.CreateDraftPost).Methods("POST")
	drafts.HandleFunc("/{draftId}", controllers.UpdateDraftPost).Methods("PATCH")
	drafts.HandleFunc("/{draftId}", controllers.DeleteDraftPost).Methods("DELETE")
	drafts.HandleFunc("/{draftId}/publish", controllers.PublishDraftPost).Methods("POST")

	// Draft comments
	comments := drafts.PathPrefix("/{draftId}/comments").Subrouter()
	comments.HandleFunc("", controllers.DraftListComments).Methods("GET")
	comments.HandleFunc("", controllers.DraftAddComment).Methods("POST")
	comments.HandleFunc("/{commentId}", controllers.DraftDeleteComment).Methods("DELETE")

	// Draft reactions
	reactions := drafts.PathPrefix("/{draftId}/reactions").Subrouter()
	reactions.HandleFunc("", controllers.DraftGetReactions).Methods("GET")
	reactions.HandleFunc("", controllers.DraftToggleReaction).Methods("POST")
}
