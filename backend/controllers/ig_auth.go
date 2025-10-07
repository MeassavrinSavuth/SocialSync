package controllers

import (
	// "context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"social-sync-backend/middleware"

	// "strings"
	"time"
)

func ConnectInstagramHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Println("Instagram connect handler started")

		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			log.Println("Unauthorized:", err)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Get all Facebook Pages for this user
		rows, err := db.Query(`
			SELECT social_id, access_token, profile_name FROM social_accounts
			WHERE user_id = $1 AND platform = 'facebook'
			ORDER BY is_default DESC, connected_at DESC
		`, userID)
		if err != nil {
			log.Println("Failed to query Facebook pages:", err)
			http.Error(w, "Failed to get Facebook pages", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var facebookPages []struct {
			PageID      string
			AccessToken string
			PageName    string
		}

		for rows.Next() {
			var pageID, accessToken, pageName string
			if err := rows.Scan(&pageID, &accessToken, &pageName); err != nil {
				log.Println("Failed to scan Facebook page:", err)
				continue
			}
			facebookPages = append(facebookPages, struct {
				PageID      string
				AccessToken string
				PageName    string
			}{pageID, accessToken, pageName})
		}

		if len(facebookPages) == 0 {
			log.Println("No Facebook pages connected")
			http.Error(w, "Facebook Page not connected", http.StatusBadRequest)
			return
		}

		// Check if we have a pageId parameter to specify which Facebook Page to use
		pageIdParam := r.URL.Query().Get("pageId")
		var selectedPage struct {
			PageID      string
			AccessToken string
			PageName    string
		}

		if pageIdParam != "" {
			// Use the specified Facebook Page
			for _, page := range facebookPages {
				if page.PageID == pageIdParam {
					selectedPage = page
					break
				}
			}
			if selectedPage.PageID == "" {
				http.Error(w, "Specified Facebook Page not found", http.StatusBadRequest)
				return
			}
		} else {
			// Use the first Facebook Page (default behavior)
			selectedPage = facebookPages[0]
		}

		pageID := selectedPage.PageID
		fbAccessToken := selectedPage.AccessToken
		log.Printf("Using Facebook Page: %s (%s)", selectedPage.PageName, pageID)

		// Step 1: Get IG Business ID
		graphURL := fmt.Sprintf("https://graph.facebook.com/v18.0/%s?fields=instagram_business_account&access_token=%s", pageID, fbAccessToken)
		log.Printf("DEBUG: Fetching Instagram Business Account from: %s", graphURL)
		resp, err := http.Get(graphURL)
		if err != nil {
			log.Printf("DEBUG: Graph API error: %v", err)
			http.Error(w, "Facebook Graph API error", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		log.Printf("DEBUG: Facebook Graph API response status: %d", resp.StatusCode)

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			log.Printf("DEBUG: Facebook Graph API error - Status: %d, Body: %s", resp.StatusCode, string(body))
			http.Error(w, "Facebook Graph API error: "+string(body), resp.StatusCode)
			return
		}

		var igResp struct {
			InstagramBusinessAccount struct {
				ID string `json:"id"`
			} `json:"instagram_business_account"`
			Error struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&igResp); err != nil {
			log.Printf("DEBUG: Failed to parse IG business ID response: %v", err)
			http.Error(w, "Failed to parse IG business ID response", http.StatusInternalServerError)
			return
		}

		log.Printf("DEBUG: Instagram Business Account response: %+v", igResp)

		if igResp.Error.Message != "" {
			log.Printf("DEBUG: Instagram Business Account error: %s", igResp.Error.Message)
			http.Error(w, "Instagram Business Account error: "+igResp.Error.Message, http.StatusBadRequest)
			return
		}

		if igResp.InstagramBusinessAccount.ID == "" {
			log.Printf("DEBUG: No Instagram Business Account linked to Facebook Page")
			http.Error(w, "No Instagram Business Account linked to this Facebook Page. Please link an Instagram Business Account to your Facebook Page first.", http.StatusBadRequest)
			return
		}
		igID := igResp.InstagramBusinessAccount.ID

		// Step 2: For Instagram Business accounts, use the Facebook Page access token directly
		// Instagram Business accounts use the Facebook Page access token for Instagram API calls
		log.Printf("DEBUG: Using Facebook Page access token for Instagram API calls")
		igAccessToken := fbAccessToken

		// Step 3: Test Instagram API access and fetch profile info using Facebook Graph API
		// For Instagram Business accounts, we need to use Facebook Graph API with the Instagram Business Account ID
		profileURL := fmt.Sprintf("https://graph.facebook.com/v18.0/%s?fields=username,profile_picture_url&access_token=%s", igID, igAccessToken)
		log.Printf("DEBUG: Testing Instagram API with URL: %s", profileURL)
		profileResp, err := http.Get(profileURL)
		if err != nil {
			log.Printf("DEBUG: Failed to fetch Instagram profile: %v", err)
			http.Error(w, "Failed to fetch Instagram profile", http.StatusInternalServerError)
			return
		}
		defer profileResp.Body.Close()

		if profileResp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(profileResp.Body)
			log.Printf("DEBUG: Instagram profile request failed - Status: %d, Body: %s", profileResp.StatusCode, string(body))
			http.Error(w, "Instagram API access failed. Please check your Facebook Page permissions for Instagram.", http.StatusBadRequest)
			return
		}

		var profileData struct {
			Username          string `json:"username"`
			ProfilePictureURL string `json:"profile_picture_url"`
		}
		if err := json.NewDecoder(profileResp.Body).Decode(&profileData); err != nil {
			log.Printf("DEBUG: Failed to decode Instagram profile: %v", err)
			http.Error(w, "Failed to decode IG profile", http.StatusInternalServerError)
			return
		}

		log.Printf("DEBUG: Successfully fetched Instagram profile: %s", profileData.Username)

		// Step 3: Check if this Instagram account is already connected
		var existingCount int
		err = db.QueryRow(`
			SELECT COUNT(*) FROM social_accounts 
			WHERE user_id = $1 AND platform = 'instagram' AND social_id = $2
		`, userID, igID).Scan(&existingCount)
		if err != nil {
			log.Println("Failed to check existing Instagram account:", err)
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		if existingCount > 0 {
			log.Printf("Instagram account %s already connected", igID)
			http.Error(w, "This Instagram account is already connected", http.StatusBadRequest)
			return
		}

		// Step 4: Insert new Instagram account
		// Instagram Business accounts use Facebook Page access tokens
		// Facebook Page tokens typically last 60 days
		expiryTime := time.Now().Add(60 * 24 * time.Hour) // 60 days from now
		_, err = db.Exec(`
            INSERT INTO social_accounts (
                user_id, provider, external_account_id, access_token_enc, avatar, display_name,
                platform, social_id, access_token, profile_picture_url, profile_name,
                refresh_token, access_token_expires_at,
                created_at, updated_at, connected_at, last_synced_at
            ) VALUES (
                $1, 'instagram', $2, $3, $4, $5,
                'instagram', $6, $7, $8, $9,
                $10, $11,
                NOW(), NOW(), NOW(), NOW()
            )
        `,
			userID,
			igID,                          // $2 external_account_id
			igAccessToken,                 // $3 access_token_enc (Facebook Page token)
			profileData.ProfilePictureURL, // $4 avatar
			profileData.Username,          // $5 display_name
			igID,                          // $6 social_id (legacy)
			igAccessToken,                 // $7 access_token (legacy) (Facebook Page token)
			profileData.ProfilePictureURL, // $8 profile_picture_url (legacy)
			profileData.Username,          // $9 profile_name (legacy)
			igAccessToken,                 // $10 refresh_token (Facebook Page token for refresh)
			expiryTime,                    // $11 access_token_expires_at
		)
		if err != nil {
			http.Error(w, "Failed to save Instagram account", http.StatusInternalServerError)
			return
		}

		log.Println("Instagram connected successfully")
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"message": "Instagram connected successfully",
		})
	}
}

// GetFacebookPagesForInstagramHandler returns available Facebook Pages for Instagram connection
func GetFacebookPagesForInstagramHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Get all Facebook Pages for this user
		rows, err := db.Query(`
			SELECT social_id, profile_name, profile_picture_url FROM social_accounts
			WHERE user_id = $1 AND platform = 'facebook'
			ORDER BY is_default DESC, connected_at DESC
		`, userID)
		if err != nil {
			http.Error(w, "Failed to get Facebook pages", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var pages []map[string]string
		for rows.Next() {
			var pageID, pageName, pageAvatar string
			if err := rows.Scan(&pageID, &pageName, &pageAvatar); err != nil {
				continue
			}
			pages = append(pages, map[string]string{
				"id":     pageID,
				"name":   pageName,
				"avatar": pageAvatar,
			})
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"pages": pages,
		})
	}
}
