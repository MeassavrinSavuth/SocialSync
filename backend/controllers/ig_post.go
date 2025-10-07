package controllers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"social-sync-backend/middleware" // Assuming this path is correct for your project
)

// Define the Instagram Graph API version to use
const instagramAPIVersion = "v19.0" // Using v19.0 for latest features

type InstagramPostRequest struct {
	Caption    string   `json:"caption"`
	MediaUrls  []string `json:"mediaUrls"`
	AccountIDs []string `json:"accountIds,omitempty"`
	All        bool     `json:"all,omitempty"`
}

// isVideoURL determines if a URL points to a video by checking file extension and content type
func isVideoURL(mediaURL string) bool {
	lower := strings.ToLower(mediaURL)

	// Check file extensions first
	if strings.HasSuffix(lower, ".mp4") || strings.HasSuffix(lower, ".mov") || strings.HasSuffix(lower, ".webm") ||
		strings.HasSuffix(lower, ".avi") || strings.HasSuffix(lower, ".mkv") || strings.HasSuffix(lower, ".flv") {
		return true
	}

	// Check for video-related keywords in URL
	if strings.Contains(lower, "video") || strings.Contains(lower, "mp4") || strings.Contains(lower, "mov") {
		return true
	}

	// Make a HEAD request to check content type
	resp, err := http.Head(mediaURL)
	if err != nil {
		// If HEAD request fails, default to image
		return false
	}
	defer resp.Body.Close()

	contentType := resp.Header.Get("Content-Type")
	fmt.Printf("DEBUG: Content-Type for %s: %s\n", mediaURL, contentType)

	// Check if content type indicates video
	return strings.HasPrefix(contentType, "video/")
}

// waitForMediaReady polls Instagram media container status until ready or timeout
// This function checks the status of individual media containers (images/videos)
// and also the carousel container itself.
func waitForMediaReady(mediaID, accessToken string) error {
	// Construct the URL to check the media container's status
	statusURL := fmt.Sprintf("https://graph.facebook.com/%s/%s?fields=status_code&access_token=%s", instagramAPIVersion, mediaID, accessToken)

	const maxRetries = 30                // Increased retries for more robust waiting (from 10)
	const delay = 5 * time.Second        // Increased delay (from 3s), total wait time now up to 150 seconds
	const initialDelay = 3 * time.Second // Initial delay before the first retry

	// Small initial delay before starting the loop to allow Instagram some initial processing time
	time.Sleep(initialDelay)

	for i := 0; i < maxRetries; i++ {
		resp, err := http.Get(statusURL)
		if err != nil {
			return fmt.Errorf("failed to get media status: %w", err) // Return immediately on network error
		}
		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return fmt.Errorf("failed to read media status response: %w", err) // Return immediately on read error
		}

		// Check if the response indicates an error
		if resp.StatusCode != http.StatusOK {
			return fmt.Errorf("media status check failed with status %d: %s", resp.StatusCode, string(body))
		}

		// Parse the status response
		var res struct {
			StatusCode string `json:"status_code"`
		}
		if err := json.Unmarshal(body, &res); err != nil {
			return fmt.Errorf("failed to parse media status response: %w", err)
		}

		if res.StatusCode == "FINISHED" {
			return nil // Media is ready to publish
		} else if res.StatusCode == "ERROR" {
			return fmt.Errorf("media upload failed with status 'ERROR'")
		}

		// Media is not yet finished, wait and retry
		time.Sleep(delay)
	}

	// If loop finishes, it means media wasn't ready within the max retries
	return fmt.Errorf("media not ready for ID %s after %d retries (%s total wait)", mediaID, maxRetries, time.Duration(maxRetries)*delay)
}

func PostToInstagramHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "Unauthorized: User not authenticated", http.StatusUnauthorized)
			return
		}

		log.Printf("Instagram: Post request received from user %s", userID)

		var req InstagramPostRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON body", http.StatusBadRequest)
			return
		}

		if strings.TrimSpace(req.Caption) == "" {
			http.Error(w, "Caption cannot be empty", http.StatusBadRequest)
			return
		}

		mediaCount := len(req.MediaUrls)
		if mediaCount == 0 {
			http.Error(w, "Instagram requires at least one media URL", http.StatusBadRequest)
			return
		}
		if mediaCount > 10 {
			http.Error(w, "Instagram carousel posts can have at most 10 media items", http.StatusBadRequest)
			return
		}

		type igAccount struct {
			AccessToken string
			InstagramID string
		}
		var targets []igAccount

		// Determine target accounts
		fmt.Printf("DEBUG: Instagram post request - AccountIDs: %v, All: %v, Caption: %s\n", req.AccountIDs, req.All, req.Caption)
		if len(req.AccountIDs) > 0 {
			for _, id := range req.AccountIDs {
				var at, igID string
				qErr := db.QueryRow(`SELECT COALESCE(access_token_enc, access_token), COALESCE(external_account_id, social_id) FROM social_accounts WHERE user_id=$1 AND id=$2::uuid AND (platform='instagram' OR provider='instagram')`, userID, id).Scan(&at, &igID)
				fmt.Printf("DEBUG: Account ID %s - AccessToken: %s, InstagramID: %s, Error: %v\n", id, at, igID, qErr)
				if qErr == nil && at != "" && igID != "" {
					targets = append(targets, igAccount{AccessToken: at, InstagramID: igID})
				}
			}
		} else if req.All {
			fmt.Printf("DEBUG: Processing all Instagram accounts\n")
			rows, qErr := db.Query(`SELECT COALESCE(access_token_enc, access_token), COALESCE(external_account_id, social_id) FROM social_accounts WHERE user_id=$1 AND (platform='instagram' OR provider='instagram')`, userID)
			if qErr == nil {
				defer rows.Close()
				for rows.Next() {
					var at, igID string
					if scanErr := rows.Scan(&at, &igID); scanErr == nil {
						fmt.Printf("DEBUG: Found Instagram account - AccessToken: %s, InstagramID: %s\n", at, igID)
						targets = append(targets, igAccount{AccessToken: at, InstagramID: igID})
					}
				}
			}
		} else {
			// Try default, else first any
			var at, igID string
			qErr := db.QueryRow(`SELECT COALESCE(access_token_enc, access_token), COALESCE(external_account_id, social_id) FROM social_accounts WHERE user_id=$1 AND (platform='instagram' OR provider='instagram') AND is_default=true LIMIT 1`, userID).Scan(&at, &igID)
			if qErr != nil {
				qErr = db.QueryRow(`SELECT COALESCE(access_token_enc, access_token), COALESCE(external_account_id, social_id) FROM social_accounts WHERE user_id=$1 AND (platform='instagram' OR provider='instagram') LIMIT 1`, userID).Scan(&at, &igID)
			}
			if qErr == nil && at != "" && igID != "" {
				targets = append(targets, igAccount{AccessToken: at, InstagramID: igID})
			}
		}
		fmt.Printf("DEBUG: Total Instagram targets found: %d\n", len(targets))
		if len(targets) == 0 {
			http.Error(w, "Instagram account not connected", http.StatusBadRequest)
			return
		}

		// For each target account, perform the post and collect results
		type igResult struct {
			AccountID string `json:"accountId"`
			OK        bool   `json:"ok"`
			PostID    string `json:"postId,omitempty"`
			Error     string `json:"error,omitempty"`
		}
		var results []igResult

		fmt.Printf("DEBUG: Posting to %d Instagram accounts\n", len(targets))
		for _, t := range targets {
			fmt.Printf("DEBUG: Posting to Instagram account %s\n", t.InstagramID)

			// Check if the token is valid by making a test request
			testURL := fmt.Sprintf("https://graph.facebook.com/%s/%s?fields=id&access_token=%s", instagramAPIVersion, t.InstagramID, t.AccessToken)
			testResp, err := http.Get(testURL)
			if err != nil {
				fmt.Printf("DEBUG: Instagram token validation error for account %s: %v\n", t.InstagramID, err)
				results = append(results, igResult{AccountID: t.InstagramID, OK: false, Error: err.Error()})
				continue
			}
			defer testResp.Body.Close()

			// If token is invalid, try to refresh it from Facebook
			if testResp.StatusCode == 401 || testResp.StatusCode == 403 {
				fmt.Printf("DEBUG: Instagram token expired for account %s, attempting to refresh from Facebook\n", t.InstagramID)

				// Get Facebook access token
				var fbAccessToken string
				err = db.QueryRow(`
				SELECT access_token FROM social_accounts
				WHERE user_id = $1 AND platform = 'facebook'`, userID).Scan(&fbAccessToken)
				if err != nil {
					fmt.Printf("DEBUG: No Facebook token found for Instagram refresh\n")
					results = append(results, igResult{AccountID: t.InstagramID, OK: false, Error: "Instagram token expired and no Facebook token available"})
					continue
				}

				// Try to get a new long-lived token from Facebook
				refreshURL := fmt.Sprintf("https://graph.facebook.com/%s/oauth/access_token?grant_type=fb_exchange_token&client_id=%s&client_secret=%s&fb_exchange_token=%s",
					instagramAPIVersion, os.Getenv("FACEBOOK_APP_ID"), os.Getenv("FACEBOOK_APP_SECRET"), fbAccessToken)

				refreshResp, err := http.Get(refreshURL)
				if err != nil {
					fmt.Printf("DEBUG: Failed to refresh token for account %s: %v\n", t.InstagramID, err)
					results = append(results, igResult{AccountID: t.InstagramID, OK: false, Error: "Failed to refresh token"})
					continue
				}
				defer refreshResp.Body.Close()

				if refreshResp.StatusCode == 200 {
					var refreshData struct {
						AccessToken string `json:"access_token"`
						TokenType   string `json:"token_type"`
						ExpiresIn   int    `json:"expires_in"`
					}
					if err := json.NewDecoder(refreshResp.Body).Decode(&refreshData); err == nil && refreshData.AccessToken != "" {
						// Update Instagram token for this specific account
						_, err = db.Exec(`
							UPDATE social_accounts SET access_token = $1 WHERE user_id = $2 AND social_id = $3 AND platform = 'instagram'
						`, refreshData.AccessToken, userID, t.InstagramID)
						if err == nil {
							t.AccessToken = refreshData.AccessToken
							fmt.Printf("DEBUG: Successfully refreshed Instagram token for account %s\n", t.InstagramID)
						}
					}
				}

				// If refresh failed, skip this account
				if t.AccessToken == "" {
					fmt.Printf("DEBUG: Token refresh failed for account %s\n", t.InstagramID)
					results = append(results, igResult{AccountID: t.InstagramID, OK: false, Error: "Token refresh failed"})
					continue
				}
			}

			// Post to this Instagram account
			err = postToInstagramAccount(t.InstagramID, t.AccessToken, req.Caption, req.MediaUrls)
			if err != nil {
				fmt.Printf("DEBUG: Instagram post failed for account %s: %v\n", t.InstagramID, err)
				results = append(results, igResult{AccountID: t.InstagramID, OK: false, Error: err.Error()})
			} else {
				fmt.Printf("DEBUG: Instagram post successful for account %s\n", t.InstagramID)
				results = append(results, igResult{AccountID: t.InstagramID, OK: true, PostID: "ig_post_" + t.InstagramID + "_" + fmt.Sprintf("%d", time.Now().Unix())})
			}
		}

		// Return results
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"results": results})
	}
}

