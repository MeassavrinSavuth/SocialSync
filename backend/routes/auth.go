package routes

import (
	"social-sync-backend/controllers"
	"social-sync-backend/lib"
	"github.com/gorilla/mux"
)

// AuthRoutes configures authentication routes and returns a router
func AuthRoutes() *mux.Router {
	r := mux.NewRouter()
	
	// Authentication routes
	r.HandleFunc("/api/register", controllers.SignupHandler).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/auth/login", controllers.LoginHandler).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/auth/refresh", controllers.RefreshTokenHandler).Methods("POST", "OPTIONS")
	// r.HandleFunc("/api/auth/oauth/google", controllers.GoogleOAuthHandler).Methods("POST")
	r.HandleFunc("/api/auth/verify", controllers.VerifyEmailHandler).Methods("POST")
	r.HandleFunc("/auth/google/login", controllers.GoogleRedirectHandler()).Methods("GET")
	// r.HandleFunc("/api/auth/google/login", controllers.GoogleRedirectHandler(db)).Methods("GET")
	r.HandleFunc("/auth/google/callback", controllers.GoogleCallbackHandler(lib.DB)).Methods("GET")
	r.HandleFunc("/auth/facebook/login", controllers.FacebookRedirectHandler()).Methods("GET")
	r.HandleFunc("/auth/facebook/callback", controllers.FacebookCallbackHandler(lib.DB)).Methods("GET")

	// r.Handle("/api/profile", middleware.JWTMiddleware(http.HandlerFunc(controllers.ProfileHandler)))


	// Add more auth routes here as needed
	// r.HandleFunc("/api/login", controllers.LoginHandler).Methods("POST", "OPTIONS")
	// r.HandleFunc("/api/logout", controllers.LogoutHandler).Methods("POST", "OPTIONS")
	
	return r
}