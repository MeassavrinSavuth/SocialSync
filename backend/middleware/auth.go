package middleware

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"

	"social-sync-backend/lib"
)

func EnableCORS(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		h.ServeHTTP(w, r)
	})
}

// contextKey is a custom type to avoid context key collisions
type contextKey string

const UserIDKey = contextKey("userID")

// JWTMiddleware validates JWT tokens in Authorization header
func JWTMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		fmt.Println("[JWT DEBUG] Authorization header:", authHeader) // Debug log

		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			fmt.Println("[JWT ERROR] Missing or malformed Authorization header")
			http.Error(w, "Unauthorized: missing or invalid Authorization header", http.StatusUnauthorized)
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")
		fmt.Println("[JWT DEBUG] Extracted token:", token) // Debug log

		claims, err := lib.VerifyToken(token, os.Getenv("JWT_SECRET"))
		if err != nil {
			fmt.Println("[JWT ERROR] Token verification failed:", err)
			http.Error(w, "Unauthorized: invalid token", http.StatusUnauthorized)
			return
		}

		fmt.Println("[JWT DEBUG] Token claims:", claims) // Debug log

		userID, ok := claims["user_id"].(string)
		if !ok || userID == "" {
			fmt.Println("[JWT ERROR] Missing or invalid 'user_id' in token claims")
			http.Error(w, "Unauthorized: invalid token claims", http.StatusUnauthorized)
			return
		}

		fmt.Println("[JWT DEBUG] Authenticated user_id:", userID) // Debug log

		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
