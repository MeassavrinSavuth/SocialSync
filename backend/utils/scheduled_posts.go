package utils

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"social-sync-backend/models"

	"github.com/lib/pq"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
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
        SELECT id, user_id, content, media_urls, platforms, scheduled_time, retry_count, targets
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
		var rawTargets []byte
		err := rows.Scan(
			&post.ID,
			&post.UserID,
			&post.Content,
			&post.MediaURLs,
			&post.Platforms,
			&post.ScheduledTime,
			&post.RetryCount,
			&rawTargets,
		)
		if err != nil {
			log.Printf("Error scanning scheduled post: %v", err)
			continue
		}
		if len(rawTargets) > 0 {
			var tgt map[string]interface{}
			if uErr := json.Unmarshal(rawTargets, &tgt); uErr == nil {
				post.Targets = tgt
			}
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
	log.Printf("DEBUG: Post content length: %d, MediaURLs count: %d", len(post.Content), len(post.MediaURLs))
	log.Printf("DEBUG: Post MediaURLs: %v", post.MediaURLs)
	log.Printf("DEBUG: Post platforms: %v", post.Platforms)

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
	// Targets may specify explicit account IDs to post to
	var accountIDs []string
	var postAll bool
	if post.Targets != nil {
		if t, ok := post.Targets[platform]; ok {
			if mp, ok2 := t.(map[string]interface{}); ok2 {
				if v, ok3 := mp["ids"].([]interface{}); ok3 {
					for _, it := range v {
						if s, ok4 := it.(string); ok4 {
							accountIDs = append(accountIDs, s)
						}
					}
				}
				if b, ok3 := mp["all"].(bool); ok3 {
					postAll = b
				}
			}
		}
	}

	// Handle multi-account selections per platform
	switch platform {
	case "twitter":
		if len(accountIDs) > 0 || postAll {
			var rows *sql.Rows
			var err error
			if len(accountIDs) > 0 {
				rows, err = spp.db.Query("SELECT access_token FROM social_accounts WHERE user_id=$1 AND (platform='twitter' OR provider='twitter') AND id = ANY($2::uuid[])", post.UserID, pq.Array(accountIDs))
			} else {
				rows, err = spp.db.Query("SELECT access_token FROM social_accounts WHERE user_id=$1 AND (platform='twitter' OR provider='twitter')", post.UserID)
			}
			if err != nil {
				return err
			}
			defer rows.Close()
			var errs []string
			for rows.Next() {
				var token string
				if scanErr := rows.Scan(&token); scanErr == nil {
					if perr := spp.postToTwitter(post.Content, post.MediaURLs, token); perr != nil {
						errs = append(errs, perr.Error())
					}
				}
			}
			if len(errs) > 0 && len(accountIDs) == 0 {
				return fmt.Errorf(strings.Join(errs, "; "))
			}
			return nil
		}
	case "mastodon":
		if len(accountIDs) > 0 || postAll {
			var rows *sql.Rows
			var err error
			if len(accountIDs) > 0 {
				q := "SELECT access_token FROM social_accounts WHERE user_id=$1 AND (platform='mastodon' OR provider='mastodon') AND id = ANY($2::uuid[])"
				rows, err = spp.db.Query(q, post.UserID, pq.Array(accountIDs))
			} else {
				q := "SELECT access_token FROM social_accounts WHERE user_id=$1 AND (platform='mastodon' OR provider='mastodon')"
				rows, err = spp.db.Query(q, post.UserID)
			}
			if err != nil {
				return err
			}
			defer rows.Close()
			var errs []string
			for rows.Next() {
				var token string
				if scanErr := rows.Scan(&token); scanErr == nil {
					if perr := spp.postToMastodon(post.Content, post.MediaURLs, token); perr != nil {
						errs = append(errs, perr.Error())
					}
				}
			}
			if len(errs) > 0 && len(accountIDs) == 0 {
				return fmt.Errorf(strings.Join(errs, "; "))
			}
			return nil
		}
	case "youtube":
		if len(accountIDs) > 0 || postAll {
			var rows *sql.Rows
			var err error
			if len(accountIDs) > 0 {
				rows, err = spp.db.Query("SELECT access_token FROM social_accounts WHERE user_id=$1 AND (platform='youtube' OR provider='youtube') AND id = ANY($2::uuid[])", post.UserID, pq.Array(accountIDs))
			} else {
				rows, err = spp.db.Query("SELECT access_token FROM social_accounts WHERE user_id=$1 AND (platform='youtube' OR provider='youtube')", post.UserID)
			}
			if err != nil {
				return err
			}
			defer rows.Close()
			var errs []string
			// Extract YouTube meta from targets (title/description)
			var ytTitle string
			if post.Targets != nil {
				if t, ok := post.Targets["youtube"]; ok {
					if mp, ok2 := t.(map[string]interface{}); ok2 {
						if meta, ok3 := mp["meta"].(map[string]interface{}); ok3 {
							if v, ok4 := meta["title"].(string); ok4 {
								ytTitle = v
							}
						}
					}
				}
			}
			for rows.Next() {
				var token string
				if scanErr := rows.Scan(&token); scanErr == nil {
					// Prefer explicit YouTube title/description when provided; fallback to post.Content
					content := post.Content
					if ytTitle != "" {
						content = ytTitle
					}
					if perr := spp.postToYouTube(content, post.MediaURLs, token); perr != nil {
						errs = append(errs, perr.Error())
					}
				}
			}
			if len(errs) > 0 {
				return fmt.Errorf(strings.Join(errs, "; "))
			}
			return nil
		}
	}

	// Default: pick one access token (legacy behaviour)
	accessToken, err := spp.getUserAccessToken(post.UserID, platform)
	if err != nil {
		return fmt.Errorf("failed to get access token for %s: %v", platform, err)
	}

	switch platform {
	case "facebook":
		// Support multiple accounts if specified
		var rows *sql.Rows
		var err error
		if len(accountIDs) > 0 {
			rows, err = spp.db.Query("SELECT COALESCE(access_token_enc, access_token), COALESCE(external_account_id, social_id) FROM social_accounts WHERE user_id=$1 AND platform='facebook' AND id = ANY($2::uuid[])", post.UserID, pq.Array(accountIDs))
		} else {
			rows, err = spp.db.Query("SELECT COALESCE(access_token_enc, access_token), COALESCE(external_account_id, social_id) FROM social_accounts WHERE user_id=$1 AND platform='facebook'", post.UserID)
		}
		if err != nil {
			return err
		}
		defer rows.Close()
		var errs []string
		for rows.Next() {
			var token, pageID string
			if scanErr := rows.Scan(&token, &pageID); scanErr != nil {
				continue
			}
			if err := spp.postToFacebookWithPageID(post.Content, post.MediaURLs, token, pageID); err != nil {
				errs = append(errs, fmt.Sprintf("page %s: %v", pageID, err))
			}
		}
		if len(errs) > 0 {
			return fmt.Errorf("facebook: %s", strings.Join(errs, "; "))
		}
		return nil
	case "instagram":
		// Scheduled Instagram: use Instagram Business Account ID, not 'me'
		if len(post.MediaURLs) == 0 {
			return fmt.Errorf("instagram requires at least one media")
		}

		// Support multiple accounts if specified
		var rows *sql.Rows
		var err error
		if len(accountIDs) > 0 {
			rows, err = spp.db.Query("SELECT COALESCE(access_token_enc, access_token), COALESCE(external_account_id, social_id) FROM social_accounts WHERE user_id=$1 AND platform='instagram' AND id = ANY($2::uuid[])", post.UserID, pq.Array(accountIDs))
		} else {
			rows, err = spp.db.Query("SELECT COALESCE(access_token_enc, access_token), COALESCE(external_account_id, social_id) FROM social_accounts WHERE user_id=$1 AND platform='instagram' ORDER BY is_default DESC, connected_at DESC", post.UserID)
		}
		if err != nil {
			return err
		}
		defer rows.Close()

		// Collect all accounts first
		var accounts []struct {
			token    string
			igUserID string
		}
		for rows.Next() {
			var token, igUserID string
			if scanErr := rows.Scan(&token, &igUserID); scanErr != nil {
				continue
			}
			accounts = append(accounts, struct {
				token    string
				igUserID string
			}{token, igUserID})
		}

		// Process all Instagram accounts concurrently
		var wg sync.WaitGroup
		var mu sync.Mutex
		var errs []string

		for _, account := range accounts {
			wg.Add(1)
			go func(token, igUserID string) {
				defer wg.Done()

				// Process Instagram post with multiple media support
				err := spp.postToInstagramWithMultipleMedia(igUserID, token, post.Content, post.MediaURLs)
				if err != nil {
					mu.Lock()
					errs = append(errs, fmt.Sprintf("Instagram post failed for account %s: %v", igUserID, err))
					mu.Unlock()
				} else {
					log.Printf("Scheduled Instagram: Successfully posted to account %s", igUserID)
				}
			}(account.token, account.igUserID)
		}

		wg.Wait()

		if len(errs) > 0 {
			return fmt.Errorf("Instagram posting errors: %s", strings.Join(errs, "; "))
		}
		return nil
	case "youtube":
		return spp.postToYouTube(post.Content, post.MediaURLs, accessToken)
	case "twitter":
		return spp.postToTwitter(post.Content, post.MediaURLs, accessToken)
	case "mastodon":
		return spp.postToMastodon(post.Content, post.MediaURLs, accessToken)
	case "telegram":
		// Multi-account via targets
		if len(accountIDs) > 0 || postAll {
			var rows *sql.Rows
			var err error
			if len(accountIDs) > 0 {
				rows, err = spp.db.Query("SELECT social_id, access_token FROM social_accounts WHERE user_id=$1 AND platform='telegram' AND id = ANY($2::uuid[])", post.UserID, pq.Array(accountIDs))
			} else {
				rows, err = spp.db.Query("SELECT social_id, access_token FROM social_accounts WHERE user_id=$1 AND platform='telegram'", post.UserID)
			}
			if err != nil {
				return err
			}
			defer rows.Close()
			var errs []string
			for rows.Next() {
				var chatID, botToken string
				if scanErr := rows.Scan(&chatID, &botToken); scanErr == nil {
					if perr := spp.sendTelegramMessage(botToken, chatID, post.Content, post.MediaURLs); perr != nil {
						errs = append(errs, perr.Error())
					}
				}
			}
			if len(errs) > 0 {
				return fmt.Errorf(strings.Join(errs, "; "))
			}
			return nil
		}
		return spp.postToTelegram(post.Content, post.MediaURLs, post.UserID)
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

	// Add debug info for token
	tokenPrefix := accessToken
	if len(accessToken) > 20 {
		tokenPrefix = accessToken[:20] + "..."
	}
	log.Printf("DEBUG: Retrieved %s access token: %s", platform, tokenPrefix)

	return accessToken, nil
}

// postToFacebookWithPageID posts to a specific Facebook page with support for multiple media items
func (spp *ScheduledPostProcessor) postToFacebookWithPageID(content string, mediaURLs []string, accessToken string, pageID string) error {
	// Check if we have media to post
	if len(mediaURLs) > 0 {
		// Handle multiple media items
		if len(mediaURLs) == 1 {
			// Single media item
			mediaURL := mediaURLs[0]
			isVideo := strings.Contains(mediaURL, "/video/") ||
				strings.Contains(mediaURL, ".mp4") ||
				strings.Contains(mediaURL, ".mov") ||
				strings.Contains(mediaURL, ".avi") ||
				strings.Contains(mediaURL, ".webm")

			if isVideo {
				log.Printf("Facebook: Posting video to page %s with URL: %s", pageID, mediaURL)
				return spp.postToFacebookWithVideoToPage(content, mediaURL, accessToken, pageID)
			} else {
				log.Printf("Facebook: Posting photo to page %s with URL: %s", pageID, mediaURL)
				return spp.postToFacebookWithPhotoToPage(content, mediaURL, accessToken, pageID)
			}
		} else {
			// Multiple media items - create album post
			log.Printf("Facebook: Posting multiple media items to page %s (%d items)", pageID, len(mediaURLs))
			return spp.postToFacebookWithMultipleMediaToPage(content, mediaURLs, accessToken, pageID)
		}
	} else {
		// Post text-only using feed endpoint
		return spp.postToFacebookTextOnlyToPage(content, accessToken, pageID)
	}
}

// postToFacebook posts directly to Facebook using access token
func (spp *ScheduledPostProcessor) postToFacebook(content string, mediaURLs []string, accessToken string) error {
	// Check if we have media to post
	if len(mediaURLs) > 0 {
		// Detect if it's a video or image
		mediaURL := mediaURLs[0]
		isVideo := strings.Contains(mediaURL, "/video/") ||
			strings.Contains(mediaURL, ".mp4") ||
			strings.Contains(mediaURL, ".mov") ||
			strings.Contains(mediaURL, ".avi") ||
			strings.Contains(mediaURL, ".webm")

		if isVideo {
			log.Printf("Facebook: Posting video with URL: %s", mediaURL)
			return spp.postToFacebookWithVideo(content, mediaURL, accessToken)
		} else {
			log.Printf("Facebook: Posting photo with URL: %s", mediaURL)
			return spp.postToFacebookWithPhoto(content, mediaURL, accessToken)
		}
	} else {
		// Post text-only using feed endpoint
		return spp.postToFacebookTextOnly(content, accessToken)
	}
}

// postToFacebookTextOnlyToPage posts text-only content to a specific Facebook page
func (spp *ScheduledPostProcessor) postToFacebookTextOnlyToPage(content string, accessToken string, pageID string) error {
	url := fmt.Sprintf("https://graph.facebook.com/v18.0/%s/feed", pageID)

	payload := map[string]interface{}{
		"message":      content,
		"access_token": accessToken,
	}

	return spp.makeHTTPRequest("POST", url, payload)
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
		"url":          imageURL, // Direct image URL
		"caption":      content,  // Post text as caption
		"access_token": accessToken,
	}

	log.Printf("Facebook: Posting photo with URL: %s", imageURL)

	return spp.makeHTTPRequest("POST", url, payload)
}

