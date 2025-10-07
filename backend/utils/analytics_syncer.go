package utils

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"social-sync-backend/lib"
	"social-sync-backend/models"

	"github.com/google/uuid"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

// stripHtmlTags removes HTML tags from a string
func stripHtmlTags(html string) string {
	if html == "" {
		return ""
	}

	// Simple regex-like approach to remove HTML tags
	result := html
	for {
		start := strings.Index(result, "<")
		if start == -1 {
			break
		}
		end := strings.Index(result[start:], ">")
		if end == -1 {
			break
		}
		result = result[:start] + result[start+end+1:]
	}

	// Clean up extra whitespace
	result = strings.TrimSpace(result)
	result = strings.ReplaceAll(result, "  ", " ")

	return result
}

// AnalyticsSyncer handles fetching and storing analytics data from social platforms
type AnalyticsSyncer struct {
	UserID   uuid.UUID
	Platform string
}

// NewAnalyticsSyncer creates a new analytics syncer for a specific user and platform
func NewAnalyticsSyncer(userID uuid.UUID, platform string) *AnalyticsSyncer {
	return &AnalyticsSyncer{
		UserID:   userID,
		Platform: platform,
	}
}

// SyncAnalytics fetches and stores analytics data for the platform
func (as *AnalyticsSyncer) SyncAnalytics() error {
	// Starting analytics sync

	// Skip Twitter analytics completely - disabled for now
	if as.Platform == "twitter" {
		// Twitter analytics disabled
		return nil
	}

	// Get all social accounts for the user and platform
	query := `
		SELECT id, social_id, access_token, display_name, profile_name
		FROM social_accounts 
		WHERE user_id = $1 AND platform = $2 AND status = 'active'
	`
	rows, err := lib.DB.Query(query, as.UserID, as.Platform)
	if err != nil {
		return fmt.Errorf("error fetching social accounts: %v", err)
	}
	defer rows.Close()

	var accounts []struct {
		ID          uuid.UUID
		SocialID    string
		AccessToken string
		DisplayName string
		ProfileName string
	}

	for rows.Next() {
		var account struct {
			ID          uuid.UUID
			SocialID    string
			AccessToken string
			DisplayName string
			ProfileName string
		}
		err := rows.Scan(&account.ID, &account.SocialID, &account.AccessToken, &account.DisplayName, &account.ProfileName)
		if err != nil {
			// Error scanning social account
			continue
		}
		accounts = append(accounts, account)
	}

	if len(accounts) == 0 {
		return nil
	}

	// Found social accounts

	// Fetch platform-specific data for each account and store separately
	for _, account := range accounts {
		// Fetching analytics for account

		var accountAnalytics *models.PostAnalytics
		var err error

		switch as.Platform {
		case "mastodon":
			accountAnalytics, err = as.fetchMastodonAnalytics(account.SocialID, account.AccessToken)
		case "facebook":
			accountAnalytics, err = as.fetchFacebookAnalytics(account.SocialID, account.AccessToken)
		case "instagram":
			accountAnalytics, err = as.fetchInstagramAnalytics(account.SocialID, account.AccessToken)
		case "twitter":
			accountAnalytics, err = as.fetchTwitterAnalytics(account.SocialID, account.AccessToken)
		case "youtube":
			accountAnalytics, err = as.fetchYouTubeAnalytics(account.SocialID, account.AccessToken)
		case "telegram":
			accountAnalytics, err = as.fetchTelegramAnalytics(account.SocialID, account.AccessToken)
		default:
			// Unsupported platform
			continue
		}

		if err != nil {
			// Error fetching analytics
			// Continue with other accounts instead of failing completely
			continue
		}

		// Set the account ID for this analytics data
		accountAnalytics.AccountID = &account.ID

		// Store analytics data for this specific account
		// Storing analytics data

		err = as.storeAnalytics(accountAnalytics)
		if err != nil {
			// Error storing analytics
			// Continue with other accounts instead of failing completely
			continue
		}

		// Successfully stored analytics data
	}

	// All accounts have been processed individually
	// Completed analytics sync
	return nil
}

