package controllers

import (
    "context"
    "database/sql"
    "encoding/json"
    "fmt"
    "io/ioutil" // Import for ioutil.ReadAll
    "net/http"
    "os"
	"bytes"

    "social-sync-backend/lib"
    "social-sync-backend/models"

    "golang.org/x/oauth2"
    "golang.org/x/oauth2/google"
)

// Lazy-load the config after .env is loaded
func getGoogleOAuthConfig() *oauth2.Config {
    return &oauth2.Config{
        ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
        ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
        RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URI"), // e.g., http://localhost:8080/auth/google/callback
        Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"},
        Endpoint:     google.Endpoint,
    }
}

func GoogleRedirectHandler() http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        config := getGoogleOAuthConfig()
		 // --- ADD THIS LINE ---
        fmt.Printf("DEBUG: App's configured RedirectURL: %s\n", config.RedirectURL) 
        // --- END ADDITION ---
        url := config.AuthCodeURL("state-token", oauth2.AccessTypeOffline)
        http.Redirect(w, r, url, http.StatusTemporaryRedirect)
    }
}


func GoogleCallbackHandler(db *sql.DB) http.HandlerFunc {

    return func(w http.ResponseWriter, r *http.Request) {
        code := r.URL.Query().Get("code")
        if code == "" {
            fmt.Println("ERROR: Missing code from Google callback.") // Debug print
            http.Error(w, "Missing code", http.StatusBadRequest)
            return
        }

        if err := db.Ping(); err != nil {
            fmt.Printf("ERROR: Database not reachable in callback: %v\n", err) // Debug print
            http.Error(w, "Database not reachable", http.StatusInternalServerError)
            return
        }

        config := getGoogleOAuthConfig()
        token, err := config.Exchange(context.Background(), code)
        if err != nil {
            fmt.Printf("ERROR: Failed to exchange token: %v\n", err) // Debug print
            http.Error(w, "Failed to exchange token", http.StatusInternalServerError)
            return
        }
        fmt.Printf("DEBUG: Token exchanged successfully. Access Token (truncated): %s...\n", token.AccessToken[:10])


        client := config.Client(context.Background(), token)
        resp, err := client.Get("https://www.googleapis.com/oauth2/v3/userinfo")
        if err != nil {
            fmt.Printf("ERROR: Failed to get user info from Google API: %v\n", err) // Debug print
            http.Error(w, "Failed to get user info", http.StatusInternalServerError)
            return
        }
        defer resp.Body.Close()

        // --- START DEBUGGING GOOGLE USER INFO ---
        // Read the entire response body for inspection
        bodyBytes, err := ioutil.ReadAll(resp.Body)
        if err != nil {
            fmt.Printf("ERROR: Failed to read Google user info response body: %v\n", err)
            http.Error(w, "Failed to read user info response", http.StatusInternalServerError)
            return
        }

        // Print the raw JSON response from Google
        fmt.Printf("DEBUG: Raw Google User Info Response: %s\n", string(bodyBytes))

        // Re-create a new reader from the bytes to allow json.NewDecoder to read it
        resp.Body = ioutil.NopCloser(bytes.NewBuffer(bodyBytes))
        // --- END DEBUGGING GOOGLE USER INFO ---


        var userInfo models.GoogleUserInfo
        if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
            fmt.Printf("ERROR: Failed to decode user info JSON: %v\n", err) // Debug print
            http.Error(w, "Failed to decode user info", http.StatusInternalServerError)
            return
        }

        // Check if userInfo fields are populated
        fmt.Printf("DEBUG: Decoded Google User Info -> Sub: '%s', Name: '%s', Email: '%s', EmailVerified: %t\n",
            userInfo.Sub, userInfo.Name, userInfo.Email, userInfo.EmailVerified)

        if userInfo.Sub == "" {
            fmt.Println("WARNING: userInfo.Sub is empty after decoding.")
            http.Error(w, "Google Sub ID not found in user info", http.StatusInternalServerError)
            return
        }
        if userInfo.Email == "" {
            fmt.Println("WARNING: userInfo.Email is empty after decoding.")
            // Decide if you want to error out or proceed without email
            // For now, it's a warning, but often email is crucial for user identification
        }
        if userInfo.Name == "" {
            fmt.Println("WARNING: userInfo.Name is empty after decoding.")
        }

        // Check if user already exists
        var userID string
        // Log the value being used in the query for clarity
        fmt.Printf("DEBUG: Querying for existing user with provider_id: %s\n", userInfo.Sub)
        err = db.QueryRow(`
            SELECT user_id FROM auth_providers
            WHERE provider = 'google' AND provider_id = $1
        `, userInfo.Sub).Scan(&userID)

        if err == sql.ErrNoRows {
            fmt.Println("DEBUG: No existing user found with this Google ID. Creating new user...")
            // Create new user
            // Log values before insertion
            fmt.Printf("DEBUG: Inserting into users: Name='%s', Email='%s'\n", userInfo.Name, userInfo.Email)
            err = db.QueryRow(`
                INSERT INTO users (name, email, is_verified, is_active, created_at, updated_at)
                VALUES ($1, $2, true, true, NOW(), NOW())
                RETURNING id
            `, userInfo.Name, userInfo.Email).Scan(&userID)
            if err != nil {
                fmt.Printf("ERROR: Failed to create new user in DB: %v\n", err) // Specific error
                http.Error(w, "Failed to create user", http.StatusInternalServerError)
                return
            }

            // Log values before insertion
            fmt.Printf("DEBUG: Inserting into auth_providers: provider='google', provider_id='%s', user_id='%s'\n", userInfo.Sub, userID)
            _, err = db.Exec(`
                INSERT INTO auth_providers (provider, provider_id, user_id, created_at)
                VALUES ('google', $1, $2, NOW())
            `, userInfo.Sub, userID)

            if err != nil {
                http.Error(w, "Failed to link auth provider", http.StatusInternalServerError)
                return
            }
            fmt.Println("DEBUG: Auth provider linked successfully.")
        } else if err != nil {
            fmt.Printf("ERROR: DB error during existing user check: %v\n", err) // Specific error
            http.Error(w, "DB error", http.StatusInternalServerError)
            return
        } else {
        }

        // Generate access & refresh tokens
        accessToken, err := lib.GenerateAccessToken(userID)
        if err != nil {
            fmt.Printf("ERROR: Failed to generate access token: %v\n", err) // Specific error
            http.Error(w, "Token error", http.StatusInternalServerError)
            return
        }
        refreshToken, err := lib.GenerateRefreshToken(userID)
        if err != nil {
            fmt.Printf("ERROR: Failed to generate refresh token: %v\n", err) // Specific error
            http.Error(w, "Token error", http.StatusInternalServerError)
            return
        }

        // Redirect back to frontend with tokens
        redirectURL := fmt.Sprintf("http://localhost:3000/auth/callback?access_token=%s&refresh_token=%s", accessToken, refreshToken)
        http.Redirect(w, r, redirectURL, http.StatusSeeOther)
    }
}