// postToFacebookWithVideo posts content with video to Facebook
func (spp *ScheduledPostProcessor) postToFacebookWithVideo(content string, videoURL string, accessToken string) error {
	// Use Facebook's videos endpoint to post video with description
	url := "https://graph.facebook.com/v18.0/me/videos"

	payload := map[string]interface{}{
		"file_url":     videoURL, // Direct video URL
		"description":  content,  // Post text as description
		"access_token": accessToken,
	}

	log.Printf("Facebook: Posting video with URL: %s", videoURL)

	return spp.makeHTTPRequest("POST", url, payload)
}

// postToFacebookWithPhotoToPage posts content with photo to a specific Facebook page
func (spp *ScheduledPostProcessor) postToFacebookWithPhotoToPage(content string, imageURL string, accessToken string, pageID string) error {
	// Use Facebook's photos endpoint to post image with caption
	url := fmt.Sprintf("https://graph.facebook.com/v18.0/%s/photos", pageID)

	payload := map[string]interface{}{
		"url":          imageURL, // Direct image URL
		"message":      content,  // Post text as message
		"access_token": accessToken,
	}

	log.Printf("Facebook: Posting photo to page %s with URL: %s", pageID, imageURL)

	return spp.makeHTTPRequest("POST", url, payload)
}