// fetchMastodonAnalytics fetches analytics data from Mastodon API
func (as *AnalyticsSyncer) fetchMastodonAnalytics(accountID, accessToken string) (*models.PostAnalytics, error) {
	// Use proper HTTP client like your working social account syncer
	client := &http.Client{Timeout: 10 * time.Second}

	// Get user's statuses (posts) from Mastodon API
	// Account ID format: https://mastodon.social:114880857071638518
	// We need to extract the numeric ID from the account ID
	parts := strings.Split(accountID, "://")
	if len(parts) < 2 {
		return nil, fmt.Errorf("invalid account ID format: %s", accountID)
	}

	domainAndID := strings.Split(parts[1], ":")
	if len(domainAndID) < 2 {
		return nil, fmt.Errorf("invalid account ID format: %s", accountID)
	}

	domain := domainAndID[0]
	userID := domainAndID[1]

	// Fetch ALL posts with pagination
	var allPosts []struct {
		ID              string `json:"id"`
		Content         string `json:"content"`
		CreatedAt       string `json:"created_at"`
		FavouritesCount int    `json:"favourites_count"`
		RepliesCount    int    `json:"replies_count"`
		ReblogsCount    int    `json:"reblogs_count"`
	}

	// Start with initial request
	nextURL := fmt.Sprintf("https://%s/api/v1/accounts/%s/statuses?limit=40", domain, userID)

	// Making Mastodon API request

	// Fetch all pages of posts
	for nextURL != "" {
		req, err := http.NewRequest("GET", nextURL, nil)
		if err != nil {
			return nil, fmt.Errorf("error creating mastodon request: %v", err)
		}
		req.Header.Add("Authorization", "Bearer "+accessToken)

		resp, err := client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("error fetching mastodon data: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode == 401 || resp.StatusCode == 403 {
			return nil, fmt.Errorf("mastodon token expired or invalid permissions")
		}
		if resp.StatusCode != 200 {
			return nil, fmt.Errorf("mastodon API returned status %d", resp.StatusCode)
		}

		var mastodonResponse []struct {
			ID              string `json:"id"`
			Content         string `json:"content"`
			CreatedAt       string `json:"created_at"`
			FavouritesCount int    `json:"favourites_count"`
			RepliesCount    int    `json:"replies_count"`
			ReblogsCount    int    `json:"reblogs_count"`
		}

		if err := json.NewDecoder(resp.Body).Decode(&mastodonResponse); err != nil {
			return nil, fmt.Errorf("error decoding mastodon response: %v", err)
		}

		// Add posts from this page
		allPosts = append(allPosts, mastodonResponse...)

		// Check for next page in Link header
		linkHeader := resp.Header.Get("Link")
		nextURL = ""
		if linkHeader != "" {
			// Parse Link header to find next page
			// Format: <https://mastodon.social/api/v1/accounts/123/statuses?max_id=456>; rel="next"
			if strings.Contains(linkHeader, `rel="next"`) {
				start := strings.Index(linkHeader, "<")
				end := strings.Index(linkHeader[start:], ">")
				if start != -1 && end != -1 {
					nextURL = linkHeader[start+1 : start+end]
				}
			}
		}

		// Safety limit to prevent infinite loops
		if len(allPosts) > 2000 {
			// Reached safety limit
			break
		}
	}

	// Fetched posts

	// Calculate totals from all posts
	var totalPosts, totalLikes, totalComments, totalShares int
	var topPosts []map[string]interface{}

	// Debug: Log first few posts to see data
	// Analyzing posts

	for _, post := range allPosts {
		totalPosts++
		totalLikes += post.FavouritesCount
		totalComments += post.RepliesCount
		totalShares += post.ReblogsCount

		// Store top posts (limit to 5)
		if len(topPosts) < 5 {
			engagement := post.FavouritesCount + post.RepliesCount + post.ReblogsCount
			// Strip HTML from Mastodon content
			cleanContent := stripHtmlTags(post.Content)
			topPosts = append(topPosts, map[string]interface{}{
				"id":         post.ID,
				"content":    cleanContent,
				"likes":      post.FavouritesCount,
				"comments":   post.RepliesCount,
				"shares":     post.ReblogsCount,
				"engagement": engagement,
				"created_at": post.CreatedAt,
			})
		}
	}

	// Calculated totals

	// Convert top posts to JSON
	topPostsJSON, _ := json.Marshal(topPosts)

	// Calculate total engagement
	engagement := totalLikes + totalComments + totalShares

	return &models.PostAnalytics{
		UserID:        as.UserID,
		Platform:      as.Platform,
		SnapshotAt:    time.Now(),
		TotalPosts:    totalPosts,
		TotalLikes:    totalLikes,
		TotalComments: totalComments,
		TotalShares:   totalShares,
		TotalViews:    0, // Mastodon doesn't provide view counts in basic API
		Engagement:    engagement,
		TopPosts:      string(topPostsJSON),
	}, nil
}

