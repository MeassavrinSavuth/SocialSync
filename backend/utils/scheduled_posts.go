package utils

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"social-sync-backend/models"
)

// ScheduledPostProcessor handles the background processing of scheduled posts
type ScheduledPostProcessor struct {
	db     *sql.DB
	ticker *time.Ticker
	done   chan bool
}

// NewScheduledPostProcessor creates a new scheduled post processor
func NewScheduledPostProcessor(db *sql.DB) *ScheduledPostProcessor {
	return &ScheduledPostProcessor{
		db:     db,
		ticker: time.NewTicker(15 * time.Second), // Check every 15 seconds for better precision
		done:   make(chan bool),
	}
}

// Start begins the background processing with precision timing
func (spp *ScheduledPostProcessor) Start() {
	log.Println("Starting scheduled post processor with 15-second precision...")
	go func() {
		// Immediately check for posts on startup
		spp.processScheduledPosts()
		
		for {
			select {
			case <-spp.done:
				return
			case <-spp.ticker.C:
				spp.processScheduledPosts()
			}
		}
	}()
}

// Stop stops the background processing
func (spp *ScheduledPostProcessor) Stop() {
	log.Println("Stopping scheduled post processor...")
	spp.ticker.Stop()
	spp.done <- true
}

// processScheduledPosts finds and processes posts ready to be published
func (spp *ScheduledPostProcessor) processScheduledPosts() {
	now := time.Now()
	
	// Query posts that are scheduled for now or earlier (with small buffer for precision)
	query := `
		SELECT id, user_id, content, media_urls, platforms, scheduled_time, retry_count
		FROM scheduled_posts
		WHERE status = 'pending' AND scheduled_time <= $1
		ORDER BY scheduled_time ASC
	`

	rows, err := spp.db.Query(query, now)
	if err != nil {
		log.Printf("Error querying scheduled posts: %v", err)
		return
	}
	defer rows.Close()

	var postsToProcess []models.ScheduledPost

	for rows.Next() {
		var post models.ScheduledPost
		err := rows.Scan(
			&post.ID,
			&post.UserID,
			&post.Content,
			&post.MediaURLs,
			&post.Platforms,
			&post.ScheduledTime,
			&post.RetryCount,
		)
		if err != nil {
			log.Printf("Error scanning scheduled post: %v", err)
			continue
		}
		postsToProcess = append(postsToProcess, post)
	}

	// Process each post immediately when it's time
	for _, post := range postsToProcess {
		// Calculate how close we are to the scheduled time
		timeDiff := now.Sub(post.ScheduledTime)
		if timeDiff >= 0 {
			log.Printf("Processing scheduled post ID: %d (scheduled for %s, processing at %s, delay: %v)", 
				post.ID, post.ScheduledTime.Format("15:04:05"), now.Format("15:04:05"), timeDiff)
			spp.processPost(post)
		}
	}
}

// processPost handles posting to social media platforms
func (spp *ScheduledPostProcessor) processPost(post models.ScheduledPost) {
	log.Printf("Processing scheduled post ID: %d for user: %s", post.ID, post.UserID)

	var errors []string
	successfulPlatforms := []string{}

	// Process each platform
	for _, platform := range post.Platforms {
		err := spp.postToPlatform(post, platform)
		if err != nil {
			errors = append(errors, fmt.Sprintf("%s: %s", platform, err.Error()))
			log.Printf("Failed to post to %s for post %d: %v", platform, post.ID, err)
		} else {
			successfulPlatforms = append(successfulPlatforms, platform)
			log.Printf("Successfully posted to %s for post %d", platform, post.ID)
		}
	}

	// Update post status based on results
	now := time.Now()
	if len(errors) == 0 {
		// All platforms succeeded
		spp.updatePostStatus(post.ID, models.StatusPosted, "", now)
	} else if len(successfulPlatforms) > 0 {
		// Partial success - mark as posted but log errors
		errorMsg := fmt.Sprintf("Partial success. Failed platforms: %s", strings.Join(errors, "; "))
		spp.updatePostStatus(post.ID, models.StatusPosted, errorMsg, now)
	} else {
		// All platforms failed
		if post.RetryCount < 3 {
			// Retry later
			errorMsg := fmt.Sprintf("All platforms failed. Retry %d/3. Errors: %s", post.RetryCount+1, strings.Join(errors, "; "))
			spp.updatePostRetry(post.ID, post.RetryCount+1, errorMsg, now)
		} else {
			// Max retries reached, mark as failed
			errorMsg := fmt.Sprintf("Max retries reached. Errors: %s", strings.Join(errors, "; "))
			spp.updatePostStatus(post.ID, models.StatusFailed, errorMsg, now)
		}
	}
}