// postToFacebookWithVideoToPage posts content with video to a specific Facebook page
func (spp *ScheduledPostProcessor) postToFacebookWithVideoToPage(content string, videoURL string, accessToken string, pageID string) error {
	// Use Facebook's videos endpoint to post video with description
	url := fmt.Sprintf("https://graph.facebook.com/v18.0/%s/videos", pageID)

	payload := map[string]interface{}{
		"file_url":     videoURL, // Direct video URL
		"description":  content,  // Post text as description
		"access_token": accessToken,
	}

	log.Printf("Facebook: Posting video to page %s with URL: %s", pageID, videoURL)

	return spp.makeHTTPRequest("POST", url, payload)
}

// postToInstagram posts directly to Instagram using access token with token refresh
func (spp *ScheduledPostProcessor) postToInstagram(content string, mediaURLs []string, accessToken string) error {
	// First, check if the token is valid by making a test request
	_, err := spp.getInstagramUserID(accessToken)
	if err != nil {
		log.Printf("Instagram: Failed to get user ID, token may be expired: %v", err)

		// Try to refresh the token using Facebook's token exchange
		newAccessToken, refreshErr := spp.refreshFacebookToken(accessToken)
		if refreshErr != nil {
			log.Printf("Instagram: Token refresh failed: %v", refreshErr)
			return fmt.Errorf("Instagram token expired and refresh failed: %v - please reconnect Facebook account", refreshErr)
		}

		log.Printf("Instagram: Token refreshed successfully, retrying...")
		accessToken = newAccessToken

		// Update the token in database
		updateErr := spp.updateFacebookAccessToken(accessToken, newAccessToken)
		if updateErr != nil {
			log.Printf("WARNING: Failed to update Facebook access token in database: %v", updateErr)
		}
	}

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

	// Try to post to Instagram
	err = spp.makeHTTPRequest("POST", url, payload)
	if err != nil {
		// Check if it's a token issue
		if strings.Contains(err.Error(), "401") || strings.Contains(err.Error(), "403") {
			log.Printf("Instagram: Post failed with token error, attempting refresh...")

			// Try to refresh the token
			newAccessToken, refreshErr := spp.refreshFacebookToken(accessToken)
			if refreshErr != nil {
				log.Printf("Instagram: Token refresh failed: %v", refreshErr)
				return fmt.Errorf("Instagram token expired and refresh failed: %v - please reconnect Facebook account", refreshErr)
			}

			log.Printf("Instagram: Token refreshed successfully, retrying post...")

			// Update the token in database
			updateErr := spp.updateFacebookAccessToken(accessToken, newAccessToken)
			if updateErr != nil {
				log.Printf("WARNING: Failed to update Facebook access token in database: %v", updateErr)
			}

			// Retry with new token
			payload["access_token"] = newAccessToken
			err = spp.makeHTTPRequest("POST", url, payload)
			if err != nil {
				log.Printf("Instagram: Post failed even after token refresh: %v", err)
				return fmt.Errorf("Instagram post failed after token refresh: %v", err)
			}

			log.Printf("Instagram: Post successful after token refresh")
			return nil
		}
		return err
	}

	log.Printf("Instagram: Post successful")
	return nil
}

// postToYouTube posts directly to YouTube using access token with automatic token refresh
func (spp *ScheduledPostProcessor) postToYouTube(content string, mediaURLs []string, accessToken string) error {
	if len(mediaURLs) == 0 {
		return fmt.Errorf("YouTube requires a video file")
	}

	videoURL := mediaURLs[0]
	log.Printf("YouTube: Uploading video with URL: %s", videoURL)

	// Try to upload with current token
	err := spp.uploadVideoToYouTube(content, videoURL, accessToken)

	// If we get a 401 error, try to refresh the token and retry
	if err != nil && strings.Contains(err.Error(), "401") {
		log.Printf("YouTube: Access token expired (401), attempting to refresh token...")

		// Get refresh token from database
		refreshToken, getErr := spp.getYouTubeRefreshToken(accessToken)
		if getErr != nil {
			log.Printf("ERROR: Failed to get YouTube refresh token: %v", getErr)
			return fmt.Errorf("YouTube access token expired and refresh failed: %v - please reconnect YouTube account", getErr)
		}

		// Refresh the access token
		newAccessToken, refreshErr := spp.refreshYouTubeToken(refreshToken)
		if refreshErr != nil {
			log.Printf("ERROR: Failed to refresh YouTube token: %v", refreshErr)
			return fmt.Errorf("YouTube token refresh failed: %v - please reconnect YouTube account", refreshErr)
		}

		log.Printf("YouTube: Token refreshed successfully")

		// Update the token in database
		updateErr := spp.updateYouTubeAccessToken(accessToken, newAccessToken)
		if updateErr != nil {
			log.Printf("WARNING: Failed to update YouTube access token in database: %v", updateErr)
			// Continue anyway, the upload might still work with the new token
		}

		// Retry upload with new token
		log.Printf("YouTube: Retrying upload with refreshed token...")
		err = spp.uploadVideoToYouTube(content, videoURL, newAccessToken)
		if err != nil {
			log.Printf("ERROR: YouTube upload failed even after token refresh: %v", err)
			return fmt.Errorf("YouTube upload failed after token refresh: %v", err)
		}

		log.Printf("YouTube: Upload successful after token refresh")
		return nil
	}

	return err
}

// getYouTubeRefreshToken retrieves the refresh token for YouTube
func (spp *ScheduledPostProcessor) getYouTubeRefreshToken(accessToken string) (string, error) {
	var refreshToken string
	query := `
		SELECT refresh_token 
		FROM social_accounts 
		WHERE access_token = $1 AND platform = 'youtube'
	`

	err := spp.db.QueryRow(query, accessToken).Scan(&refreshToken)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", fmt.Errorf("YouTube account not found")
		}
		return "", fmt.Errorf("database error: %v", err)
	}

	if refreshToken == "" {
		return "", fmt.Errorf("refresh token is empty - account may need to be reconnected")
	}

	return refreshToken, nil
}

// getYouTubeOAuthConfig creates OAuth2 config for YouTube
func (spp *ScheduledPostProcessor) getYouTubeOAuthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URI"),
		Scopes: []string{
			"https://www.googleapis.com/auth/youtube.upload",
			"https://www.googleapis.com/auth/youtube",
		},
		Endpoint: google.Endpoint,
	}
}

// refreshYouTubeToken refreshes an expired YouTube access token
func (spp *ScheduledPostProcessor) refreshYouTubeToken(refreshToken string) (string, error) {
	config := spp.getYouTubeOAuthConfig()
	token := &oauth2.Token{RefreshToken: refreshToken}

	// Create token source for refreshing
	tokenSource := config.TokenSource(context.Background(), token)

	// Get new token
	newToken, err := tokenSource.Token()
	if err != nil {
		log.Printf("ERROR: OAuth2 token refresh failed: %v", err)
		return "", fmt.Errorf("OAuth2 token refresh failed: %v", err)
	}

	if newToken.AccessToken == "" {
		return "", fmt.Errorf("received empty access token from refresh")
	}

	log.Printf("YouTube: Successfully refreshed access token (expires: %v)", newToken.Expiry)
	return newToken.AccessToken, nil
}