// fetchFacebookAnalytics fetches analytics data from Facebook API
func (as *AnalyticsSyncer) fetchFacebookAnalytics(accountID, accessToken string) (*models.PostAnalytics, error) {
	// Use proper HTTP client like your working social account syncer
	client := &http.Client{Timeout: 10 * time.Second}

	// Fetch Facebook posts with pagination to get ALL posts
	var allPosts []struct {
		ID           string `json:"id"`
		Message      string `json:"message"`
		CreatedTime  string `json:"created_time"`
		FullPicture  string `json:"full_picture"`
		PermalinkURL string `json:"permalink_url"`
		Likes        struct {
			Summary struct {
				TotalCount int `json:"total_count"`
			} `json:"summary"`
		} `json:"likes"`
		Comments struct {
			Summary struct {
				TotalCount int `json:"total_count"`
			} `json:"summary"`
		} `json:"comments"`
		Shares struct {
			Count int `json:"count"`
		} `json:"shares"`
	}

	// Start with initial request - try v18.0 for better compatibility
	// Also try fetching comments with a different approach
	nextURL := fmt.Sprintf("https://graph.facebook.com/v18.0/%s/posts?fields=message,created_time,full_picture,permalink_url,likes.summary(true),comments.summary(true),shares&limit=100&access_token=%s", accountID, accessToken)

	// Making Facebook API request

	// Fetch all pages of posts
	for nextURL != "" {
		req, err := http.NewRequest("GET", nextURL, nil)
		if err != nil {
			return nil, fmt.Errorf("error creating facebook request: %v", err)
		}

		resp, err := client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("error fetching facebook data: %v", err)
		}

		// Handle authentication errors
		if resp.StatusCode == 401 || resp.StatusCode == 403 {
			resp.Body.Close()
			return nil, fmt.Errorf("facebook token expired or invalid permissions")
		}
		if resp.StatusCode != 200 {
			resp.Body.Close()
			return nil, fmt.Errorf("facebook API returned status %d", resp.StatusCode)
		}

		var fbResponse struct {
			Data []struct {
				ID           string `json:"id"`
				Message      string `json:"message"`
				CreatedTime  string `json:"created_time"`
				FullPicture  string `json:"full_picture"`
				PermalinkURL string `json:"permalink_url"`
				Likes        struct {
					Summary struct {
						TotalCount int `json:"total_count"`
					} `json:"summary"`
				} `json:"likes"`
				Comments struct {
					Summary struct {
						TotalCount int `json:"total_count"`
					} `json:"summary"`
				} `json:"comments"`
				Shares struct {
					Count int `json:"count"`
				} `json:"shares"`
			} `json:"data"`
			Paging struct {
				Next string `json:"next"`
			} `json:"paging"`
		}

		if err := json.NewDecoder(resp.Body).Decode(&fbResponse); err != nil {
			resp.Body.Close()
			return nil, fmt.Errorf("error decoding facebook response: %v", err)
		}
		resp.Body.Close()

		// Debug: Log raw response for first page to see what Facebook is returning
		if len(allPosts) == 0 && len(fbResponse.Data) > 0 {
			// Facebook API response received
		}

		// Add posts from this page
		allPosts = append(allPosts, fbResponse.Data...)

		// Check if there's a next page
		nextURL = fbResponse.Paging.Next

		// Safety limit to prevent infinite loops
		if len(allPosts) > 1000 {
			// Reached safety limit
			break
		}
	}

	// Fetched posts

	// Calculate totals from all posts
	var totalPosts, totalLikes, totalComments, totalShares int
	var topPosts []map[string]interface{}

	// Debug: Log first few posts to see comment data
	// Analyzing posts

	for _, post := range allPosts {
		totalPosts++
		totalLikes += post.Likes.Summary.TotalCount
		totalComments += post.Comments.Summary.TotalCount
		totalShares += post.Shares.Count

		// Store top posts (limit to 5)
		if len(topPosts) < 5 {
			engagement := post.Likes.Summary.TotalCount + post.Comments.Summary.TotalCount + post.Shares.Count
			topPosts = append(topPosts, map[string]interface{}{
				"id":           post.ID,
				"content":      post.Message,
				"likes":        post.Likes.Summary.TotalCount,
				"comments":     post.Comments.Summary.TotalCount,
				"shares":       post.Shares.Count,
				"engagement":   engagement,
				"created_at":   post.CreatedTime,
				"platform_url": post.PermalinkURL,
			})
		}
	}

	// Calculated totals

	// If comments are still 0, try a different approach - fetch comments separately for a few posts
	if totalComments == 0 && totalPosts > 0 {
		// No comments found with summary approach

		// Try to fetch comments for the first 3 posts individually
		for i, post := range allPosts {
			if i >= 3 { // Only check first 3 posts to avoid rate limits
				break
			}

			commentsURL := fmt.Sprintf("https://graph.facebook.com/v18.0/%s/comments?summary=true&access_token=%s", post.ID, accessToken)
			// Checking comments for post

			req, err := http.NewRequest("GET", commentsURL, nil)
			if err != nil {
				// Error creating comments request
				continue
			}

			resp, err := client.Do(req)
			if err != nil {
				// Error fetching comments
				continue
			}
			defer resp.Body.Close()

			if resp.StatusCode == 200 {
				var commentsResponse struct {
					Summary struct {
						TotalCount int `json:"total_count"`
					} `json:"summary"`
				}

				if err := json.NewDecoder(resp.Body).Decode(&commentsResponse); err == nil {
					// Post has comments
				}
			} else {
				_, _ = io.ReadAll(resp.Body)
				// Comments API returned error
			}
		}
	}

	// Convert top posts to JSON
	topPostsJSON, _ := json.Marshal(topPosts)

	// Calculate total engagement
	engagement := totalLikes + totalComments + totalShares

	return &models.PostAnalytics{
		UserID:        as.UserID,
		Platform:      as.Platform,
		SnapshotAt:    time.Now(),
		TotalPosts:    totalPosts,
		TotalLikes:    totalLikes,
		TotalComments: totalComments,
		TotalShares:   totalShares,
		TotalViews:    0, // Facebook doesn't provide view counts in this API
		Engagement:    engagement,
		TopPosts:      string(topPostsJSON),
	}, nil
}

