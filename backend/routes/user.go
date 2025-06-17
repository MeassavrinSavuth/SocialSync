package routes

import (
	"net/http"
	"social-sync-backend/controllers"
	"social-sync-backend/middleware"
	"github.com/gorilla/mux"
	// "social-sync-backend/lib"

)

func RegisterUserRoutes(r *mux.Router) {
	// r.Handle("/api/profile", middleware.JWTMiddleware(http.HandlerFunc(controllers.ProfileHandler)))
	r.Handle("/api/dashboard", middleware.JWTMiddleware(http.HandlerFunc(controllers.DashboardHandler))).Methods("GET")
	r.Handle("/api/profile", middleware.JWTMiddleware(http.HandlerFunc(controllers.ProfileHandler))).Methods("GET", "PUT", "DELETE", "OPTIONS")
    r.Handle("/api/profile/image", middleware.JWTMiddleware(http.HandlerFunc(controllers.ProfileImageHandler))).Methods("POST", "OPTIONS")
    r.Handle("/api/profile/image/{userID}", middleware.JWTMiddleware(http.HandlerFunc(controllers.ProfileImageHandler))).Methods("GET")
	// r.Handle("/api/social-accounts", middleware.JWTMiddleware(http.HandlerFunc(controllers.GetSocialAccountsHandler(lib.DB)))).Methods("GET")

}