// updateYouTubeAccessToken updates the access token in the database
func (spp *ScheduledPostProcessor) updateYouTubeAccessToken(oldToken, newToken string) error {
	query := `
		UPDATE social_accounts 
		SET access_token = $1, last_synced_at = NOW()
		WHERE access_token = $2 AND platform = 'youtube'
	`

	result, err := spp.db.Exec(query, newToken, oldToken)
	if err != nil {
		return fmt.Errorf("database update failed: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("WARNING: Could not check rows affected: %v", err)
	} else if rowsAffected == 0 {
		log.Printf("WARNING: No rows updated when setting new access token")
	} else {
		log.Printf("YouTube: Successfully updated access token in database")
	}

	return nil
}

// Main upload function
func (spp *ScheduledPostProcessor) uploadVideoToYouTube(content, videoURL, accessToken string) error {

	// Download video from Cloudinary
	resp, err := http.Get(videoURL)
	if err != nil {
		log.Printf("ERROR: Failed to download video from Cloudinary: %v", err)
		return fmt.Errorf("failed to download video: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("ERROR: Failed to download video, status: %d", resp.StatusCode)
		return fmt.Errorf("failed to download video, status: %d", resp.StatusCode)
	}

	// Read video content
	videoContent, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("ERROR: Failed to read video content: %v", err)
		return fmt.Errorf("failed to read video content: %v", err)
	}

	log.Printf("DEBUG: Downloaded video, size: %d bytes", len(videoContent))

	// Create metadata
	title := content
	if len(title) > 100 {
		title = title[:100] // YouTube title limit
	}

	metadata := map[string]interface{}{
		"snippet": map[string]interface{}{
			"title":       title,
			"description": content,
			"categoryId":  "22", // People & Blogs category
		},
		"status": map[string]interface{}{
			"privacyStatus": "private", // Default to private for safety
		},
	}

	// Step 1: Initialize resumable upload
	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		log.Printf("ERROR: Failed to marshal metadata: %v", err)
		return fmt.Errorf("failed to marshal metadata: %v", err)
	}

	initURL := "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status"
	initReq, err := http.NewRequest("POST", initURL, bytes.NewReader(metadataJSON))
	if err != nil {
		return fmt.Errorf("failed to create init request: %v", err)
	}

	initReq.Header.Set("Authorization", "Bearer "+accessToken)
	initReq.Header.Set("Content-Type", "application/json")
	initReq.Header.Set("X-Upload-Content-Type", "video/*")
	initReq.Header.Set("X-Upload-content-length", fmt.Sprintf("%d", len(videoContent)))

	client := &http.Client{Timeout: 30 * time.Second}
	initResp, err := client.Do(initReq)
	if err != nil {
		log.Printf("ERROR: Failed to initialize YouTube upload: %v", err)
		return fmt.Errorf("failed to initialize upload: %v", err)
	}
	defer initResp.Body.Close()

	log.Printf("DEBUG: YouTube init response status: %d", initResp.StatusCode)

	if initResp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(initResp.Body)
		log.Printf("ERROR: YouTube init failed: %s", string(bodyBytes))
		return fmt.Errorf("failed to initialize upload: %d - %s", initResp.StatusCode, string(bodyBytes))
	}

	uploadURL := initResp.Header.Get("Location")
	if uploadURL == "" {
		return fmt.Errorf("no upload URL received from YouTube")
	}

	log.Printf("DEBUG: YouTube upload URL received: %s", uploadURL[:50]+"...")

	// Step 2: Upload video content
	uploadReq, err := http.NewRequest("PUT", uploadURL, bytes.NewReader(videoContent))
	if err != nil {
		return fmt.Errorf("failed to create upload request: %v", err)
	}

	uploadReq.Header.Set("Content-Type", "video/*")

	uploadClient := &http.Client{Timeout: 1200 * time.Second} // 20 minutes for large video upload
	uploadResp, err := uploadClient.Do(uploadReq)
	if err != nil {
		log.Printf("ERROR: Failed to upload video to YouTube: %v", err)
		return fmt.Errorf("failed to upload video: %v", err)
	}
	defer uploadResp.Body.Close()

	log.Printf("DEBUG: YouTube upload response status: %d", uploadResp.StatusCode)

	if uploadResp.StatusCode != http.StatusOK && uploadResp.StatusCode != http.StatusCreated {
		bodyBytes, _ := io.ReadAll(uploadResp.Body)
		log.Printf("ERROR: YouTube upload failed: %s", string(bodyBytes))
		return fmt.Errorf("video upload failed: %d - %s", uploadResp.StatusCode, string(bodyBytes))
	}

	log.Printf("YouTube: Video uploaded successfully")
	return nil
}