// fetchInstagramAnalytics fetches analytics data from Instagram Business API
func (as *AnalyticsSyncer) fetchInstagramAnalytics(accountID, accessToken string) (*models.PostAnalytics, error) {
	// Use proper HTTP client like your working social account syncer
	client := &http.Client{Timeout: 10 * time.Second}

	// For Instagram Business accounts, we need to use Facebook Page access token
	// and Instagram Graph API endpoints, not Instagram Basic Display API

	// First, check if this is an Instagram Business account connected to a Facebook Page
	// We need to find the Facebook Page that has this Instagram Business account
	instagramBusinessID, pageAccessToken, err := as.getInstagramBusinessAccount(accountID, accessToken)
	if err != nil {
		// Error getting Instagram Business account
		return nil, fmt.Errorf("failed to get Instagram Business account: %v", err)
	}

	if instagramBusinessID == "" {
		return nil, fmt.Errorf("no Instagram Business account found for Instagram account %s", accountID)
	}

	// Using Instagram Business Account

	// Fetch ALL Instagram Business posts with pagination
	var allPosts []struct {
		ID            string `json:"id"`
		Caption       string `json:"caption"`
		MediaType     string `json:"media_type"`
		MediaURL      string `json:"media_url"`
		Permalink     string `json:"permalink"`
		Timestamp     string `json:"timestamp"`
		LikeCount     int    `json:"like_count"`
		CommentsCount int    `json:"comments_count"`
	}

	// Start with initial request using Instagram Graph API
	nextURL := fmt.Sprintf("https://graph.facebook.com/v18.0/%s/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&limit=40&access_token=%s", instagramBusinessID, pageAccessToken)

	// Making Instagram API request

	// Fetch all pages of posts
	for nextURL != "" {
		req, err := http.NewRequest("GET", nextURL, nil)
		if err != nil {
			return nil, fmt.Errorf("error creating instagram request: %v", err)
		}

		resp, err := client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("error fetching instagram data: %v", err)
		}
		defer resp.Body.Close()

		// Log response status for debugging
		// Instagram API response status

		if resp.StatusCode == 401 || resp.StatusCode == 403 {
			// Instagram authentication error
			return nil, fmt.Errorf("instagram token expired or invalid permissions")
		}
		if resp.StatusCode != 200 {
			// Instagram API error response
			return nil, fmt.Errorf("instagram API returned status %d", resp.StatusCode)
		}

		var igResponse struct {
			Data []struct {
				ID            string `json:"id"`
				Caption       string `json:"caption"`
				MediaType     string `json:"media_type"`
				MediaURL      string `json:"media_url"`
				Permalink     string `json:"permalink"`
				Timestamp     string `json:"timestamp"`
				LikeCount     int    `json:"like_count"`
				CommentsCount int    `json:"comments_count"`
			} `json:"data"`
			Paging struct {
				Next string `json:"next"`
			} `json:"paging"`
		}

		if err := json.NewDecoder(resp.Body).Decode(&igResponse); err != nil {
			return nil, fmt.Errorf("error decoding instagram response: %v", err)
		}

		// Add posts from this page
		allPosts = append(allPosts, igResponse.Data...)

		// Check for next page
		nextURL = igResponse.Paging.Next

		// Safety limit to prevent infinite loops
		if len(allPosts) > 2000 {
			// Reached safety limit
			break
		}
	}

	// Fetched posts

	// Calculate totals from all posts
	var totalPosts, totalLikes, totalComments int
	var topPosts []map[string]interface{}

	// Debug: Log first few posts to see data
	log.Printf("Instagram analytics: Analyzing %d posts for user %s", len(allPosts), as.UserID)
	for i, post := range allPosts {
		if i < 3 { // Log first 3 posts for debugging
			log.Printf("Instagram post %d: ID=%s, Likes=%d, Comments=%d",
				i+1, post.ID, post.LikeCount, post.CommentsCount)
		}

		totalPosts++
		totalLikes += post.LikeCount
		totalComments += post.CommentsCount

		// Store top posts (limit to 5)
		if len(topPosts) < 5 {
			engagement := post.LikeCount + post.CommentsCount
			topPosts = append(topPosts, map[string]interface{}{
				"id":         post.ID,
				"content":    post.Caption,
				"likes":      post.LikeCount,
				"comments":   post.CommentsCount,
				"shares":     0, // Instagram doesn't provide share counts in basic API
				"views":      0, // Instagram doesn't provide view counts in basic API
				"engagement": engagement,
				"created_at": post.Timestamp,
			})
		}
	}

	// Calculated totals

	// Convert top posts to JSON
	topPostsJSON, _ := json.Marshal(topPosts)

	// Calculate total engagement
	engagement := totalLikes + totalComments

	return &models.PostAnalytics{
		UserID:        as.UserID,
		Platform:      as.Platform,
		SnapshotAt:    time.Now(),
		TotalPosts:    totalPosts,
		TotalLikes:    totalLikes,
		TotalComments: totalComments,
		TotalShares:   0, // Instagram doesn't provide share counts in basic API
		TotalViews:    0, // Instagram doesn't provide view counts in basic API
		Engagement:    engagement,
		TopPosts:      string(topPostsJSON),
	}, nil
}

// getInstagramBusinessAccount finds the Instagram Business account connected to a Facebook Page
func (as *AnalyticsSyncer) getInstagramBusinessAccount(instagramAccountID, instagramAccessToken string) (string, string, error) {
	// We need to find which Facebook Page has this Instagram Business account
	// Since we can't directly query from Instagram account to Facebook Page,
	// we'll check all Facebook Pages for this user to find the one with this Instagram Business account

	// Get all Facebook accounts for this user
	query := `
		SELECT id, social_id, access_token 
		FROM social_accounts 
		WHERE user_id = $1 AND platform = 'facebook'
	`

	rows, err := lib.DB.Query(query, as.UserID)
	if err != nil {
		return "", "", fmt.Errorf("failed to query Facebook accounts: %v", err)
	}
	defer rows.Close()

	client := &http.Client{Timeout: 10 * time.Second}

	for rows.Next() {
		var fbAccountID, fbPageID, fbAccessToken string
		err := rows.Scan(&fbAccountID, &fbPageID, &fbAccessToken)
		if err != nil {
			// Error scanning Facebook account
			continue
		}

		// Check if this Facebook Page has the Instagram Business account we're looking for
		url := fmt.Sprintf("https://graph.facebook.com/v18.0/%s?fields=instagram_business_account&access_token=%s", fbPageID, fbAccessToken)

		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			// Error creating Facebook Page request
			continue
		}

		resp, err := client.Do(req)
		if err != nil {
			// Error checking Facebook Page
			continue
		}
		defer resp.Body.Close()

		if resp.StatusCode == 200 {
			var response struct {
				InstagramBusinessAccount struct {
					ID string `json:"id"`
				} `json:"instagram_business_account"`
			}

			if err := json.NewDecoder(resp.Body).Decode(&response); err == nil {
				if response.InstagramBusinessAccount.ID == instagramAccountID {
					// Found Instagram Business account
					return instagramAccountID, fbAccessToken, nil
				}
			}
		}
	}

	return "", "", fmt.Errorf("no Facebook Page found with Instagram Business account %s", instagramAccountID)
}

