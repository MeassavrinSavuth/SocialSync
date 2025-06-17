// lib/database.go
package lib

import (
    "context"
    "database/sql"
    "fmt"
    "log"
    // "net/http"
    "os"
    
    _ "github.com/lib/pq"
)

var DB *sql.DB

func ConnectDB() {
    dbURL := os.Getenv("DATABASE_URL")
    if dbURL == "" {
        log.Fatal("DATABASE_URL environment variable is not set")
    }

    var err error
    DB, err = sql.Open("postgres", dbURL)
    if err != nil {
        log.Fatal("Error connecting to DB:", err)
    }

    err = DB.PingContext(context.Background())
    if err != nil {
        log.Fatal("Error pinging DB:", err)
    }

    fmt.Println("✅ Connected to PostgreSQL DB")
}

func GetDB() *sql.DB {
    return DB
}

// GetUserIDFromContext retrieves the user ID from the context (set by auth middleware).
// func GetUserIDFromContext(r *http.Request) (string, error) {
//     if ctxUserID, ok := r.Context().Value("user_id").(string); ok && ctxUserID != "" {
//         log.Printf("DEBUG (GetUserID): Found userID from request context: %s", ctxUserID)
//         return ctxUserID, nil
//     }

//     // Remove fallback logic. Context-based auth is required.
//     return "", fmt.Errorf("user ID not found in context; ensure authentication middleware is active")
// }