// postToTwitter posts directly to Twitter using access token
func (spp *ScheduledPostProcessor) postToTwitter(content string, mediaURLs []string, accessToken string) error {
	// Twitter API v2 endpoint (OAuth 2.0)
	apiURL := "https://api.twitter.com/2/tweets"

	// Prepare the tweet content and media
	tweetText := content
	payload := map[string]interface{}{
		"text": tweetText,
	}

	// Handle media uploads if provided
	if len(mediaURLs) > 0 {
		mediaIds := []string{}
		hasValidMedia := false

		for _, mediaUrl := range mediaURLs {
			// Upload media to Twitter
			mediaId, err := spp.uploadMediaToTwitter(accessToken, mediaUrl)
			if err != nil {
				log.Printf("DEBUG: Media upload failed for scheduled post: %v", err)
				// Continue without this media item
				continue
			}

			// Check if we got a real media ID (not mock)
			if !strings.HasPrefix(mediaId, "mock_media_id_") {
				mediaIds = append(mediaIds, mediaId)
				hasValidMedia = true
			} else {
				log.Printf("DEBUG: Got mock media ID, skipping media for this scheduled tweet")
			}
		}

		// Only add media if we have valid media IDs
		if hasValidMedia && len(mediaIds) > 0 {
			payload["media"] = map[string]interface{}{
				"media_ids": mediaIds,
			}
			log.Printf("DEBUG: Added %d valid media IDs to scheduled tweet", len(mediaIds))
		} else {
			log.Printf("DEBUG: No valid media IDs, adding image URLs to scheduled tweet text")
			// Add image URLs to the tweet text as a fallback
			imageUrls := []string{}
			for _, mediaUrl := range mediaURLs {
				imageUrls = append(imageUrls, mediaUrl)
			}
			if len(imageUrls) > 0 {
				payload["text"] = content + "\n\n📸 " + strings.Join(imageUrls, " ")
			}
		}
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

// getMastodonInstanceURL gets the instance URL for a Mastodon account using access token
func (spp *ScheduledPostProcessor) getMastodonInstanceURL(accessToken string) (string, error) {
	tokenPrefix := accessToken
	if len(accessToken) > 10 {
		tokenPrefix = accessToken[:10]
	}
	log.Printf("DEBUG: getMastodonInstanceURL called with access token prefix: %s...", tokenPrefix)

	// Query to get the social_id from social_accounts table (same approach as direct posting)
	query := `
		SELECT social_id 
		FROM social_accounts 
		WHERE access_token = $1 AND platform = 'mastodon'
	`

	var socialID string
	err := spp.db.QueryRow(query, accessToken).Scan(&socialID)
	if err != nil {
		log.Printf("ERROR: Failed to get social_id from database: %v", err)
		return "", fmt.Errorf("failed to get social_id: %v", err)
	}

	log.Printf("DEBUG: Found social_id: %s", socialID)

	// Extract instance URL from social_id (same logic as mastodon_post.go)
	var instanceURL string
	if strings.Contains(socialID, "://") {
		lastColonIndex := strings.LastIndex(socialID, ":")
		if lastColonIndex == -1 {
			log.Printf("ERROR: Invalid social_id format (no colon found): %s", socialID)
			return "", fmt.Errorf("invalid social_id format (no colon found): %s", socialID)
		}
		instanceURL = socialID[:lastColonIndex]
	} else {
		parts := strings.Split(socialID, ":")
		if len(parts) < 2 {
			log.Printf("ERROR: Invalid social_id format: %s", socialID)
			return "", fmt.Errorf("invalid social_id format: %s", socialID)
		}
		instanceURL = parts[0]
		if !strings.HasPrefix(instanceURL, "http://") && !strings.HasPrefix(instanceURL, "https://") {
			instanceURL = "https://" + instanceURL
		}
	}

	log.Printf("DEBUG: Extracted instance URL: %s", instanceURL)
	return instanceURL, nil
}

// uploadMediaToMastodon uploads a media file to Mastodon and returns the media ID
func (spp *ScheduledPostProcessor) uploadMediaToMastodon(instanceURL, accessToken, mediaURL string) (string, error) {
	log.Printf("DEBUG: uploadMediaToMastodon called with mediaURL: %s", mediaURL)

	// Download the image from Cloudinary
	resp, err := http.Get(mediaURL)
	if err != nil {
		log.Printf("ERROR: Failed to download image from %s: %v", mediaURL, err)
		return "", fmt.Errorf("failed to download image: %v", err)
	}
	defer resp.Body.Close()

	log.Printf("debug: downloaded image, status: %d, content-length: %s", resp.StatusCode, resp.Header.Get("content-length"))

	// Create a buffer to store the image data
	var buf bytes.Buffer
	_, err = io.Copy(&buf, resp.Body)
	if err != nil {
		log.Printf("ERROR: Failed to read image data: %v", err)
		return "", fmt.Errorf("failed to read image data: %v", err)
	}

	log.Printf("DEBUG: Image data size: %d bytes", buf.Len())

	// Create a new multipart writer
	var requestBody bytes.Buffer
	writer := multipart.NewWriter(&requestBody)

	// Add the file field
	part, err := writer.CreateFormFile("file", "image")
	if err != nil {
		log.Printf("ERROR: Failed to create form file: %v", err)
		return "", fmt.Errorf("failed to create form file: %v", err)
	}
	_, err = part.Write(buf.Bytes())
	if err != nil {
		log.Printf("ERROR: Failed to write image data: %v", err)
		return "", fmt.Errorf("failed to write image data: %v", err)
	}

	// Close the multipart writer
	writer.Close()

	// Upload to Mastodon
	uploadURL := instanceURL + "/api/v1/media"
	log.Printf("DEBUG: Uploading to Mastodon URL: %s", uploadURL)

	req, err := http.NewRequest("POST", uploadURL, &requestBody)
	if err != nil {
		log.Printf("ERROR: Failed to create upload request: %v", err)
		return "", fmt.Errorf("failed to create upload request: %v", err)
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: 30 * time.Second}
	uploadResp, err := client.Do(req)
	if err != nil {
		log.Printf("ERROR: Failed to upload image to Mastodon: %v", err)
		return "", fmt.Errorf("failed to upload image to Mastodon: %v", err)
	}
	defer uploadResp.Body.Close()

	log.Printf("DEBUG: Mastodon upload response status: %d", uploadResp.StatusCode)

	if uploadResp.StatusCode != http.StatusOK && uploadResp.StatusCode != http.StatusCreated {
		// Read response body for error details
		bodyBytes, _ := io.ReadAll(uploadResp.Body)
		log.Printf("ERROR: Mastodon media upload failed with status: %d, body: %s", uploadResp.StatusCode, string(bodyBytes))
		return "", fmt.Errorf("Mastodon media upload failed with status: %d", uploadResp.StatusCode)
	}

	// Parse the response to get the media ID
	var uploadResult struct {
		ID string `json:"id"`
	}

	err = json.NewDecoder(uploadResp.Body).Decode(&uploadResult)
	if err != nil {
		log.Printf("ERROR: Failed to parse media upload response: %v", err)
		return "", fmt.Errorf("failed to parse media upload response: %v", err)
	}

	log.Printf("DEBUG: Successfully got media ID: %s", uploadResult.ID)
	return uploadResult.ID, nil
}

// postToMastodon posts directly to Mastodon using access token
func (spp *ScheduledPostProcessor) postToMastodon(content string, mediaURLs []string, accessToken string) error {
	log.Printf("DEBUG: postToMastodon called with content length: %d, mediaURLs count: %d", len(content), len(mediaURLs))
	log.Printf("DEBUG: mediaURLs: %v", mediaURLs)

	// Get instance URL from database (should be stored when user connects)
	instanceURL, err := spp.getMastodonInstanceURL(accessToken)
	if err != nil {
		log.Printf("ERROR: Failed to get Mastodon instance URL: %v", err)
		return fmt.Errorf("failed to get Mastodon instance URL: %v", err)
	}

	log.Printf("DEBUG: Using instance URL: %s", instanceURL)

	// Upload media files first if any
	var mediaIDs []string
	if len(mediaURLs) > 0 {
		log.Printf("DEBUG: Starting media upload for %d files", len(mediaURLs))
		for i, mediaURL := range mediaURLs {
			if mediaURL != "" {
				log.Printf("DEBUG: Uploading media %d: %s", i+1, mediaURL)
				mediaID, err := spp.uploadMediaToMastodon(instanceURL, accessToken, mediaURL)
				if err != nil {
					log.Printf("ERROR: Failed to upload media to Mastodon: %v", err)
					// Continue without media rather than failing completely
				} else {
					log.Printf("DEBUG: Successfully uploaded media, got ID: %s", mediaID)
					mediaIDs = append(mediaIDs, mediaID)
				}
			}
		}
	}

	log.Printf("DEBUG: Final mediaIDs count: %d", len(mediaIDs))

	// Create status payload
	payload := map[string]interface{}{
		"status":     content,
		"visibility": "public", // Default visibility
	}

	// Add media IDs if we have any
	if len(mediaIDs) > 0 {
		payload["media_ids"] = mediaIDs
		log.Printf("DEBUG: Added media_ids to payload: %v", mediaIDs)
	}

	statusURL := instanceURL + "/api/v1/statuses"
	log.Printf("DEBUG: Posting to URL: %s", statusURL)
	return spp.makeHTTPRequestWithAuth("POST", statusURL, payload, "Bearer "+accessToken)
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

// uploadMediaToTwitter uploads media to Twitter and returns the media ID
func (spp *ScheduledPostProcessor) uploadMediaToTwitter(accessToken, mediaUrl string) (string, error) {
	log.Printf("DEBUG: Starting media upload for scheduled post: %s", mediaUrl)

	// Step 1: Download the media from the URL
	resp, err := http.Get(mediaUrl)
	if err != nil {
		log.Printf("DEBUG: Failed to download media from %s: %v", mediaUrl, err)
		return "", fmt.Errorf("failed to download media: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("DEBUG: Media download failed with status %d", resp.StatusCode)
		return "", fmt.Errorf("media download failed with status %d", resp.StatusCode)
	}

	// Step 2: Read the media data
	mediaData, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("DEBUG: Failed to read media data: %v", err)
		return "", fmt.Errorf("failed to read media data: %v", err)
	}

	log.Printf("DEBUG: Downloaded media, size: %d bytes", len(mediaData))

	// Step 3: Upload to Twitter's media upload endpoint
	uploadURL := "https://upload.twitter.com/1.1/media/upload.json"

	// Create multipart form data
	var requestBody bytes.Buffer
	writer := multipart.NewWriter(&requestBody)

	// Add the media file
	part, err := writer.CreateFormFile("media", "image")
	if err != nil {
		log.Printf("DEBUG: Failed to create form file: %v", err)
		return "", fmt.Errorf("failed to create form file: %v", err)
	}

	_, err = part.Write(mediaData)
	if err != nil {
		log.Printf("DEBUG: Failed to write media data: %v", err)
		return "", fmt.Errorf("failed to write media data: %v", err)
	}

	// Close the writer
	writer.Close()

	// Step 4: Create HTTP request to Twitter
	req, err := http.NewRequest("POST", uploadURL, &requestBody)
	if err != nil {
		log.Printf("DEBUG: Failed to create upload request: %v", err)
		return "", fmt.Errorf("failed to create upload request: %v", err)
	}

	// Set headers
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+accessToken)

	// Step 5: Make the request
	client := &http.Client{Timeout: 60 * time.Second} // Longer timeout for media upload
	uploadResp, err := client.Do(req)
	if err != nil {
		log.Printf("DEBUG: Media upload request failed: %v", err)
		return "", fmt.Errorf("media upload request failed: %v", err)
	}
	defer uploadResp.Body.Close()

	// Step 6: Handle response
	if uploadResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(uploadResp.Body)
		log.Printf("DEBUG: Twitter media upload failed: %d - %s", uploadResp.StatusCode, string(body))

		// For testing, return mock success if we get auth errors
		if uploadResp.StatusCode == 401 || uploadResp.StatusCode == 403 {
			log.Printf("DEBUG: Twitter auth error, returning mock media ID for testing")
			return "mock_media_id_" + accessToken[:8], nil
		}

		return "", fmt.Errorf("twitter media upload failed: %d - %s", uploadResp.StatusCode, string(body))
	}

	// Step 7: Parse response and extract media ID
	var uploadResult struct {
		MediaID string `json:"media_id_string"`
	}

	responseBody, err := io.ReadAll(uploadResp.Body)
	if err != nil {
		log.Printf("DEBUG: Failed to read upload response: %v", err)
		return "", fmt.Errorf("failed to read upload response: %v", err)
	}

	log.Printf("DEBUG: Twitter upload response: %s", string(responseBody))

	if err := json.Unmarshal(responseBody, &uploadResult); err != nil {
		log.Printf("DEBUG: Failed to parse upload response: %v", err)
		return "", fmt.Errorf("failed to parse upload response: %v", err)
	}

	if uploadResult.MediaID == "" {
		log.Printf("DEBUG: No media ID in response, returning mock for testing")
		return "mock_media_id_" + accessToken[:8], nil
	}

	log.Printf("DEBUG: Successfully uploaded media to Twitter, ID: %s", uploadResult.MediaID)
	return uploadResult.MediaID, nil
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

// postToTelegram posts content to Telegram using the bot API
func (spp *ScheduledPostProcessor) postToTelegram(content string, mediaURLs []string, userID string) error {
	// Get bot token from environment
	botToken := os.Getenv("TELEGRAM_BOT_TOKEN")
	if botToken == "" {
		return fmt.Errorf("telegram bot token not configured")
	}

	// Get user's connected Telegram channel
	query := `
		SELECT social_id
		FROM social_accounts 
		WHERE user_id = $1 AND platform = 'telegram'
		ORDER BY connected_at DESC 
		LIMIT 1
	`

	var chatID string
	err := spp.db.QueryRow(query, userID).Scan(&chatID)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("user not connected to telegram")
		}
		return fmt.Errorf("database error: %v", err)
	}

	log.Printf("Telegram: Posting to chat ID %s", chatID)

	// Send message using the same logic as the live posting
	return spp.sendTelegramMessage(botToken, chatID, content, mediaURLs)
}

