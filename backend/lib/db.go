// lib/database.go
package lib

import (
    "context" // Add context import
    "database/sql" // Keep sql package
    "fmt"
    "log"
    "net/http" // Add net/http import for http.Request
    "os"
    // "github.com/joho/godotenv" // Not needed here if loaded in main
    _ "github.com/lib/pq" // Keep pq driver
)

var DB *sql.DB // Keep DB as *sql.DB

func ConnectDB() {
    dbURL := os.Getenv("DATABASE_URL")
    if dbURL == "" {
        log.Fatal("DATABASE_URL environment variable is not set")
    }

    var err error
    DB, err = sql.Open("postgres", dbURL) // Use sql.Open
    if err != nil {
        log.Fatal("Error connecting to DB:", err)
    }

    // Use DB.PingContext with context.Background()
    err = DB.PingContext(context.Background())
    if err != nil {
        log.Fatal("Error pinging DB:", err)
    }

    fmt.Println("✅ Connected to PostgreSQL DB")
}

func GetDB() *sql.DB { // Returns *sql.DB
    return DB
}

// GetUserIDFromContext: This function is critical for authentication.
// It will now use sql.DB's context-aware methods.
func GetUserIDFromContext(r *http.Request) (string, error) {
    // IMPORTANT: This is a TEMPORARY placeholder.
    // In a production app, this would get the user ID from the request context
    // AFTER a JWT authentication middleware has validated the token and set the ID.

    // Option 1: From a query parameter
    userIDParam := r.URL.Query().Get("userId")
    if userIDParam != "" {
        log.Printf("DEBUG (GetUserID): Found userID from query param: %s", userIDParam)
        return userIDParam, nil
    }

    // Option 2: From a header (e.g., from an API key or temporary test setup)
    userIDHeader := r.Header.Get("X-User-ID")
    if userIDHeader != "" {
        log.Printf("DEBUG (GetUserID): Found userID from X-User-ID header: %s", userIDHeader)
        return userIDHeader, nil
    }

    // Option 3: From a context value set by an auth middleware (RECOMMENDED FOR PRODUCTION)
    // This is what will be used once JWT middleware is fully in place.
    if ctxUserID, ok := r.Context().Value("userID").(string); ok && ctxUserID != "" {
        log.Printf("DEBUG (GetUserID): Found userID from request context: %s", ctxUserID)
        return ctxUserID, nil
    }

    // Fallback (for initial testing only, ensure 'testuser' exists in your users table)
    var dbUserID string
    // FIX: Use QueryRowContext for database/sql
    err := DB.QueryRowContext(r.Context(), "SELECT id FROM users WHERE username = $1", "testuser").Scan(&dbUserID)
    if err != nil {
        log.Printf("DEBUG (GetUserID): Fallback 'testuser' lookup failed: %v", err)
        return "", fmt.Errorf("user ID not found; authentication middleware not active or fallback user not found: %w", err)
    }
    log.Printf("DEBUG (GetUserID): Using fallback 'testuser' ID: %s", dbUserID)
    return dbUserID, nil
}