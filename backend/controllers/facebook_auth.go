package controllers

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"social-sync-backend/lib"
	// "social-sync-backend/models"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/facebook"
)

func getFacebookOAuthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     os.Getenv("FACEBOOK_APP_ID"),
		ClientSecret: os.Getenv("FACEBOOK_APP_SECRET"),
		RedirectURL:  os.Getenv("REDIRECT_URL"),
		Scopes:       []string{"email", "public_profile"},
		Endpoint:     facebook.Endpoint,
	}
}

func FacebookRedirectHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		config := getFacebookOAuthConfig()
		url := config.AuthCodeURL("state-token", oauth2.AccessTypeOffline)
		http.Redirect(w, r, url, http.StatusTemporaryRedirect)
	}
}

func FacebookCallbackHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		if code == "" {
			http.Error(w, "Missing code", http.StatusBadRequest)
			return
		}

		config := getFacebookOAuthConfig()
		token, err := config.Exchange(context.Background(), code)
		if err != nil {
			http.Error(w, "Failed to exchange token", http.StatusInternalServerError)
			return
		}

		client := config.Client(context.Background(), token)
		resp, err := client.Get("https://graph.facebook.com/me?fields=id,name,email")
		if err != nil {
			http.Error(w, "Failed to get user info", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		var userInfo struct {
			ID    string `json:"id"`
			Name  string `json:"name"`
			Email string `json:"email"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
			http.Error(w, "Failed to decode user info", http.StatusInternalServerError)
			return
		}

		// Check if user already exists
		var userID string
		err = db.QueryRow(`
			SELECT user_id FROM auth_providers 
			WHERE provider = 'facebook' AND provider_id = $1
		`, userInfo.ID).Scan(&userID)

		if err == sql.ErrNoRows {
			// Create new user
			err = db.QueryRow(`
				INSERT INTO users (name, email, is_verified, is_active, created_at, updated_at)
				VALUES ($1, $2, true, true, NOW(), NOW())
				RETURNING id
			`, userInfo.Name, userInfo.Email).Scan(&userID)
			if err != nil {
				http.Error(w, "Failed to create user", http.StatusInternalServerError)
				return
			}

			_, err = db.Exec(`
				INSERT INTO auth_providers (provider, provider_id, user_id, created_at)
				VALUES ('facebook', $1, $2, NOW())
			`, userInfo.ID, userID)
			if err != nil {
				http.Error(w, "Failed to link auth provider", http.StatusInternalServerError)
				return
			}
		} else if err != nil {
			http.Error(w, "DB error", http.StatusInternalServerError)
			return
		}

		// Generate JWT tokens
		accessToken, err := lib.GenerateAccessToken(userID)
		if err != nil {
			http.Error(w, "Token generation failed", http.StatusInternalServerError)
			return
		}
		refreshToken, err := lib.GenerateRefreshToken(userID)
		if err != nil {
			http.Error(w, "Token generation failed", http.StatusInternalServerError)
			return
		}

		// Redirect to frontend with tokens
		redirectURL := fmt.Sprintf("http://localhost:3000/auth/callback?access_token=%s&refresh_token=%s", accessToken, refreshToken)
		http.Redirect(w, r, redirectURL, http.StatusSeeOther)
	}
}