// sendTelegramMessage sends a message with optional media to Telegram
func (spp *ScheduledPostProcessor) sendTelegramMessage(botToken, chatID, message string, mediaUrls []string) error {
	if len(mediaUrls) == 0 {
		// Send text-only message
		return spp.sendTelegramTextMessage(botToken, chatID, message)
	} else if len(mediaUrls) == 1 {
		// Send single media with caption
		return spp.sendTelegramSingleMedia(botToken, chatID, message, mediaUrls[0])
	} else {
		// Send media group with caption
		return spp.sendTelegramMediaGroup(botToken, chatID, message, mediaUrls)
	}
}

// sendTelegramTextMessage sends a text-only message
func (spp *ScheduledPostProcessor) sendTelegramTextMessage(botToken, chatID, message string) error {
	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", botToken)

	payload := map[string]interface{}{
		"chat_id": chatID,
		"text":    message,
	}

	return spp.makeTelegramRequest(url, payload)
}

// sendTelegramSingleMedia sends a single photo/video with caption
func (spp *ScheduledPostProcessor) sendTelegramSingleMedia(botToken, chatID, caption, mediaUrl string) error {
	var url string
	var payload map[string]interface{}

	// Determine if it's a photo or video based on URL
	if spp.isVideoUrl(mediaUrl) {
		url = fmt.Sprintf("https://api.telegram.org/bot%s/sendVideo", botToken)
		payload = map[string]interface{}{
			"chat_id": chatID,
			"video":   mediaUrl,
			"caption": caption,
		}
	} else {
		url = fmt.Sprintf("https://api.telegram.org/bot%s/sendPhoto", botToken)
		payload = map[string]interface{}{
			"chat_id": chatID,
			"photo":   mediaUrl,
			"caption": caption,
		}
	}

	return spp.makeTelegramRequest(url, payload)
}

// sendTelegramMediaGroup sends multiple media items as a group
func (spp *ScheduledPostProcessor) sendTelegramMediaGroup(botToken, chatID, caption string, mediaUrls []string) error {
	// Check if we have mixed media types
	var hasPhotos, hasVideos bool
	for _, mediaUrl := range mediaUrls {
		if spp.isVideoUrl(mediaUrl) {
			hasVideos = true
		} else {
			hasPhotos = true
		}
	}

	// If we have mixed media, send them separately
	if hasPhotos && hasVideos {
		return spp.sendTelegramMixedMedia(botToken, chatID, caption, mediaUrls)
	}

	// For same media type, use media group
	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMediaGroup", botToken)

	// Build media array (max 10 items for Telegram)
	media := make([]map[string]interface{}, 0, len(mediaUrls))
	for i, mediaUrl := range mediaUrls {
		if i >= 10 { // Telegram limit
			break
		}

		mediaType := "photo"
		if spp.isVideoUrl(mediaUrl) {
			mediaType = "video"
		}

		mediaItem := map[string]interface{}{
			"type":  mediaType,
			"media": mediaUrl,
		}

		// Add caption to first item only
		if i == 0 && caption != "" {
			mediaItem["caption"] = caption
		}

		media = append(media, mediaItem)
	}

	payload := map[string]interface{}{
		"chat_id": chatID,
		"media":   media,
	}

	return spp.makeTelegramRequest(url, payload)
}

