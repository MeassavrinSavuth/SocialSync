package controllers

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"social-sync-backend/middleware"

	"github.com/google/uuid"
	"golang.org/x/oauth2"
)

var pkceStore = make(map[string]string) // In-memory PKCE verifier store

// generatePKCE creates code verifier and code challenge for OAuth PKCE
func generatePKCE() (string, string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", "", err
	}
	codeVerifier := base64.RawURLEncoding.EncodeToString(b)
	h := sha256.Sum256([]byte(codeVerifier))
	codeChallenge := base64.RawURLEncoding.EncodeToString(h[:])
	return codeVerifier, codeChallenge, nil
}

// getTwitterOAuthConfig returns OAuth2 config for Twitter with environment variables
func getTwitterOAuthConfig() *oauth2.Config {
	redirectURL := os.Getenv("TWITTER_REDIRECT_URL")
	if redirectURL == "" {
		log.Fatal("TWITTER_REDIRECT_URL is empty!")
	}

	return &oauth2.Config{
		ClientID:     os.Getenv("TWITTER_CLIENT_ID"),
		ClientSecret: os.Getenv("TWITTER_CLIENT_SECRET"),
		RedirectURL:  redirectURL,
		Scopes:       []string{"tweet.read", "tweet.write", "users.read"},
		Endpoint: oauth2.Endpoint{
			AuthURL:  "https://twitter.com/i/oauth2/authorize",
			TokenURL: "https://api.twitter.com/2/oauth2/token",
		},
	}
}

// TwitterRedirectHandler initiates the OAuth flow and redirects to Twitter auth page
func TwitterRedirectHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		config := getTwitterOAuthConfig()

		appUserIDStr, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "Unauthorized: User not authenticated.", http.StatusUnauthorized)
			return
		}
		if _, err := uuid.Parse(appUserIDStr); err != nil {
			http.Error(w, "Invalid user ID format.", http.StatusInternalServerError)
			return
		}

		codeVerifier, codeChallenge, err := generatePKCE()
		if err != nil {
			http.Error(w, "Failed to generate PKCE parameters", http.StatusInternalServerError)
			return
		}

		state := fmt.Sprintf("%s:%d", appUserIDStr, time.Now().UnixNano())
		pkceStore[state] = codeVerifier

		authURL := config.AuthCodeURL(state,
			oauth2.SetAuthURLParam("code_challenge", codeChallenge),
			oauth2.SetAuthURLParam("code_challenge_method", "S256"),
			oauth2.SetAuthURLParam("prompt", "login"), // force account picker/login
		)

		http.Redirect(w, r, authURL, http.StatusTemporaryRedirect)
	}
}