// fetchTwitterAnalytics fetches analytics data from Twitter API
func (as *AnalyticsSyncer) fetchTwitterAnalytics(accountID, accessToken string) (*models.PostAnalytics, error) {
	// Use proper HTTP client
	client := &http.Client{Timeout: 10 * time.Second}

	// Get user's tweets from Twitter API v2
	url := fmt.Sprintf("https://api.twitter.com/2/users/%s/tweets?tweet.fields=public_metrics,created_at&max_results=100", accountID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating twitter request: %v", err)
	}
	req.Header.Add("Authorization", "Bearer "+accessToken)

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error fetching twitter data: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("twitter API returned status %d", resp.StatusCode)
	}

	var twitterResponse struct {
		Data []struct {
			ID            string `json:"id"`
			Text          string `json:"text"`
			CreatedAt     string `json:"created_at"`
			PublicMetrics struct {
				RetweetCount int `json:"retweet_count"`
				LikeCount    int `json:"like_count"`
				ReplyCount   int `json:"reply_count"`
				QuoteCount   int `json:"quote_count"`
			} `json:"public_metrics"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&twitterResponse); err != nil {
		return nil, fmt.Errorf("error decoding twitter response: %v", err)
	}

	// Calculate totals from real data
	var totalPosts, totalLikes, totalComments, totalShares int
	var topPosts []map[string]interface{}

	for _, tweet := range twitterResponse.Data {
		totalPosts++
		totalLikes += tweet.PublicMetrics.LikeCount
		totalComments += tweet.PublicMetrics.ReplyCount
		totalShares += tweet.PublicMetrics.RetweetCount + tweet.PublicMetrics.QuoteCount

		// Store top posts (limit to 5)
		if len(topPosts) < 5 {
			engagement := tweet.PublicMetrics.LikeCount + tweet.PublicMetrics.ReplyCount + tweet.PublicMetrics.RetweetCount + tweet.PublicMetrics.QuoteCount
			topPosts = append(topPosts, map[string]interface{}{
				"id":         tweet.ID,
				"content":    tweet.Text,
				"likes":      tweet.PublicMetrics.LikeCount,
				"comments":   tweet.PublicMetrics.ReplyCount,
				"shares":     tweet.PublicMetrics.RetweetCount + tweet.PublicMetrics.QuoteCount,
				"engagement": engagement,
				"created_at": tweet.CreatedAt,
			})
		}
	}

	// Convert top posts to JSON
	topPostsJSON, _ := json.Marshal(topPosts)

	// Calculate total engagement
	engagement := totalLikes + totalComments + totalShares

	return &models.PostAnalytics{
		UserID:        as.UserID,
		Platform:      as.Platform,
		SnapshotAt:    time.Now(),
		TotalPosts:    totalPosts,
		TotalLikes:    totalLikes,
		TotalComments: totalComments,
		TotalShares:   totalShares,
		TotalViews:    0, // Twitter doesn't provide view counts in basic API
		Engagement:    engagement,
		TopPosts:      string(topPostsJSON),
	}, nil
}

// fetchYouTubeAnalytics fetches analytics data from YouTube API
func (as *AnalyticsSyncer) fetchYouTubeAnalytics(_, accessToken string) (*models.PostAnalytics, error) {
	// Use the same pattern as your working YouTube code
	client := &http.Client{Timeout: 30 * time.Second}

	// Step 1: Get the user's channel ID (like your working code)
	channelsURL := "https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true"
	req, err := http.NewRequest("GET", channelsURL, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating youtube request: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	// Making YouTube API request

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error fetching youtube channel info: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 401 {
		// Try to refresh the token
		// YouTube token expired, attempting refresh
		_, _ = io.ReadAll(resp.Body)
		// YouTube API returned error

		// Get refresh token from database
		var refreshToken string
		refreshQuery := `SELECT refresh_token FROM social_accounts WHERE user_id = $1 AND platform = 'youtube'`
		err := lib.DB.QueryRow(refreshQuery, as.UserID).Scan(&refreshToken)
		if err != nil {
			return nil, fmt.Errorf("no refresh token found for youtube: %v", err)
		}

		// Try to refresh the token
		newAccessToken, err := as.refreshYouTubeToken(refreshToken)
		if err != nil {
			return nil, fmt.Errorf("failed to refresh youtube token: %v", err)
		}

		// Update the access token in database
		updateQuery := `UPDATE social_accounts SET access_token = $1 WHERE user_id = $2 AND platform = 'youtube'`
		_, err = lib.DB.Exec(updateQuery, newAccessToken, as.UserID)
		if err != nil {
			// Failed to update YouTube token
		}

		// Retry the request with new token
		req.Header.Set("Authorization", "Bearer "+newAccessToken)
		resp, err = client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("error retrying youtube request: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != 200 {
			return nil, fmt.Errorf("youtube API still returned status %d after refresh", resp.StatusCode)
		}
	} else if resp.StatusCode != 200 {
		return nil, fmt.Errorf("youtube API returned status %d for channel info", resp.StatusCode)
	}

	// YouTube API channel request successful

	var channelsResp struct {
		Items []struct {
			ID      string `json:"id"`
			Snippet struct {
				Title       string                 `json:"title"`
				Description string                 `json:"description"`
				Thumbnails  map[string]interface{} `json:"thumbnails"`
			} `json:"snippet"`
		} `json:"items"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&channelsResp); err != nil {
		return nil, fmt.Errorf("error decoding youtube channel response: %v", err)
	}

	if len(channelsResp.Items) == 0 {
		return nil, fmt.Errorf("no youtube channel found")
	}
	channelID := channelsResp.Items[0].ID
	// Found YouTube channel

	// Step 2: Get the user's uploads playlist (like your working code)
	playlistURL := fmt.Sprintf("https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=%s", channelID)
	req2, err := http.NewRequest("GET", playlistURL, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating youtube playlist request: %v", err)
	}
	req2.Header.Set("Authorization", "Bearer "+accessToken)

	resp2, err := client.Do(req2)
	if err != nil {
		return nil, fmt.Errorf("error fetching youtube playlist info: %v", err)
	}
	defer resp2.Body.Close()

	if resp2.StatusCode != 200 {
		return nil, fmt.Errorf("youtube API returned status %d for playlist info", resp2.StatusCode)
	}

	var playlistResp struct {
		Items []struct {
			ContentDetails struct {
				RelatedPlaylists struct {
					Uploads string `json:"uploads"`
				} `json:"relatedPlaylists"`
			} `json:"contentDetails"`
		} `json:"items"`
	}

	if err := json.NewDecoder(resp2.Body).Decode(&playlistResp); err != nil {
		// Error decoding YouTube playlist response
		return nil, fmt.Errorf("YouTube API error")
	}

	if len(playlistResp.Items) == 0 {
		// No uploads playlist found
		return nil, fmt.Errorf("YouTube API error")
	}
	uploadsPlaylistID := playlistResp.Items[0].ContentDetails.RelatedPlaylists.Uploads
	// Found uploads playlist

	// Step 3: Get videos from uploads playlist (like your working code)
	videosURL := fmt.Sprintf("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=%s", uploadsPlaylistID)
	req3, err := http.NewRequest("GET", videosURL, nil)
	if err != nil {
		// Error creating YouTube videos request
		return nil, fmt.Errorf("YouTube API error")
	}
	req3.Header.Set("Authorization", "Bearer "+accessToken)

	resp3, err := client.Do(req3)
	if err != nil {
		// Error fetching YouTube videos
		return nil, fmt.Errorf("YouTube API error")
	}
	defer resp3.Body.Close()

	if resp3.StatusCode != 200 {
		// YouTube API returned error
		return nil, fmt.Errorf("YouTube API error")
	}

	var videosResponse struct {
		Items []struct {
			Snippet struct {
				ResourceID struct {
					VideoID string `json:"videoId"`
				} `json:"resourceId"`
				Title       string `json:"title"`
				Description string `json:"description"`
				PublishedAt string `json:"publishedAt"`
			} `json:"snippet"`
		} `json:"items"`
	}

	if err := json.NewDecoder(resp3.Body).Decode(&videosResponse); err != nil {
		// Error decoding YouTube videos response
		return nil, fmt.Errorf("YouTube API error")
	}

	// Found YouTube videos

	// Step 4: Get video statistics for all videos (like your working code)
	videoIDs := []string{}
	for _, item := range videosResponse.Items {
		videoIDs = append(videoIDs, item.Snippet.ResourceID.VideoID)
	}

	if len(videoIDs) == 0 {
		// No videos found
		return nil, fmt.Errorf("YouTube API error")
	}

	// Getting statistics for videos

	// Get stats for all videos at once (like your working code)
	statsURL := fmt.Sprintf("https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=%s", strings.Join(videoIDs, ","))
	req4, err := http.NewRequest("GET", statsURL, nil)
	if err != nil {
		// Error creating YouTube stats request
		return nil, fmt.Errorf("YouTube API error")
	}
	req4.Header.Set("Authorization", "Bearer "+accessToken)

	statsResp, err := client.Do(req4)
	if err != nil {
		// Error fetching YouTube video stats
		return nil, fmt.Errorf("YouTube API error")
	}
	defer statsResp.Body.Close()

	if statsResp.StatusCode != 200 {
		// YouTube API returned error
		return nil, fmt.Errorf("YouTube API error")
	}

	var statsResponse struct {
		Items []struct {
			ID      string `json:"id"`
			Snippet struct {
				Title       string `json:"title"`
				Description string `json:"description"`
				PublishedAt string `json:"publishedAt"`
			} `json:"snippet"`
			Statistics struct {
				ViewCount    string `json:"viewCount"`
				LikeCount    string `json:"likeCount"`
				CommentCount string `json:"commentCount"`
			} `json:"statistics"`
		} `json:"items"`
	}

	if err := json.NewDecoder(statsResp.Body).Decode(&statsResponse); err != nil {
		// Error decoding YouTube video stats
		return nil, fmt.Errorf("YouTube API error")
	}

	// Successfully fetched statistics

	// Calculate totals from real data
	var totalPosts, totalLikes, totalComments, totalViews int
	var topPosts []map[string]interface{}

	for _, video := range statsResponse.Items {
		totalPosts++

		// Parse counts
		views := 0
		likes := 0
		comments := 0

		if video.Statistics.ViewCount != "" {
			fmt.Sscanf(video.Statistics.ViewCount, "%d", &views)
		}
		if video.Statistics.LikeCount != "" {
			fmt.Sscanf(video.Statistics.LikeCount, "%d", &likes)
		}
		if video.Statistics.CommentCount != "" {
			fmt.Sscanf(video.Statistics.CommentCount, "%d", &comments)
		}

		totalViews += views
		totalLikes += likes
		totalComments += comments

		// Store top posts (limit to 5)
		if len(topPosts) < 5 {
			engagement := likes + comments
			topPosts = append(topPosts, map[string]interface{}{
				"id":         video.ID,
				"content":    video.Snippet.Title,
				"likes":      likes,
				"comments":   comments,
				"shares":     0, // YouTube doesn't provide share counts in basic API
				"views":      views,
				"engagement": engagement,
				"created_at": video.Snippet.PublishedAt,
			})
		}
	}

	// Convert top posts to JSON
	topPostsJSON, _ := json.Marshal(topPosts)

	// Calculate total engagement
	engagement := totalLikes + totalComments

	return &models.PostAnalytics{
		UserID:        as.UserID,
		Platform:      as.Platform,
		SnapshotAt:    time.Now(),
		TotalPosts:    totalPosts,
		TotalLikes:    totalLikes,
		TotalComments: totalComments,
		TotalShares:   0, // YouTube doesn't provide share counts in basic API
		TotalViews:    totalViews,
		Engagement:    engagement,
		TopPosts:      string(topPostsJSON),
	}, nil
}

