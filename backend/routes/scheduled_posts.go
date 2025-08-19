package routes

import (
	"net/http"
	"social-sync-backend/controllers"
	"social-sync-backend/lib"
	"social-sync-backend/middleware"

	"github.com/gorilla/mux"
)

// ScheduledPostRoutes configures scheduled posts routes
func ScheduledPostRoutes(r *mux.Router) {
	// ----------- Scheduled Posts ----------- //
	r.Handle("/api/scheduled-posts", middleware.EnableCORS(middleware.JWTMiddleware(
		http.HandlerFunc(controllers.CreateScheduledPostHandler(lib.DB)),
	))).Methods("POST", "OPTIONS")

	r.Handle("/api/scheduled-posts", middleware.EnableCORS(middleware.JWTMiddleware(
		http.HandlerFunc(controllers.GetScheduledPostsHandler(lib.DB)),
	))).Methods("GET", "OPTIONS")

	r.Handle("/api/scheduled-posts/{id}", middleware.EnableCORS(middleware.JWTMiddleware(
		http.HandlerFunc(controllers.GetScheduledPostHandler(lib.DB)),
	))).Methods("GET", "OPTIONS")

	r.Handle("/api/scheduled-posts/{id}", middleware.EnableCORS(middleware.JWTMiddleware(
		http.HandlerFunc(controllers.UpdateScheduledPostHandler(lib.DB)),
	))).Methods("PUT", "OPTIONS")

	r.Handle("/api/scheduled-posts/{id}", middleware.EnableCORS(middleware.JWTMiddleware(
		http.HandlerFunc(controllers.DeleteScheduledPostHandler(lib.DB)),
	))).Methods("DELETE", "OPTIONS")
}