// postToPlatform posts content to a specific social media platform
func (spp *ScheduledPostProcessor) postToPlatform(post models.ScheduledPost, platform string) error {
	// Get user's access token for this platform
	accessToken, err := spp.getUserAccessToken(post.UserID, platform)
	if err != nil {
		return fmt.Errorf("failed to get access token for %s: %v", platform, err)
	}

	// Call platform API directly using stored access token
	switch platform {
	case "facebook":
		return spp.postToFacebook(post.Content, post.MediaURLs, accessToken)
	case "instagram":
		return spp.postToInstagram(post.Content, post.MediaURLs, accessToken)
	case "youtube":
		return spp.postToYouTube(post.Content, post.MediaURLs, accessToken)
	case "twitter":
		return spp.postToTwitter(post.Content, post.MediaURLs, accessToken)
	case "mastodon":
		return spp.postToMastodon(post.Content, post.MediaURLs, accessToken)
	default:
		return fmt.Errorf("unsupported platform: %s", platform)
	}
}

// getUserAccessToken retrieves the access token for a user's platform
func (spp *ScheduledPostProcessor) getUserAccessToken(userID, platform string) (string, error) {
	query := `
		SELECT access_token 
		FROM social_accounts 
		WHERE user_id = $1 AND platform = $2
	`
	
	var accessToken string
	err := spp.db.QueryRow(query, userID, platform).Scan(&accessToken)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", fmt.Errorf("user not connected to %s", platform)
		}
		return "", fmt.Errorf("database error: %v", err)
	}
	
	return accessToken, nil
}

// postToFacebook posts directly to Facebook using access token
func (spp *ScheduledPostProcessor) postToFacebook(content string, mediaURLs []string, accessToken string) error {
	// Check if we have media to post
	if len(mediaURLs) > 0 {
		// Post with photo using Facebook's photo endpoint
		return spp.postToFacebookWithPhoto(content, mediaURLs[0], accessToken)
	} else {
		// Post text-only using feed endpoint
		return spp.postToFacebookTextOnly(content, accessToken)
	}
}

// postToFacebookTextOnly posts text-only content to Facebook
func (spp *ScheduledPostProcessor) postToFacebookTextOnly(content string, accessToken string) error {
	url := "https://graph.facebook.com/v18.0/me/feed"
	
	payload := map[string]interface{}{
		"message":      content,
		"access_token": accessToken,
	}
	
	return spp.makeHTTPRequest("POST", url, payload)
}

// postToFacebookWithPhoto posts content with photo to Facebook
func (spp *ScheduledPostProcessor) postToFacebookWithPhoto(content string, imageURL string, accessToken string) error {
	// Use Facebook's photos endpoint to post image with caption
	url := "https://graph.facebook.com/v18.0/me/photos"
	
	payload := map[string]interface{}{
		"url":          imageURL,      // Direct image URL
		"caption":      content,       // Post text as caption
		"access_token": accessToken,
	}
	
	log.Printf("Facebook: Posting photo with URL: %s", imageURL)
	
	return spp.makeHTTPRequest("POST", url, payload)
}

// postToInstagram posts directly to Instagram using access token  
func (spp *ScheduledPostProcessor) postToInstagram(content string, mediaURLs []string, accessToken string) error {
	// Instagram Basic Display API endpoint
	url := "https://graph.instagram.com/v18.0/me/media"
	
	payload := map[string]interface{}{
		"caption":      content,
		"access_token": accessToken,
	}
	
	// Add media if present
	if len(mediaURLs) > 0 {
		payload["image_url"] = mediaURLs[0]
	}
	
	return spp.makeHTTPRequest("POST", url, payload)
}

// postToYouTube posts directly to YouTube using access token
func (spp *ScheduledPostProcessor) postToYouTube(content string, mediaURLs []string, accessToken string) error {
	// YouTube Data API v3 endpoint
	url := "https://www.googleapis.com/youtube/v3/videos"
	
	payload := map[string]interface{}{
		"snippet": map[string]interface{}{
			"title":       content[:min(len(content), 100)], // YouTube title limit
			"description": content,
		},
		"access_token": accessToken,
	}
	
	return spp.makeHTTPRequest("POST", url, payload)
}