// sendTelegramMixedMedia handles mixed media by sending them as separate messages
func (spp *ScheduledPostProcessor) sendTelegramMixedMedia(botToken, chatID, caption string, mediaUrls []string) error {
	// Separate photos and videos
	var photos, videos []string
	for _, mediaUrl := range mediaUrls {
		if spp.isVideoUrl(mediaUrl) {
			videos = append(videos, mediaUrl)
		} else {
			photos = append(photos, mediaUrl)
		}
	}

	// Send photos first (if any)
	if len(photos) > 0 {
		photoCaption := caption
		if len(videos) > 0 {
			photoCaption = fmt.Sprintf("%s\n\n[Photos %d/%d]", caption, 1, 2)
		}

		if len(photos) == 1 {
			// Single photo
			if err := spp.sendTelegramSingleMedia(botToken, chatID, photoCaption, photos[0]); err != nil {
				return fmt.Errorf("failed to send photo: %v", err)
			}
		} else {
			// Multiple photos - use media group
			if err := spp.sendTelegramMediaGroup(botToken, chatID, photoCaption, photos); err != nil {
				return fmt.Errorf("failed to send photos: %v", err)
			}
		}
	}

	// Send videos (if any)
	if len(videos) > 0 {
		videoCaption := caption
		if len(photos) > 0 {
			videoCaption = fmt.Sprintf("%s\n\n[Videos %d/%d]", caption, 2, 2)
		}

		if len(videos) == 1 {
			// Single video
			if err := spp.sendTelegramSingleMedia(botToken, chatID, videoCaption, videos[0]); err != nil {
				return fmt.Errorf("failed to send video: %v", err)
			}
		} else {
			// Multiple videos - use media group
			if err := spp.sendTelegramMediaGroup(botToken, chatID, videoCaption, videos); err != nil {
				return fmt.Errorf("failed to send videos: %v", err)
			}
		}
	}

	return nil
}

// makeTelegramRequest sends a request to Telegram API
func (spp *ScheduledPostProcessor) makeTelegramRequest(url string, payload map[string]interface{}) error {
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %v", err)
	}

	resp, err := http.Post(url, "application/json", strings.NewReader(string(jsonData)))
	if err != nil {
		return fmt.Errorf("network error: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %v", err)
	}

	var sendResp struct {
		OK          bool   `json:"ok"`
		Description string `json:"description,omitempty"`
	}

	if err := json.Unmarshal(body, &sendResp); err != nil {
		return fmt.Errorf("failed to parse response: %v", err)
	}

	if !sendResp.OK {
		return fmt.Errorf("telegram API error: %s", sendResp.Description)
	}

	log.Printf("Telegram: Message sent successfully")
	return nil
}

// isVideoUrl determines if a URL points to a video file
func (spp *ScheduledPostProcessor) isVideoUrl(url string) bool {
	videoExtensions := []string{".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm", ".m4v"}
	lowerUrl := strings.ToLower(url)

	// Check for file extensions
	for _, ext := range videoExtensions {
		if strings.Contains(lowerUrl, ext) {
			return true
		}
	}

	// Check for Cloudinary video URLs
	if strings.Contains(lowerUrl, "cloudinary.com") {
		// Cloudinary video URLs typically contain "video" in the path
		if strings.Contains(lowerUrl, "/video/") || strings.Contains(lowerUrl, "video_upload") {
			return true
		}
	}

	// Check for other video indicators in URL
	videoIndicators := []string{"video", "mp4", "mov", "avi", "mkv", "webm"}
	for _, indicator := range videoIndicators {
		if strings.Contains(lowerUrl, indicator) {
			return true
		}
	}

	return false
}

// getInstagramUserID gets the Instagram user ID to test token validity
func (spp *ScheduledPostProcessor) getInstagramUserID(accessToken string) (string, error) {
	url := "https://graph.instagram.com/v18.0/me?fields=id"

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", fmt.Errorf("error creating instagram request: %v", err)
	}
	req.Header.Add("Authorization", "Bearer "+accessToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("error fetching instagram user info: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 401 || resp.StatusCode == 403 {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("instagram token expired or invalid permissions: %s", string(body))
	}
	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("instagram API returned status %d: %s", resp.StatusCode, string(body))
	}

	var userResponse struct {
		ID string `json:"id"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&userResponse); err != nil {
		return "", fmt.Errorf("error decoding instagram response: %v", err)
	}

	return userResponse.ID, nil
}

// refreshFacebookToken refreshes an expired Facebook access token
func (spp *ScheduledPostProcessor) refreshFacebookToken(accessToken string) (string, error) {
	// Facebook token exchange endpoint
	url := "https://graph.facebook.com/v18.0/oauth/access_token"

	payload := map[string]string{
		"grant_type":        "fb_exchange_token",
		"client_id":         os.Getenv("FACEBOOK_APP_ID"),
		"client_secret":     os.Getenv("FACEBOOK_APP_SECRET"),
		"fb_exchange_token": accessToken,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal payload: %v", err)
	}

	req, err := http.NewRequest("POST", url, strings.NewReader(string(jsonData)))
	if err != nil {
		return "", fmt.Errorf("error creating facebook token refresh request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("error refreshing facebook token: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("facebook token refresh failed with status %d: %s", resp.StatusCode, string(body))
	}

	var tokenResponse struct {
		AccessToken string `json:"access_token"`
		TokenType   string `json:"token_type"`
		ExpiresIn   int    `json:"expires_in"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&tokenResponse); err != nil {
		return "", fmt.Errorf("error decoding facebook token response: %v", err)
	}

	if tokenResponse.AccessToken == "" {
		return "", fmt.Errorf("received empty access token from facebook")
	}

	log.Printf("Facebook: Successfully refreshed access token (expires in: %d seconds)", tokenResponse.ExpiresIn)
	return tokenResponse.AccessToken, nil
}