// TwitterCallbackHandler handles Twitter OAuth callback, fetches user data, saves to DB, then redirects frontend
func TwitterCallbackHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		state := r.URL.Query().Get("state")
		if state == "" {
			http.Error(w, "Missing state parameter", http.StatusBadRequest)
			return
		}

		parts := strings.Split(state, ":")
		if len(parts) < 1 {
			http.Error(w, "Invalid state parameter format", http.StatusBadRequest)
			return
		}

		appUserIDStr := parts[0]
		if _, err := uuid.Parse(appUserIDStr); err != nil {
			http.Error(w, "Invalid user ID in state parameter", http.StatusBadRequest)
			return
		}

		// Handle cancel/error case gracefully
		if errParam := r.URL.Query().Get("error"); errParam != "" {
			log.Printf("Twitter OAuth cancelled or errored: %s", errParam)
			frontendURL := os.Getenv("FRONTEND_URL")
			if frontendURL == "" {
				frontendURL = "http://localhost:3000"
			}
			http.Redirect(w, r, frontendURL+"/home/manage-accounts?oauth=twitter&status=cancelled", http.StatusSeeOther)
			return
		}

		code := r.URL.Query().Get("code")
		if code == "" {
			// No code and no explicit error -> treat as cancelled
			frontendURL := os.Getenv("FRONTEND_URL")
			if frontendURL == "" {
				frontendURL = "http://localhost:3000"
			}
			http.Redirect(w, r, frontendURL+"/home/manage-accounts?oauth=twitter&status=cancelled", http.StatusSeeOther)
			return
		}

		codeVerifier, exists := pkceStore[state]
		if !exists {
			http.Error(w, "Invalid state: code verifier not found", http.StatusBadRequest)
			return
		}
		delete(pkceStore, state)

		config := getTwitterOAuthConfig()
		token, err := config.Exchange(context.Background(), code,
			oauth2.SetAuthURLParam("code_verifier", codeVerifier),
		)
		if err != nil {
			http.Error(w, "Token exchange failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		client := config.Client(context.Background(), token)
		userResp, err := client.Get("https://api.twitter.com/2/users/me?user.fields=id,name,username,profile_image_url")
		if err != nil {
			http.Error(w, "Failed to fetch user info: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer userResp.Body.Close()

		var userData struct {
			Data struct {
				ID              string `json:"id"`
				Name            string `json:"name"`
				Username        string `json:"username"`
				ProfileImageURL string `json:"profile_image_url"`
			} `json:"data"`
		}

		if err := json.NewDecoder(userResp.Body).Decode(&userData); err != nil {
			http.Error(w, "Failed to decode user data: "+err.Error(), http.StatusInternalServerError)
			return
		}

		if userData.Data.ID == "" || userData.Data.Username == "" {
			http.Error(w, "Twitter API returned incomplete user data", http.StatusInternalServerError)
			return
		}

		// Improve profile image quality by replacing _normal with _400x400
		profileImageURL := userData.Data.ProfileImageURL
		if profileImageURL != "" {
			profileImageURL = strings.Replace(profileImageURL, "_normal", "_400x400", 1)
		}

		var expiresAt *time.Time
		if token.Expiry != (time.Time{}) {
			expiresAt = &token.Expiry
		}

		profileName := fmt.Sprintf("%s (@%s)", userData.Data.Name, userData.Data.Username)

		_, err = db.Exec(`
            INSERT INTO social_accounts (
                user_id, provider, external_account_id, access_token_enc, refresh_token_enc, expires_at, avatar, display_name,
                platform, social_id, access_token, refresh_token, access_token_expires_at, profile_picture_url, profile_name,
                created_at, updated_at, connected_at, last_synced_at
            ) VALUES (
				$1, 'twitter', $2, $3, $4, $5, $6, $7,
				'twitter', $8, $9, $10, $11, $12, $13,
                NOW(), NOW(), NOW(), NOW()
            )
            ON CONFLICT (user_id, provider, external_account_id) DO UPDATE SET
                access_token_enc = EXCLUDED.access_token_enc,
                refresh_token_enc = EXCLUDED.refresh_token_enc,
                expires_at = EXCLUDED.expires_at,
                avatar = EXCLUDED.avatar,
                display_name = EXCLUDED.display_name,
                -- legacy sync for backward compatibility
                access_token = EXCLUDED.access_token_enc,
                refresh_token = EXCLUDED.refresh_token_enc,
                access_token_expires_at = EXCLUDED.expires_at,
                profile_picture_url = EXCLUDED.avatar,
                profile_name = EXCLUDED.display_name,
                social_id = EXCLUDED.external_account_id,
                platform = EXCLUDED.provider,
                updated_at = NOW(),
                last_synced_at = NOW()
		`,
			appUserIDStr,
			userData.Data.ID,
			token.AccessToken,
			token.RefreshToken,
			expiresAt,
			profileImageURL,
			profileName,
			userData.Data.ID,
			token.AccessToken,
			token.RefreshToken,
			expiresAt,
			profileImageURL,
			profileName,
		)
		if err != nil {
			http.Error(w, "Failed to save Twitter account: "+err.Error(), http.StatusInternalServerError)
			return
		}

		frontendURL := os.Getenv("FRONTEND_URL")
		if frontendURL == "" {
			frontendURL = "http://localhost:3000" // fallback
		}
		http.Redirect(w, r, frontendURL+"/home/manage-accounts?connected=twitter", http.StatusSeeOther)
	}
}
