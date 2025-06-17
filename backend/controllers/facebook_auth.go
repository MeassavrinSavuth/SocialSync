// controllers/fb_auth.go
package controllers

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"os"
	"fmt"
	"time"
	"log"
	"github.com/google/uuid"
	"social-sync-backend/lib"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/facebook"
)

func getFacebookOAuthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     os.Getenv("FACEBOOK_APP_ID"),
		ClientSecret: os.Getenv("FACEBOOK_APP_SECRET"),
		RedirectURL:  os.Getenv("FACEBOOK_REDIRECT_URL"),
		Scopes: []string{
			"email", "public_profile",
			"pages_show_list", "business_management",
			"pages_manage_posts", "instagram_basic",
			"instagram_content_publish", "pages_read_engagement",
			"read_insights", "instagram_manage_insights",
		},
		Endpoint: facebook.Endpoint,
	}
}

func FacebookRedirectHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		config := getFacebookOAuthConfig()

        // Get the authenticated user ID from the request context.
        // This relies on an AuthMiddleware having successfully validated the user's JWT
        // and put their UUID string into the request context under the "userID" key.
        appUserIDStr, err := lib.GetUserIDFromContext(r) // Using the updated lib.GetUserIDFromContext
        if err != nil {
            log.Printf("ERROR: Failed to retrieve authenticated user ID from context for Facebook redirect: %v", err)
            http.Error(w, "Unauthorized: User not authenticated.", http.StatusUnauthorized)
            return
        }
        // Validate it's a valid UUID
        if _, err := uuid.Parse(appUserIDStr); err != nil {
            log.Printf("ERROR: Invalid UUID format for appUserID %s: %v", appUserIDStr, err)
            http.Error(w, "Internal server error: Invalid user ID format.", http.StatusInternalServerError)
            return
        }

        // Generate a unique state parameter for CSRF protection.
        // It also carries the appUserID to link the callback to the correct user.
        state := fmt.Sprintf("socialsync_connect_%s_%d", appUserIDStr, time.Now().UnixNano())

		// Redirect the user to Facebook's authorization page.
		// AccessTypeOffline requests a refresh token (though Facebook's user tokens
		// are often long-lived and don't typically have refresh tokens in the same way).
		authURL := config.AuthCodeURL(state, oauth2.AccessTypeOffline)
		http.Redirect(w, r, authURL, http.StatusTemporaryRedirect)
	}
}

func FacebookCallbackHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := r.Context().Value("user_id").(string)
		if !ok || userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		code := r.URL.Query().Get("code")
		if code == "" {
			http.Error(w, "Missing code", http.StatusBadRequest)
			return
		}

		config := getFacebookOAuthConfig()
		token, err := config.Exchange(context.Background(), code)
		if err != nil {
			http.Error(w, "Token exchange failed", http.StatusInternalServerError)
			return
		}

		client := config.Client(context.Background(), token)
		resp, err := client.Get("https://graph.facebook.com/v18.0/me?fields=id,name,email,picture")
		if err != nil {
			http.Error(w, "Failed to get user info", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		var fbUser struct {
			ID     string `json:"id"`
			Name   string `json:"name"`
			Email  string `json:"email"`
			Picture struct {
				Data struct {
					URL string `json:"url"`
				} `json:"data"`
			} `json:"picture"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&fbUser); err != nil {
			http.Error(w, "Failed to decode Facebook user", http.StatusInternalServerError)
			return
		}

		_, err = db.Exec(`
			INSERT INTO social_accounts (
				user_id, platform, social_id, access_token,
				access_token_expires_at, refresh_token,
				profile_picture_url, profile_name, connected_at
			) VALUES (
				$1, 'facebook', $2, $3, $4, $5, $6, $7, NOW()
			)
			ON CONFLICT (user_id, platform) DO UPDATE SET
				access_token = EXCLUDED.access_token,
				access_token_expires_at = EXCLUDED.access_token_expires_at,
				refresh_token = EXCLUDED.refresh_token,
				profile_picture_url = EXCLUDED.profile_picture_url,
				profile_name = EXCLUDED.profile_name,
				connected_at = NOW()
		`,
			userID,
			fbUser.ID,
			token.AccessToken,
			token.Expiry,
			token.RefreshToken,
			fbUser.Picture.Data.URL,
			fbUser.Name,
		)
		if err != nil {
			http.Error(w, "Failed to save Facebook account", http.StatusInternalServerError)
			return
		}

		http.Redirect(w, r, "http://localhost:3000/profile?connected=facebook", http.StatusSeeOther)
	}
}
