package controllers

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"os"

	"social-sync-backend/lib"
	"social-sync-backend/models"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

func getGoogleOAuthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URI"),
		Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"},
		Endpoint:     google.Endpoint,
	}
}

func GoogleRedirectHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		config := getGoogleOAuthConfig()
		url := config.AuthCodeURL("state-token", oauth2.AccessTypeOffline)
		http.Redirect(w, r, url, http.StatusTemporaryRedirect)
	}
}

func GoogleCallbackHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		log.Printf("DEBUG: Received code: %s", code)
		if code == "" {
			log.Printf("ERROR: Missing code in callback URL")
			http.Error(w, "Missing code", http.StatusBadRequest)
			return
		}

		config := getGoogleOAuthConfig()
		log.Printf("DEBUG: Google OAuth config - ClientID: %s, RedirectURL: %s", config.ClientID, config.RedirectURL)

		token, err := config.Exchange(context.Background(), code)
		if err != nil {
			log.Printf("ERROR: Token exchange failed: %v", err)
		} else {
			log.Printf("DEBUG: Token exchange succeeded: %+v", token)
		}
		if err != nil {
			log.Printf("ERROR: Token exchange failed: %v", err)
			http.Error(w, "Failed to exchange token: "+err.Error(), http.StatusInternalServerError)
			return
		}

		client := config.Client(context.Background(), token)
		resp, err := client.Get("https://www.googleapis.com/oauth2/v3/userinfo")
		if err != nil {
			log.Printf("ERROR: Failed to get user info: %v", err)
		} else {
			log.Printf("DEBUG: User info response status: %v", resp.Status)
		}
		if err != nil {
			http.Error(w, "Failed to get user info", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		bodyBytes, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			log.Printf("ERROR: Failed to read user info body: %v", err)
		} else {
			log.Printf("DEBUG: User info body: %s", string(bodyBytes))
		}
		if err != nil {
			http.Error(w, "Failed to read user info", http.StatusInternalServerError)
			return
		}

		resp.Body = ioutil.NopCloser(bytes.NewBuffer(bodyBytes))

		var userInfo models.GoogleUserInfo
		log.Printf("DEBUG: Decoding user info JSON")
		if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
			log.Printf("ERROR: Failed to decode user info: %v", err)
			http.Error(w, "Failed to decode user info", http.StatusInternalServerError)
			return
		}
		log.Printf("DEBUG: Decoded user info: %+v", userInfo)

		var userID string
		err = db.QueryRow(`
            SELECT id FROM users
            WHERE provider = 'google' AND provider_id = $1
        `, userInfo.Sub).Scan(&userID)
		if err != nil {
			log.Printf("DEBUG: DB query for user returned error: %v", err)
		} else {
			log.Printf("DEBUG: Found user ID: %s", userID)
		}

		if err == sql.ErrNoRows {
			err = db.QueryRow(`
                INSERT INTO users (name, email, provider, provider_id, profile_picture, is_verified, is_active, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, true, true, NOW(), NOW())
                RETURNING id
            `, userInfo.Name, userInfo.Email, "google", userInfo.Sub, userInfo.Picture).Scan(&userID)

			if err != nil {
				log.Printf("ERROR: Failed to create user: %v", err)
				http.Error(w, "Failed to create user", http.StatusInternalServerError)
				return
			}
			log.Printf("DEBUG: Created new user with ID: %s", userID)
		} else if err != nil {
			log.Printf("ERROR: DB error: %v", err)
			http.Error(w, "DB error", http.StatusInternalServerError)
			return
		}

		accessToken, err := lib.GenerateAccessToken(userID)
		if err != nil {
			log.Printf("ERROR: Failed to generate access token: %v", err)
		} else {
			log.Printf("DEBUG: Generated access token: %s", accessToken)
		}
		if err != nil {
			http.Error(w, "Token error", http.StatusInternalServerError)
			return
		}

		refreshToken, err := lib.GenerateRefreshToken(userID)
		if err != nil {
			log.Printf("ERROR: Failed to generate refresh token: %v", err)
		} else {
			log.Printf("DEBUG: Generated refresh token: %s", refreshToken)
		}
		if err != nil {
			http.Error(w, "Token error", http.StatusInternalServerError)
			return
		}

		//        redirectURL := "http://localhost:3000/auth/callback?access_token=" + accessToken + "&refresh_token=" + refreshToken
		frontendURL := os.Getenv("FRONTEND_URL")
		if frontendURL == "" {
			frontendURL = "http://localhost:3000" // fallback
		}
		redirectURL := frontendURL + "/auth/callback?access_token=" + accessToken + "&refresh_token=" + refreshToken
		log.Printf("DEBUG: Redirecting to frontend: %s", redirectURL)
		http.Redirect(w, r, redirectURL, http.StatusSeeOther)
	}
}