// updateFacebookAccessToken updates the Facebook access token in the database
func (spp *ScheduledPostProcessor) updateFacebookAccessToken(oldToken, newToken string) error {
	query := `
		UPDATE social_accounts 
		SET access_token = $1, last_synced_at = NOW()
		WHERE access_token = $2 AND platform IN ('facebook', 'instagram')
	`

	result, err := spp.db.Exec(query, newToken, oldToken)
	if err != nil {
		return fmt.Errorf("database update failed: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("WARNING: Could not check rows affected: %v", err)
	} else if rowsAffected == 0 {
		log.Printf("WARNING: No rows updated when setting new Facebook access token")
	} else {
		log.Printf("Facebook: Successfully updated access token in database for %d accounts", rowsAffected)
	}

	return nil
}

// postToInstagramWithMultipleMedia handles Instagram posting with support for multiple media items (videos + images)
func (spp *ScheduledPostProcessor) postToInstagramWithMultipleMedia(instagramID, accessToken, caption string, mediaURLs []string) error {
	mediaCount := len(mediaURLs)
	mediaContainerIDs := make([]string, 0, mediaCount)

	// Process each media item
	for _, mediaURL := range mediaURLs {
		form := url.Values{}

		// Only mark as carousel item when posting a carousel
		if mediaCount > 1 {
			form.Set("is_carousel_item", "true")
		}

		// Determine media type using the same logic as immediate posting
		isVideo := spp.isVideoURL(mediaURL)
		log.Printf("Scheduled Instagram: Media URL: %s, isVideo: %v", mediaURL, isVideo)

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

		// Create individual media container
		createMediaURL := fmt.Sprintf("https://graph.facebook.com/v19.0/%s/media", instagramID)
		resp, err := http.Post(createMediaURL, "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
		if err != nil {
			return fmt.Errorf("failed to create media container: %w", err)
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return fmt.Errorf("failed to read media container creation response: %w", err)
		}

		if resp.StatusCode != http.StatusOK {
			log.Printf("Scheduled Instagram: Media container creation failed with status %d: %s", resp.StatusCode, string(body))
			return fmt.Errorf("media container creation failed: %s", body)
		}

		var result struct {
			ID string `json:"id"`
		}
		if err := json.Unmarshal(body, &result); err != nil || result.ID == "" {
			return fmt.Errorf("invalid response from media container creation: %w", err)
		}

		// Wait for individual media container to be ready
		if err := spp.waitForInstagramMediaReady(result.ID, accessToken); err != nil {
			return fmt.Errorf("media item failed to process: %w", err)
		}

		mediaContainerIDs = append(mediaContainerIDs, result.ID)
	}

	// Publish the post
	if mediaCount == 1 {
		// Single media post - publish directly
		publishForm := url.Values{}
		publishForm.Set("creation_id", mediaContainerIDs[0])
		publishForm.Set("access_token", accessToken)

		publishURL := fmt.Sprintf("https://graph.facebook.com/v19.0/%s/media_publish", instagramID)
		publishResp, err := http.Post(publishURL, "application/x-www-form-urlencoded", strings.NewReader(publishForm.Encode()))
		if err != nil {
			return fmt.Errorf("failed to publish post: %w", err)
		}

		body, err := io.ReadAll(publishResp.Body)
		publishResp.Body.Close()
		if err != nil {
			return fmt.Errorf("failed to read publish response: %w", err)
		}

		if publishResp.StatusCode != http.StatusOK {
			log.Printf("Scheduled Instagram: Single media publish failed with status %d: %s", publishResp.StatusCode, string(body))
			return fmt.Errorf("publish failed: %s", body)
		}

	} else {
		// Carousel post creation and publish
		carouselForm := url.Values{}
		carouselForm.Set("media_type", "CAROUSEL")
		carouselForm.Set("children", strings.Join(mediaContainerIDs, ","))
		carouselForm.Set("caption", caption)
		carouselForm.Set("access_token", accessToken)

		// Create carousel container
		createCarouselURL := fmt.Sprintf("https://graph.facebook.com/v19.0/%s/media", instagramID)
		carouselResp, err := http.Post(createCarouselURL, "application/x-www-form-urlencoded", strings.NewReader(carouselForm.Encode()))
		if err != nil {
			return fmt.Errorf("failed to create carousel container: %w", err)
		}

		body, err := io.ReadAll(carouselResp.Body)
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

		// Wait for carousel container to be ready
		if err := spp.waitForInstagramMediaReady(carouselResult.ID, accessToken); err != nil {
			return fmt.Errorf("carousel post failed to process: %w", err)
		}

		// Publish the carousel
		publishForm := url.Values{}
		publishForm.Set("creation_id", carouselResult.ID)
		publishForm.Set("access_token", accessToken)

		publishURL := fmt.Sprintf("https://graph.facebook.com/v19.0/%s/media_publish", instagramID)
		publishResp, err := http.Post(publishURL, "application/x-www-form-urlencoded", strings.NewReader(publishForm.Encode()))
		if err != nil {
			return fmt.Errorf("failed to publish carousel post: %w", err)
		}

		body, err = io.ReadAll(publishResp.Body)
		publishResp.Body.Close()
		if err != nil {
			return fmt.Errorf("failed to read publish response: %w", err)
		}

		if publishResp.StatusCode != http.StatusOK {
			log.Printf("Scheduled Instagram: Carousel publish failed with status %d: %s", publishResp.StatusCode, string(body))
			return fmt.Errorf("carousel publish failed: %s", body)
		}
	}

	return nil
}

// isVideoURL determines if a URL points to a video by checking file extension and content type
func (spp *ScheduledPostProcessor) isVideoURL(mediaURL string) bool {
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
	log.Printf("Scheduled Instagram: Content-Type for %s: %s", mediaURL, contentType)

	// Check if content type indicates video
	return strings.HasPrefix(contentType, "video/")
}

// waitForInstagramMediaReady polls Instagram media container status until ready or timeout
func (spp *ScheduledPostProcessor) waitForInstagramMediaReady(mediaID, accessToken string) error {
	statusURL := fmt.Sprintf("https://graph.facebook.com/v19.0/%s?fields=status_code&access_token=%s", mediaID, accessToken)

	const maxRetries = 30
	const delay = 5 * time.Second
	const initialDelay = 3 * time.Second

	time.Sleep(initialDelay)

	for i := 0; i < maxRetries; i++ {
		resp, err := http.Get(statusURL)
		if err != nil {
			return fmt.Errorf("failed to get media status: %w", err)
		}
		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return fmt.Errorf("failed to read media status response: %w", err)
		}

		if resp.StatusCode != http.StatusOK {
			return fmt.Errorf("media status check failed with status %d: %s", resp.StatusCode, string(body))
		}

		var res struct {
			StatusCode string `json:"status_code"`
		}
		if err := json.Unmarshal(body, &res); err != nil {
			return fmt.Errorf("failed to parse media status response: %w", err)
		}

		if res.StatusCode == "FINISHED" {
			return nil
		} else if res.StatusCode == "ERROR" {
			return fmt.Errorf("media upload failed with status 'ERROR'")
		}

		time.Sleep(delay)
	}

	return fmt.Errorf("media not ready for ID %s after %d retries (%s total wait)", mediaID, maxRetries, time.Duration(maxRetries)*delay)
}

// postToFacebookWithMultipleMediaToPage posts multiple media items to a specific Facebook page
func (spp *ScheduledPostProcessor) postToFacebookWithMultipleMediaToPage(content string, mediaURLs []string, accessToken string, pageID string) error {
	// For multiple media items, we need to create an album post
	// Facebook doesn't support mixed media in a single post, so we'll post them as separate posts

	var errs []string
	for i, mediaURL := range mediaURLs {
		isVideo := strings.Contains(mediaURL, "/video/") ||
			strings.Contains(mediaURL, ".mp4") ||
			strings.Contains(mediaURL, ".mov") ||
			strings.Contains(mediaURL, ".avi") ||
			strings.Contains(mediaURL, ".webm")

		// Add media number to content for multiple items
		postContent := content
		if len(mediaURLs) > 1 {
			postContent = fmt.Sprintf("%s\n\n[%d/%d]", content, i+1, len(mediaURLs))
		}

		if isVideo {
			log.Printf("Facebook: Posting video %d/%d to page %s with URL: %s", i+1, len(mediaURLs), pageID, mediaURL)
			if err := spp.postToFacebookWithVideoToPage(postContent, mediaURL, accessToken, pageID); err != nil {
				errs = append(errs, fmt.Sprintf("video %d: %v", i+1, err))
			}
		} else {
			log.Printf("Facebook: Posting photo %d/%d to page %s with URL: %s", i+1, len(mediaURLs), pageID, mediaURL)
			if err := spp.postToFacebookWithPhotoToPage(postContent, mediaURL, accessToken, pageID); err != nil {
				errs = append(errs, fmt.Sprintf("photo %d: %v", i+1, err))
			}
		}
	}

	if len(errs) > 0 {
		return fmt.Errorf("Facebook multiple media posting errors: %s", strings.Join(errs, "; "))
	}

	return nil
}
