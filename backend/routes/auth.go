package routes

import (
	"net/http"
	"social-sync-backend/controllers"
	"social-sync-backend/middleware"
	"social-sync-backend/lib"

	"github.com/gorilla/mux"
)

// AuthRoutes configures authentication and social routes
func AuthRoutes(r *mux.Router) {
	// ----------- Auth ----------- //
	r.HandleFunc("/api/register", controllers.SignupHandler).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/auth/login", controllers.LoginHandler).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/auth/refresh", controllers.RefreshTokenHandler).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/auth/verify", controllers.VerifyEmailHandler).Methods("POST")

	// ----------- Google OAuth ----------- //
	r.HandleFunc("/auth/google/login", controllers.GoogleRedirectHandler()).Methods("GET")
	r.HandleFunc("/auth/google/callback", controllers.GoogleCallbackHandler(lib.DB)).Methods("GET")

	// ----------- Facebook OAuth ----------- //
	// JWT is required before redirect to ensure the user is authenticated
	r.Handle("/auth/facebook/login", middleware.EnableCORS(middleware.JWTMiddleware(
		http.HandlerFunc(controllers.FacebookRedirectHandler()),
	))).Methods("GET")

	// Do NOT wrap callback in JWT — Facebook cannot send your token
	r.HandleFunc("/auth/facebook/callback", controllers.FacebookCallbackHandler(lib.DB)).Methods("GET")

	// ----------- Social Account Management ----------- //
	r.Handle("/api/social-accounts", middleware.EnableCORS(middleware.JWTMiddleware(
		http.HandlerFunc(controllers.GetSocialAccountsHandler(lib.DB)),
	))).Methods("GET")

	r.Handle("/api/social-accounts/{platform}", middleware.EnableCORS(middleware.JWTMiddleware(
		http.HandlerFunc(controllers.DisconnectSocialAccountHandler(lib.DB)),
	))).Methods("DELETE")

	// ----------- Facebook Page Post (Optional) ----------- //
	r.Handle("/api/facebook/post", middleware.JWTMiddleware(
		http.HandlerFunc(controllers.PostToFacebookHandler(lib.DB)),
	)).Methods("POST")

	// ----------- Instagram Connect (NEW) ----------- //
	r.Handle("/connect/instagram", middleware.JWTMiddleware(
		http.HandlerFunc(controllers.ConnectInstagramHandler(lib.DB)),
	)).Methods("POST")

	r.Handle("/api/instagram/post", middleware.JWTMiddleware(http.HandlerFunc(controllers.PostToInstagramHandler(lib.DB)))).Methods("POST")

}
