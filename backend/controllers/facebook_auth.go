package controllers

import (
	"context"
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
	"golang.org/x/oauth2/facebook"
)

func getFacebookOAuthConfig() *oauth2.Config {
	redirectURL := os.Getenv("FACEBOOK_REDIRECT_URL")
	if redirectURL == "" {
		log.Fatal("FACEBOOK_REDIRECT_URL is empty!")
	}
	log.Printf("DEBUG: Using FACEBOOK_REDIRECT_URL: %s", redirectURL)

	return &oauth2.Config{
		ClientID:     os.Getenv("FACEBOOK_APP_ID"),
		ClientSecret: os.Getenv("FACEBOOK_APP_SECRET"),
		RedirectURL:  redirectURL,
		Scopes: []string{
			"email", "public_profile",
			"pages_show_list", "business_management",
			"pages_manage_posts", "instagram_basic",
			"instagram_content_publish", "pages_read_engagement",
			"read_insights", "instagram_manage_insights",
			"pages_read_user_content", "pages_manage_metadata",
			"pages_manage_engagement", "pages_read_engagement",
		},
		Endpoint: facebook.Endpoint,
	}
}

func FacebookRedirectHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		config := getFacebookOAuthConfig()
		appUserIDStr, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "Unauthorized: User not authenticated.", http.StatusUnauthorized)
			return
		}

		if _, err := uuid.Parse(appUserIDStr); err != nil {
			http.Error(w, "Internal server error: Invalid user ID format.", http.StatusInternalServerError)
			return
		}

		state := fmt.Sprintf("%s:%d", appUserIDStr, time.Now().UnixNano())
		authURL := config.AuthCodeURL(state, oauth2.AccessTypeOffline)
		http.Redirect(w, r, authURL, http.StatusTemporaryRedirect)
	}
}