// postToInstagramAccount posts to a specific Instagram account
func postToInstagramAccount(instagramID, accessToken, caption string, mediaUrls []string) error {
	mediaCount := len(mediaUrls)
	mediaContainerIDs := make([]string, 0, mediaCount)

	// Declare 'body' here once for the entire function scope
	var body []byte

	for _, mediaURL := range mediaUrls {
		form := url.Values{}
		// Only mark as carousel item when posting a carousel
		if mediaCount > 1 {
			form.Set("is_carousel_item", "true")
		}

		// Determine media type by checking the URL and making a HEAD request
		isVideo := isVideoURL(mediaURL)
		fmt.Printf("DEBUG: Media URL: %s, isVideo: %v\n", mediaURL, isVideo)

		if isVideo {
			// For videos, use video_url parameter and set media_type to REELS (VIDEO is deprecated)
			form.Set("video_url", mediaURL)
			form.Set("media_type", "REELS")
		} else {
			// For images, use image_url parameter
			form.Set("image_url", mediaURL)
		}

		// Add caption during media creation for single media posts
		if mediaCount == 1 {
			form.Set("caption", caption)
		}

		form.Set("access_token", accessToken)

		// Debug: Log all form parameters
		fmt.Printf("DEBUG: Form parameters for %s:\n", mediaURL)
		for key, values := range form {
			fmt.Printf("  %s: %v\n", key, values)
		}

		// Step 1: Create individual media container
		createMediaURL := fmt.Sprintf("https://graph.facebook.com/%s/%s/media", instagramAPIVersion, instagramID)
		resp, err := http.Post(
			createMediaURL,
			"application/x-www-form-urlencoded",
			strings.NewReader(form.Encode()),
		)
		if err != nil {
			return fmt.Errorf("failed to create media container: %w", err)
		}
		// Use '=' for reassignment, not ':='
		body, err = io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return fmt.Errorf("failed to read media container creation response: %w", err)
		}

		if resp.StatusCode != http.StatusOK {
			log.Printf("Instagram: Media container creation failed with status %d: %s", resp.StatusCode, string(body))
			return fmt.Errorf("media container creation failed: %s", body)
		}

		var result struct {
			ID string `json:"id"`
		}
		if err := json.Unmarshal(body, &result); err != nil || result.ID == "" {
			return fmt.Errorf("invalid response from media container creation: %w", err)
		}

		// Step 2: Wait for individual media container to be ready
		if err := waitForMediaReady(result.ID, accessToken); err != nil {
			return fmt.Errorf("media item failed to process: %w", err)
		}

		mediaContainerIDs = append(mediaContainerIDs, result.ID)
	}

	if mediaCount == 1 {
		// Single media post - publish directly
		publishForm := url.Values{}
		publishForm.Set("creation_id", mediaContainerIDs[0])
		// Caption already set during media creation, no need to set it again
		publishForm.Set("access_token", accessToken)

		publishURL := fmt.Sprintf("https://graph.facebook.com/%s/%s/media_publish", instagramAPIVersion, instagramID)
		publishResp, err := http.Post(publishURL, "application/x-www-form-urlencoded", strings.NewReader(publishForm.Encode()))
		if err != nil {
			return fmt.Errorf("failed to publish post: %w", err)
		}
		// Use '=' for reassignment, not ':='
		body, err = io.ReadAll(publishResp.Body)
		publishResp.Body.Close()
		if err != nil {
			return fmt.Errorf("failed to read publish response: %w", err)
		}

		if publishResp.StatusCode != http.StatusOK {
			log.Printf("Instagram: Single media publish failed with status %d: %s", publishResp.StatusCode, string(body))
			return fmt.Errorf("publish failed: %s", body)
		}

	} else {
		// Carousel post creation and publish
		carouselForm := url.Values{}
		carouselForm.Set("media_type", "CAROUSEL")
		carouselForm.Set("children", strings.Join(mediaContainerIDs, ","))
		carouselForm.Set("caption", caption)
		carouselForm.Set("access_token", accessToken)

		// Step 3: Create carousel container
		createCarouselURL := fmt.Sprintf("https://graph.facebook.com/%s/%s/media", instagramAPIVersion, instagramID)
		carouselResp, err := http.Post(createCarouselURL, "application/x-www-form-urlencoded", strings.NewReader(carouselForm.Encode()))
		if err != nil {
			return fmt.Errorf("failed to create carousel container: %w", err)
		}
		// Use '=' for reassignment, not ':='
		body, err = io.ReadAll(carouselResp.Body)
		carouselResp.Body.Close()
		if err != nil {
			return fmt.Errorf("failed to read carousel container creation response: %w", err)
		}

		if carouselResp.StatusCode != http.StatusOK {
			return fmt.Errorf("carousel container creation failed: %s", body)
		}

		var carouselResult struct {
			ID string `json:"id"`
		}
		if err := json.Unmarshal(body, &carouselResult); err != nil || carouselResult.ID == "" {
			return fmt.Errorf("invalid carousel container creation response: %w", err)
		}

		// Step 4: Wait for carousel container to be ready
		if err := waitForMediaReady(carouselResult.ID, accessToken); err != nil {
			return fmt.Errorf("carousel post failed to process: %w", err)
		}

		// Step 5: Publish the carousel
		publishForm := url.Values{}
		publishForm.Set("creation_id", carouselResult.ID)
		publishForm.Set("caption", caption)
		publishForm.Set("access_token", accessToken)

		publishURL := fmt.Sprintf("https://graph.facebook.com/%s/%s/media_publish", instagramAPIVersion, instagramID)
		publishResp, err := http.Post(publishURL, "application/x-www-form-urlencoded", strings.NewReader(publishForm.Encode()))
		if err != nil {
			return fmt.Errorf("failed to publish carousel post: %w", err)
		}
		// Use '=' for reassignment, not ':='
		body, err = io.ReadAll(publishResp.Body)
		publishResp.Body.Close()
		if err != nil {
			return fmt.Errorf("failed to read publish response: %w", err)
		}

		if publishResp.StatusCode != http.StatusOK {
			log.Printf("Instagram: Carousel publish failed with status %d: %s", publishResp.StatusCode, string(body))
			return fmt.Errorf("carousel publish failed: %s", body)
		}
	}

	return nil
}

