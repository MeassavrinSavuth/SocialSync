package routes

import (
	"social-sync-backend/controllers"
	"social-sync-backend/middleware"

	"github.com/gorilla/mux"
)

func RegisterAnalyticsRoutes(r *mux.Router) {
	// Analytics routes with JWT middleware
	analyticsRouter := r.PathPrefix("/api/analytics").Subrouter()
	analyticsRouter.Use(middleware.JWTMiddleware)

	// Get analytics overview
	analyticsRouter.HandleFunc("/overview", controllers.GetAnalyticsOverview).Methods("GET")

	// Get platform comparison
	analyticsRouter.HandleFunc("/platforms", controllers.GetPlatformComparison).Methods("GET")

	// Manual analytics sync
	analyticsRouter.HandleFunc("/sync", controllers.SyncAnalytics).Methods("POST")
}