// postToTwitter posts directly to Twitter using access token
func (spp *ScheduledPostProcessor) postToTwitter(content string, mediaURLs []string, accessToken string) error {
	// Twitter API v2 endpoint (OAuth 2.0)
	apiURL := "https://api.twitter.com/2/tweets"
	
	// Prepare the tweet content
	tweetText := content
	if len(mediaURLs) > 0 {
		// Include media URL in the tweet text for now
		tweetText = content + " " + mediaURLs[0]
	}
	
	payload := map[string]interface{}{
		"text": tweetText,
	}
	
	// Log the token being used for debugging (first 10 chars only)
	log.Printf("Twitter API v2: Using OAuth 2.0 token (first 10 chars): %s...", accessToken[:min(len(accessToken), 10)])
	
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %v", err)
	}
	
	req, err := http.NewRequest("POST", apiURL, strings.NewReader(string(jsonPayload)))
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}
	
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+accessToken)
	
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to make request: %v", err)
	}
	defer resp.Body.Close()
	
	// Read the full response for debugging
	body := make([]byte, 2048)
	n, _ := resp.Body.Read(body)
	responseBody := string(body[:n])
	
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.Printf("Twitter API v2 Error - Status: %d, Response: %s", resp.StatusCode, responseBody)
		
		// Common Twitter API v2 errors:
		// 401: Invalid/expired token, insufficient scopes
		// 403: Forbidden (app permissions issue)
		// 429: Rate limit exceeded
		if resp.StatusCode == 401 {
			return fmt.Errorf("twitter authentication failed - token may be expired or have insufficient scopes (tweet.write required). Status: %d", resp.StatusCode)
		} else if resp.StatusCode == 403 {
			return fmt.Errorf("twitter API access forbidden - check app permissions and scopes. Status: %d", resp.StatusCode)
		} else if resp.StatusCode == 429 {
			return fmt.Errorf("twitter API rate limit exceeded. Status: %d", resp.StatusCode)
		}
		
		return fmt.Errorf("twitter API error - Status: %d, Response: %s", resp.StatusCode, responseBody)
	}
	
	log.Printf("Twitter post successful - Response: %s", responseBody)
	return nil
}

// postToMastodon posts directly to Mastodon using access token
func (spp *ScheduledPostProcessor) postToMastodon(content string, mediaURLs []string, accessToken string) error {
	// Mastodon API endpoint (you'll need to store the instance URL)
	url := "https://mastodon.social/api/v1/statuses" // Default, should be dynamic
	
	payload := map[string]interface{}{
		"status": content,
	}
	
	return spp.makeHTTPRequestWithAuth("POST", url, payload, "Bearer "+accessToken)
}

// makeHTTPRequest makes a standard HTTP request with JSON payload
func (spp *ScheduledPostProcessor) makeHTTPRequest(method, url string, payload map[string]interface{}) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %v", err)
	}
	
	req, err := http.NewRequest(method, url, strings.NewReader(string(jsonPayload)))
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}
	
	req.Header.Set("Content-Type", "application/json")
	
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to make request: %v", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		// Read response body for more detailed error information
		body := make([]byte, 1024)
		n, _ := resp.Body.Read(body)
		responseBody := string(body[:n])
		
		log.Printf("API Error - Status: %d, Response: %s", resp.StatusCode, responseBody)
		return fmt.Errorf("API returned status %d: %s", resp.StatusCode, responseBody)
	}
	
	return nil
}

// makeHTTPRequestWithAuth makes an HTTP request with Authorization header
func (spp *ScheduledPostProcessor) makeHTTPRequestWithAuth(method, url string, payload map[string]interface{}, authHeader string) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %v", err)
	}
	
	req, err := http.NewRequest(method, url, strings.NewReader(string(jsonPayload)))
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}
	
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", authHeader)
	
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to make request: %v", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		// Read response body for more detailed error information
		body := make([]byte, 1024)
		n, _ := resp.Body.Read(body)
		responseBody := string(body[:n])
		
		log.Printf("API Error - Status: %d, Response: %s", resp.StatusCode, responseBody)
		return fmt.Errorf("API returned status %d: %s", resp.StatusCode, responseBody)
	}
	
	return nil
}

// Helper function for min
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// updatePostStatus updates the status of a scheduled post
func (spp *ScheduledPostProcessor) updatePostStatus(postID int, status, errorMsg string, updatedAt time.Time) {
	query := `
		UPDATE scheduled_posts
		SET status = $1, error_message = $2, updated_at = $3
		WHERE id = $4
	`

	var errorMsgPtr *string
	if errorMsg != "" {
		errorMsgPtr = &errorMsg
	}

	_, err := spp.db.Exec(query, status, errorMsgPtr, updatedAt, postID)
	if err != nil {
		log.Printf("Failed to update post status for ID %d: %v", postID, err)
	}
}

// updatePostRetry updates the retry count and error message for a scheduled post
func (spp *ScheduledPostProcessor) updatePostRetry(postID, retryCount int, errorMsg string, updatedAt time.Time) {
	query := `
		UPDATE scheduled_posts
		SET retry_count = $1, error_message = $2, updated_at = $3
		WHERE id = $4
	`

	_, err := spp.db.Exec(query, retryCount, errorMsg, updatedAt, postID)
	if err != nil {
		log.Printf("Failed to update post retry for ID %d: %v", postID, err)
	}
}