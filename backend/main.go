package main

import (
	"log"
	"net/http"
	"os"
	"social-sync-backend/lib"
	"social-sync-backend/routes"

	"github.com/joho/godotenv"
)

func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	// Load environment variables
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	// Initialize DB
	lib.ConnectDB()
	defer lib.DB.Close()
	log.Println("Successfully connected to the database!") // This should always print if DB is good

	// Setup routes
	r := routes.InitRoutes()

	handler := CORSMiddleware(r)

	// Get port from environment or default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Println("🚀 Server running on port", port)
	log.Fatal(http.ListenAndServe(":"+port, handler)) // Use wrapped handler here
}
