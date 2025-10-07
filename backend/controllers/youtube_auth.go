package controllers

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"social-sync-backend/middleware"

	"github.com/google/uuid"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

func getYouTubeOAuthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("YOUTUBE_REDIRECT_URI"),
		Scopes: []string{
			"https://www.googleapis.com/auth/youtube.upload",
			"https://www.googleapis.com/auth/youtube.readonly",
			"https://www.googleapis.com/auth/youtube.force-ssl",
		},
		Endpoint: google.Endpoint,
	}
}

func YouTubeRedirectHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "User not authenticated", http.StatusUnauthorized)
			return
		}

		config := getYouTubeOAuthConfig()
		state := fmt.Sprintf("%s:%d", userID, time.Now().UnixNano())
		// Force showing the consent screen (helpful during testing and for verification demos)
		url := config.AuthCodeURL(state, oauth2.AccessTypeOffline,
			oauth2.SetAuthURLParam("prompt", "consent"),
			oauth2.SetAuthURLParam("include_granted_scopes", "true"),
		)

		// Log the auth URL for debugging (can be removed later)
		log.Printf("DEBUG: YouTube auth URL: %s", url)

		http.Redirect(w, r, url, http.StatusTemporaryRedirect)
	}
}

type YouTubeChannelInfo struct {
	Kind  string `json:"kind"`
	Items []struct {
		ID      string `json:"id"`
		Snippet struct {
			Title       string `json:"title"`
			Description string `json:"description"`
			Thumbnails  struct {
				Default struct {
					URL string `json:"url"`
				} `json:"default"`
			} `json:"thumbnails"`
		} `json:"snippet"`
		Statistics struct {
			ViewCount       string `json:"viewCount"`
			SubscriberCount string `json:"subscriberCount"`
			VideoCount      string `json:"videoCount"`
		} `json:"statistics"`
	} `json:"items"`
}

func YouTubeCallbackHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		// Gracefully handle user cancellation or provider error
		if code == "" || r.URL.Query().Get("error") != "" {
			log.Printf("DEBUG: YouTube OAuth callback missing code or error present. Treating as cancelled.")
			frontendURL := os.Getenv("FRONTEND_URL")
			if frontendURL == "" {
				frontendURL = "http://localhost:3000"
			}
			http.Redirect(w, r, frontendURL+"/home/manage-accounts?oauth=youtube&status=cancelled", http.StatusSeeOther)
			return
		}

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
		userID := parts[0]
		if _, err := uuid.Parse(userID); err != nil {
			http.Error(w, "Invalid user ID in state parameter", http.StatusBadRequest)
			return
		}

		config := getYouTubeOAuthConfig()
		token, err := config.Exchange(context.Background(), code)
		if err != nil {
			http.Error(w, "Failed to exchange token", http.StatusInternalServerError)
			return
		}

		client := config.Client(context.Background(), token)
		resp, err := client.Get("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true")
		if err != nil {
			http.Error(w, "Failed to get channel info", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		bodyBytes, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			http.Error(w, "Failed to read channel info", http.StatusInternalServerError)
			return
		}

		var channelInfo YouTubeChannelInfo
		if err := json.Unmarshal(bodyBytes, &channelInfo); err != nil {
			http.Error(w, "Failed to decode channel info", http.StatusInternalServerError)
			return
		}

		if len(channelInfo.Items) == 0 {
			http.Error(w, "No YouTube channel found", http.StatusBadRequest)
			return
		}

		channel := channelInfo.Items[0]

		var expiresAt *time.Time
		if token.Expiry != (time.Time{}) {
			expiresAt = &token.Expiry
		}

		// Upsert using new multi-account key (separate placeholders for legacy columns)
		_, err = db.Exec(`
            INSERT INTO social_accounts (
                user_id, provider, external_account_id, access_token_enc, refresh_token_enc, expires_at, avatar, display_name,
                platform, social_id, access_token, refresh_token, access_token_expires_at, profile_picture_url, profile_name,
                created_at, updated_at, connected_at, last_synced_at
            ) VALUES (
                $1, 'youtube', $2, $3, $4, $5, $6, $7,
                'youtube', $8, $9, $10, $11, $12, $13,
                NOW(), NOW(), NOW(), NOW()
            )
            ON CONFLICT (user_id, provider, external_account_id) DO UPDATE SET
                access_token_enc = EXCLUDED.access_token_enc,
                refresh_token_enc = EXCLUDED.refresh_token_enc,
                expires_at = EXCLUDED.expires_at,
                avatar = EXCLUDED.avatar,
                display_name = EXCLUDED.display_name,
                -- legacy sync
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
			userID,
			channel.ID,                             // $2 external_account_id
			token.AccessToken,                      // $3 access_token_enc
			token.RefreshToken,                     // $4 refresh_token_enc
			expiresAt,                              // $5 expires_at
			channel.Snippet.Thumbnails.Default.URL, // $6 avatar
			channel.Snippet.Title,                  // $7 display_name
			channel.ID,                             // $8 social_id (legacy)
			token.AccessToken,                      // $9 access_token (legacy)
			token.RefreshToken,                     // $10 refresh_token (legacy)
			expiresAt,                              // $11 access_token_expires_at (legacy)
			channel.Snippet.Thumbnails.Default.URL, // $12 profile_picture_url (legacy)
			channel.Snippet.Title,                  // $13 profile_name (legacy)
		)
		if err != nil {
			log.Printf("YouTube upsert error: %v", err)
			http.Error(w, "Failed to save YouTube account", http.StatusInternalServerError)
			return
		}

		frontendURL := os.Getenv("FRONTEND_URL")
		if frontendURL == "" {
			frontendURL = "http://localhost:3000" // fallback
		}
		http.Redirect(w, r, frontendURL+"/home/manage-accounts?connected=youtube", http.StatusSeeOther)
	}
}