func FacebookCallbackHandler(db *sql.DB) http.HandlerFunc {
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
		code := r.URL.Query().Get("code")
		if code == "" {
			http.Error(w, "Missing code parameter", http.StatusBadRequest)
			return
		}

		config := getFacebookOAuthConfig()
		token, err := config.Exchange(context.Background(), code)
		if err != nil {
			http.Error(w, "Token exchange failed: "+err.Error(), http.StatusInternalServerError)
			return
		}
		client := config.Client(context.Background(), token)

		pagesResp, err := client.Get("https://graph.facebook.com/v18.0/me/accounts")
		if err != nil {
			http.Error(w, "Failed to fetch pages: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer pagesResp.Body.Close()

		var pageData struct {
			Data []struct {
				ID          string `json:"id"`
				Name        string `json:"name"`
				AccessToken string `json:"access_token"`
			} `json:"data"`
		}
		if err := json.NewDecoder(pagesResp.Body).Decode(&pageData); err != nil {
			http.Error(w, "Failed to decode page data: "+err.Error(), http.StatusInternalServerError)
			return
		}
		if len(pageData.Data) == 0 {
			http.Error(w, "No Facebook Pages found", http.StatusBadRequest)
			return
		}

		// Get already connected Facebook pages for this user
		rows, err := db.Query(`
			SELECT external_account_id FROM social_accounts 
			WHERE user_id = $1 AND provider = 'facebook'
		`, appUserIDStr)
		if err != nil {
			http.Error(w, "Failed to check connected pages: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		connectedPageIDs := make(map[string]bool)
		for rows.Next() {
			var pageID string
			if err := rows.Scan(&pageID); err == nil {
				connectedPageIDs[pageID] = true
				log.Printf("DEBUG: Found connected Facebook page: %s", pageID)
			}
		}
		log.Printf("DEBUG: Total connected Facebook pages: %d", len(connectedPageIDs))

		// Filter out already connected pages
		var availablePages []struct {
			ID          string `json:"id"`
			Name        string `json:"name"`
			AccessToken string `json:"access_token"`
		}

		for _, page := range pageData.Data {
			log.Printf("DEBUG: Checking page %s (%s) - connected: %v", page.ID, page.Name, connectedPageIDs[page.ID])
			if !connectedPageIDs[page.ID] {
				availablePages = append(availablePages, page)
				log.Printf("DEBUG: Added page %s to available pages", page.Name)
			} else {
				log.Printf("DEBUG: Skipping already connected page %s", page.Name)
			}
		}
		log.Printf("DEBUG: Available pages count: %d", len(availablePages))

		// If all pages are already connected, redirect to manage accounts
		if len(availablePages) == 0 {
			frontendURL := os.Getenv("FRONTEND_URL")
			if frontendURL == "" {
				frontendURL = "http://localhost:3000" // fallback
			}
			http.Redirect(w, r, frontendURL+"/home/manage-accounts?message=all_pages_connected", http.StatusSeeOther)
			return
		}

		// For now, let's use a simpler approach - redirect to frontend with pages data
		// This is a temporary solution to get it working
		frontendURL := os.Getenv("FRONTEND_URL")
		if frontendURL == "" {
			frontendURL = "http://localhost:3000" // fallback
		}

		// Encode available pages data as JSON and pass to frontend
		pagesJSON, err := json.Marshal(availablePages)
		if err != nil {
			http.Error(w, "Failed to encode pages data", http.StatusInternalServerError)
			return
		}

		// Use base64 encoding to avoid URL issues
		encodedPages := base64.URLEncoding.EncodeToString(pagesJSON)

		// Redirect to page selection with encoded pages data
		redirectURL := fmt.Sprintf("%s/home/facebook-page-selection?pages=%s",
			frontendURL,
			encodedPages)
		http.Redirect(w, r, redirectURL, http.StatusSeeOther)
	}
}

// HandleFacebookPageSelection handles the user's page selection
func HandleFacebookPageSelection(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "Unauthorized: User not authenticated", http.StatusUnauthorized)
			return
		}

		var req struct {
			SelectedPages []struct {
				ID          string `json:"id"`
				Name        string `json:"name"`
				AccessToken string `json:"access_token"`
			} `json:"selectedPages"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON body", http.StatusBadRequest)
			return
		}

		if len(req.SelectedPages) == 0 {
			http.Error(w, "No pages selected", http.StatusBadRequest)
			return
		}

		// Connect selected pages
		for _, page := range req.SelectedPages {
			pageID := page.ID
			pageAccessToken := page.AccessToken
			pageName := page.Name
			pictureURL := fmt.Sprintf("https://graph.facebook.com/v18.0/%s/picture?type=large", pageID)

			// Use separate placeholders for new vs legacy columns to avoid type ambiguity
			_, err = db.Exec(`
	            INSERT INTO social_accounts (
	                user_id, provider, external_account_id, access_token_enc, avatar, display_name,
	                platform, social_id, access_token, profile_picture_url, profile_name,
	                created_at, updated_at, connected_at, last_synced_at
	            ) VALUES (
	                $1, 'facebook', $2, $3, $4, $5,
	                'facebook', $6, $7, $8, $9,
	                NOW(), NOW(), NOW(), NOW()
	            )
	            ON CONFLICT (user_id, provider, external_account_id) DO UPDATE SET
	                access_token_enc = EXCLUDED.access_token_enc,
	                avatar = EXCLUDED.avatar,
	                display_name = EXCLUDED.display_name,
	                -- legacy sync
	                access_token = EXCLUDED.access_token_enc,
	                profile_picture_url = EXCLUDED.avatar,
	                profile_name = EXCLUDED.display_name,
	                social_id = EXCLUDED.external_account_id,
	                platform = EXCLUDED.provider,
	                updated_at = NOW(),
	                last_synced_at = NOW()
	        `,
				userID,
				pageID,          // $2 external_account_id
				pageAccessToken, // $3 access_token_enc
				pictureURL,      // $4 avatar
				pageName,        // $5 display_name
				pageID,          // $6 social_id (legacy)
				pageAccessToken, // $7 access_token (legacy)
				pictureURL,      // $8 profile_picture_url (legacy)
				pageName,        // $9 profile_name (legacy)
			)
			if err != nil {
				log.Printf("Failed to save Facebook Page %s: %v", pageName, err)
				continue // Continue with other pages even if one fails
			}
			log.Printf("Successfully connected Facebook Page: %s (ID: %s)", pageName, pageID)
		}

		// Clean up temporary session data
		_, err = db.Exec(`
			DELETE FROM social_accounts 
			WHERE user_id = $1 AND provider = 'facebook_temp'
		`, userID)
		if err != nil {
			log.Printf("Failed to cleanup temporary session data: %v", err)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": fmt.Sprintf("Successfully connected %d Facebook pages", len(req.SelectedPages)),
		})
	}
}

// GetFacebookPagesData fetches the temporary pages data for selection
func GetFacebookPagesData(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "Unauthorized: User not authenticated", http.StatusUnauthorized)
			return
		}

		sessionID := r.URL.Query().Get("session_id")
		if sessionID == "" {
			http.Error(w, "Missing session_id parameter", http.StatusBadRequest)
			return
		}

		var pagesData string
		err = db.QueryRow(`
			SELECT access_token_enc FROM social_accounts 
			WHERE user_id = $1 AND provider = 'facebook_temp' AND external_account_id = $2
		`, userID, sessionID).Scan(&pagesData)
		if err != nil {
			http.Error(w, "Session not found or expired", http.StatusNotFound)
			return
		}

		// Parse the pages data
		var pages []struct {
			ID          string `json:"id"`
			Name        string `json:"name"`
			AccessToken string `json:"access_token"`
		}
		if err := json.Unmarshal([]byte(pagesData), &pages); err != nil {
			http.Error(w, "Invalid pages data", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"pages":   pages,
		})
	}
}