// GetInstagramPostsHandler fetches the user's Instagram posts
func GetInstagramPostsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Printf("DEBUG: Instagram posts handler started for user")

		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			log.Printf("DEBUG: Failed to get user ID from context: %v", err)
			http.Error(w, "Unauthorized: User not authenticated", http.StatusUnauthorized)
			return
		}

		log.Printf("DEBUG: Instagram posts request for user: %s", userID)

		// Check for accountId query parameter
		accountID := r.URL.Query().Get("accountId")

		// Get Instagram access token and refresh token
		var accessToken string
		var refreshToken *string
		var tokenExpiry *time.Time
		var query string
		var args []interface{}

		if accountID != "" {
			// Fetch specific account
			query = `
				SELECT access_token, refresh_token, access_token_expires_at
				FROM social_accounts
				WHERE user_id = $1 AND platform = 'instagram' AND id = $2::uuid
			`
			args = []interface{}{userID, accountID}
		} else {
			// Fetch default account
			query = `
				SELECT access_token, refresh_token, access_token_expires_at
			FROM social_accounts
			WHERE user_id = $1 AND platform = 'instagram'
				ORDER BY is_default DESC, connected_at DESC
				LIMIT 1
			`
			args = []interface{}{userID}
		}

		err = db.QueryRow(query, args...).Scan(&accessToken, &refreshToken, &tokenExpiry)
		if err == sql.ErrNoRows {
			log.Printf("DEBUG: No Instagram account found for user %s", userID)
			http.Error(w, "Instagram account not connected", http.StatusBadRequest)
			return
		} else if err != nil {
			log.Printf("DEBUG: Database error fetching Instagram account: %v", err)
			http.Error(w, "Failed to get Instagram account", http.StatusInternalServerError)
			return
		}

		refreshTokenStr := ""
		if refreshToken != nil {
			refreshTokenStr = *refreshToken
		}
		log.Printf("DEBUG: Retrieved Instagram account - AccessToken length: %d, RefreshToken length: %d, TokenExpiry: %v",
			len(accessToken), len(refreshTokenStr), tokenExpiry)

		// Check if access token is empty
		if accessToken == "" {
			log.Printf("DEBUG: Instagram access token is empty")
			http.Error(w, "Instagram access token is missing. Please reconnect your Instagram account.", http.StatusUnauthorized)
			return
		}

		// Check if token is expired and refresh if needed
		if tokenExpiry != nil && time.Now().After(*tokenExpiry) {
			log.Printf("DEBUG: Instagram token expired, attempting refresh")
			if refreshToken != nil && *refreshToken != "" {
				newToken, err := refreshInstagramToken(*refreshToken)
				if err != nil {
					log.Printf("DEBUG: Failed to refresh Instagram token: %v", err)
					http.Error(w, "Instagram token expired and refresh failed", http.StatusUnauthorized)
					return
				}
				accessToken = newToken
				log.Printf("DEBUG: Instagram token refreshed successfully")
			} else {
				log.Printf("DEBUG: No refresh token available, using existing token")
			}
		} else if tokenExpiry == nil {
			log.Printf("DEBUG: No token expiry information, using existing token")
		}

		// Fetch posts from Facebook Graph API using Instagram Business Account ID
		// For Instagram Business accounts, we need to use Facebook Graph API with the Instagram Business Account ID
		// First, we need to get the Instagram Business Account ID from the database
		var instagramBusinessAccountID string
		err = db.QueryRow(`
			SELECT social_id FROM social_accounts 
			WHERE user_id = $1 AND platform = 'instagram' AND id = $2::uuid
		`, userID, accountID).Scan(&instagramBusinessAccountID)
		if err != nil {
			// Fallback to default account
			err = db.QueryRow(`
				SELECT social_id FROM social_accounts 
				WHERE user_id = $1 AND platform = 'instagram'
				ORDER BY is_default DESC, connected_at DESC
				LIMIT 1
			`, userID).Scan(&instagramBusinessAccountID)
		}

		if instagramBusinessAccountID == "" {
			http.Error(w, "Instagram Business Account ID not found", http.StatusInternalServerError)
			return
		}

		graphURL := fmt.Sprintf("https://graph.facebook.com/v18.0/%s/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count&access_token=%s", instagramBusinessAccountID, accessToken)
		log.Printf("DEBUG: Instagram posts request - URL: %s", graphURL)
		resp, err := http.Get(graphURL)
		if err != nil {
			log.Printf("DEBUG: Instagram API request failed: %v", err)
			http.Error(w, "Failed to contact Instagram API. Please check your Instagram account connection.", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			log.Printf("DEBUG: Instagram API error - Status: %d, Body: %s", resp.StatusCode, string(body))

			// Handle specific Instagram API errors
			if resp.StatusCode == 401 {
				log.Printf("DEBUG: Instagram 401 error - token invalid or expired")
				http.Error(w, "Instagram access token is invalid or expired. Please reconnect your Instagram account.", http.StatusUnauthorized)
				return
			} else if resp.StatusCode == 400 {
				log.Printf("DEBUG: Instagram 400 error - bad request")
				// Check if it's a token issue
				if strings.Contains(string(body), "Invalid OAuth access token") {
					http.Error(w, "Instagram access token is invalid. Please reconnect your Instagram account.", http.StatusUnauthorized)
				} else {
					http.Error(w, "Instagram API request failed. Please check your Instagram account connection.", http.StatusBadRequest)
				}
				return
			} else if resp.StatusCode == 500 {
				log.Printf("DEBUG: Instagram 500 error - internal server error")
				http.Error(w, "Instagram API internal error. Please try again later.", http.StatusInternalServerError)
				return
			} else {
				log.Printf("DEBUG: Instagram API error - Status: %d, Body: %s", resp.StatusCode, string(body))
				http.Error(w, "Failed to fetch Instagram posts: "+string(body), resp.StatusCode)
				return
			}
		}
		var igResp map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&igResp); err != nil {
			http.Error(w, "Failed to decode Instagram posts", http.StatusInternalServerError)
			return
		}

		// Debug: Log the Instagram posts response to see what we're getting
		log.Printf("DEBUG: Instagram posts response: %+v", igResp)
		if data, ok := igResp["data"].([]interface{}); ok {
			log.Printf("DEBUG: Found %d Instagram posts", len(data))
			for i, post := range data {
				if postMap, ok := post.(map[string]interface{}); ok {
					log.Printf("DEBUG: Post %d - ID: %v, Media Type: %v, Media URL: %v, Timestamp: %v",
						i, postMap["id"], postMap["media_type"], postMap["media_url"], postMap["timestamp"])
				}
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(igResp)
	}
}

// refreshInstagramToken refreshes an expired Instagram access token
func refreshInstagramToken(refreshToken string) (string, error) {
	apiURL := "https://graph.instagram.com/refresh_access_token"
	data := url.Values{}
	data.Set("grant_type", "ig_refresh_token")
	data.Set("access_token", refreshToken)

	resp, err := http.PostForm(apiURL, data)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("token refresh failed: %s", string(body))
	}

	var result struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	return result.AccessToken, nil
}