// fetchTelegramAnalytics fetches analytics data from Telegram API
func (as *AnalyticsSyncer) fetchTelegramAnalytics(accountID, accessToken string) (*models.PostAnalytics, error) {
	// Use proper HTTP client
	client := &http.Client{Timeout: 10 * time.Second}

	// Get recent updates from the bot
	url := fmt.Sprintf("https://api.telegram.org/bot%s/getUpdates?limit=100", accessToken)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating Telegram request: %v", err)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error fetching Telegram data: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("telegram API returned status %d", resp.StatusCode)
	}

	var telegramResponse struct {
		OK     bool `json:"ok"`
		Result []struct {
			UpdateID int `json:"update_id"`
			Message  struct {
				MessageID int `json:"message_id"`
				From      struct {
					ID        int64  `json:"id"`
					IsBot     bool   `json:"is_bot"`
					FirstName string `json:"first_name"`
					Username  string `json:"username"`
				} `json:"from"`
				Chat struct {
					ID       int64  `json:"id"`
					Type     string `json:"type"`
					Title    string `json:"title"`
					Username string `json:"username"`
				} `json:"chat"`
				Date     int64  `json:"date"`
				Text     string `json:"text"`
				Views    int    `json:"views"`
				Forwards int    `json:"forwards"`
			} `json:"message"`
		} `json:"result"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&telegramResponse); err != nil {
		return nil, fmt.Errorf("error decoding Telegram response: %v", err)
	}

	if !telegramResponse.OK {
		return nil, fmt.Errorf("telegram API error")
	}

	// Filter messages from the connected channel
	var totalPosts, totalViews, totalForwards int
	var topPosts []map[string]interface{}

	for _, update := range telegramResponse.Result {
		if update.Message.MessageID == 0 {
			continue
		}

		// Only include messages from the specified chat
		if fmt.Sprintf("%d", update.Message.Chat.ID) != accountID && update.Message.Chat.Username != accountID {
			continue
		}

		totalPosts++
		totalViews += update.Message.Views
		totalForwards += update.Message.Forwards

		// Store top posts (limit to 5)
		if len(topPosts) < 5 {
			engagement := update.Message.Views + update.Message.Forwards
			topPosts = append(topPosts, map[string]interface{}{
				"id":         update.Message.MessageID,
				"content":    update.Message.Text,
				"likes":      0, // Telegram doesn't have likes in basic API
				"comments":   0, // Telegram doesn't have comments in basic API
				"shares":     update.Message.Forwards,
				"views":      update.Message.Views,
				"engagement": engagement,
				"created_at": time.Unix(update.Message.Date, 0).Format(time.RFC3339),
			})
		}
	}

	// Convert top posts to JSON
	topPostsJSON, _ := json.Marshal(topPosts)

	// Calculate total engagement
	engagement := totalViews + totalForwards

	return &models.PostAnalytics{
		UserID:        as.UserID,
		Platform:      as.Platform,
		SnapshotAt:    time.Now(),
		TotalPosts:    totalPosts,
		TotalLikes:    0, // Telegram doesn't have likes in basic API
		TotalComments: 0, // Telegram doesn't have comments in basic API
		TotalShares:   totalForwards,
		TotalViews:    totalViews,
		Engagement:    engagement,
		TopPosts:      string(topPostsJSON),
	}, nil
}

// storeAnalytics stores analytics data in the database
func (as *AnalyticsSyncer) storeAnalytics(analytics *models.PostAnalytics) error {
	// First, ensure the table exists
	if err := as.ensureAnalyticsTable(); err != nil {
		return fmt.Errorf("failed to ensure analytics table exists: %v", err)
	}

	// Check if we already have recent data for this user/platform/account (within 2 hours to be more conservative)
	var existingID int
	var existingPosts int
	query := `
		SELECT id, total_posts FROM post_analytics 
		WHERE user_id = $1 AND platform = $2 AND account_id = $3
		AND snapshot_at > NOW() - INTERVAL '2 hours'
		ORDER BY snapshot_at DESC LIMIT 1
	`
	err := lib.DB.QueryRow(query, analytics.UserID, analytics.Platform, analytics.AccountID).Scan(&existingID, &existingPosts)
	if err == nil {
		// Update existing record
		// Updating existing analytics record

		updateQuery := `
			UPDATE post_analytics 
			SET total_posts = $2, total_likes = $3, total_comments = $4, 
			    total_shares = $5, total_views = $6, engagement = $7, 
			    top_posts = $8, snapshot_at = $9
			WHERE id = $1
		`
		_, err = lib.DB.Exec(updateQuery, existingID, analytics.TotalPosts,
			analytics.TotalLikes, analytics.TotalComments, analytics.TotalShares,
			analytics.TotalViews, analytics.Engagement, analytics.TopPosts, analytics.SnapshotAt)
		return err
	}

	// Insert new record
	// Creating new analytics record

	insertQuery := `
		INSERT INTO post_analytics (user_id, platform, account_id, total_posts, total_likes, 
			total_comments, total_shares, total_views, engagement, top_posts, snapshot_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`
	_, err = lib.DB.Exec(insertQuery, analytics.UserID, analytics.Platform, analytics.AccountID,
		analytics.TotalPosts, analytics.TotalLikes, analytics.TotalComments,
		analytics.TotalShares, analytics.TotalViews, analytics.Engagement,
		analytics.TopPosts, analytics.SnapshotAt)
	return err
}

// ensureAnalyticsTable creates the post_analytics table if it doesn't exist
func (as *AnalyticsSyncer) ensureAnalyticsTable() error {
	// First, check if the table exists and what columns it has
	var tableExists bool
	err := lib.DB.QueryRow(`
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_schema = 'public' 
			AND table_name = 'post_analytics'
		)
	`).Scan(&tableExists)

	if err != nil {
		return fmt.Errorf("failed to check if post_analytics table exists: %v", err)
	}

	if !tableExists {
		// Create the table with correct schema
		createTableSQL := `
			CREATE TABLE post_analytics (
				id SERIAL PRIMARY KEY,
				user_id UUID NOT NULL,
				platform TEXT NOT NULL,
				snapshot_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
				total_posts INTEGER DEFAULT 0,
				total_likes INTEGER DEFAULT 0,
				total_comments INTEGER DEFAULT 0,
				total_shares INTEGER DEFAULT 0,
				total_views INTEGER DEFAULT 0,
				engagement INTEGER DEFAULT 0,
				top_posts JSONB DEFAULT '[]'::jsonb,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
				updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
			)
		`

		_, err = lib.DB.Exec(createTableSQL)
		if err != nil {
			return fmt.Errorf("failed to create post_analytics table: %v", err)
		}
		// Created post_analytics table
	} else {
		// Check if the table has the correct columns
		var hasCorrectColumns bool
		err = lib.DB.QueryRow(`
			SELECT EXISTS (
				SELECT 1 FROM information_schema.columns 
				WHERE table_name = 'post_analytics' 
				AND column_name = 'total_posts'
			)
		`).Scan(&hasCorrectColumns)

		if err != nil {
			return fmt.Errorf("failed to check table columns: %v", err)
		}

		if !hasCorrectColumns {
			// Drop and recreate the table with correct schema
			// Dropping and recreating table
			_, err = lib.DB.Exec("DROP TABLE IF EXISTS post_analytics CASCADE")
			if err != nil {
				return fmt.Errorf("failed to drop post_analytics table: %v", err)
			}

			createTableSQL := `
				CREATE TABLE post_analytics (
					id SERIAL PRIMARY KEY,
					user_id UUID NOT NULL,
					platform TEXT NOT NULL,
					snapshot_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
					total_posts INTEGER DEFAULT 0,
					total_likes INTEGER DEFAULT 0,
					total_comments INTEGER DEFAULT 0,
					total_shares INTEGER DEFAULT 0,
					total_views INTEGER DEFAULT 0,
					engagement INTEGER DEFAULT 0,
					top_posts JSONB DEFAULT '[]'::jsonb,
					created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
					updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
				)
			`

			_, err = lib.DB.Exec(createTableSQL)
			if err != nil {
				return fmt.Errorf("failed to recreate post_analytics table: %v", err)
			}
			// Recreated table
		}
	}

	// Create indexes
	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_post_analytics_user_id ON post_analytics(user_id)",
		"CREATE INDEX IF NOT EXISTS idx_post_analytics_platform ON post_analytics(platform)",
		"CREATE INDEX IF NOT EXISTS idx_post_analytics_snapshot_at ON post_analytics(snapshot_at)",
		"CREATE INDEX IF NOT EXISTS idx_post_analytics_user_platform ON post_analytics(user_id, platform)",
		"CREATE INDEX IF NOT EXISTS idx_post_analytics_user_snapshot ON post_analytics(user_id, snapshot_at)",
	}

	for _, indexSQL := range indexes {
		if _, err := lib.DB.Exec(indexSQL); err != nil {
			// Warning: Failed to create index
		}
	}

	return nil
}

// SyncAllUserAnalytics syncs analytics for all platforms for a specific user
func SyncAllUserAnalytics(userID uuid.UUID) error {
	// Starting analytics sync for all platforms

	// First, let's check if there are ANY social accounts for this user
	checkQuery := `SELECT COUNT(*) FROM social_accounts WHERE user_id = $1`
	var totalAccounts int
	err := lib.DB.QueryRow(checkQuery, userID).Scan(&totalAccounts)
	if err != nil {
		// Error checking social accounts count
		return fmt.Errorf("error checking social accounts: %v", err)
	}
	// Total social accounts

	if totalAccounts == 0 {
		// No social accounts found
		return nil
	}

	// Get all connected platforms for the user
	query := `SELECT DISTINCT platform FROM social_accounts WHERE user_id = $1`
	rows, err := lib.DB.Query(query, userID)
	if err != nil {
		return fmt.Errorf("error fetching user platforms: %v", err)
	}
	defer rows.Close()

	var platforms []string
	for rows.Next() {
		var platform string
		if err := rows.Scan(&platform); err != nil {
			continue
		}
		platforms = append(platforms, platform)
	}

	// Found connected platforms

	// Sync each platform
	var syncErrors []string
	for _, platform := range platforms {
		// Syncing analytics for platform
		syncer := NewAnalyticsSyncer(userID, platform)
		if err := syncer.SyncAnalytics(); err != nil {
			// Error syncing analytics
			syncErrors = append(syncErrors, fmt.Sprintf("%s: %v", platform, err))
			// Continue with other platforms even if one fails
		}
	}

	// If all platforms failed, return an error
	if len(syncErrors) == len(platforms) {
		return fmt.Errorf("failed to sync analytics for all platforms: %s", strings.Join(syncErrors, "; "))
	}

	// If some platforms failed, log warnings but don't fail completely
	if len(syncErrors) > 0 {
		// Some platforms failed to sync
	}

	// Completed analytics sync

	return nil
}

// getYouTubeOAuthConfig returns the YouTube OAuth configuration
func (as *AnalyticsSyncer) getYouTubeOAuthConfig() *oauth2.Config {
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

// refreshYouTubeToken refreshes an expired YouTube access token
func (as *AnalyticsSyncer) refreshYouTubeToken(refreshToken string) (string, error) {
	config := as.getYouTubeOAuthConfig()
	token := &oauth2.Token{RefreshToken: refreshToken}
	tokenSource := config.TokenSource(context.Background(), token)
	newToken, err := tokenSource.Token()
	if err != nil {
		return "", err
	}
	return newToken.AccessToken, nil
}
