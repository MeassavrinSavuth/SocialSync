package utils

import (
	"context"
	"database/sql"
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
	log.Printf("Starting analytics sync for user %s on platform %s", as.UserID, as.Platform)

	// Temporarily skip Twitter analytics to avoid hitting rate limits.
	// TODO: Re-enable Twitter sync with a proper rate-limit/backoff strategy or queued worker.
	if as.Platform == "twitter" {
		log.Printf("Skipping twitter analytics sync for user %s to avoid API rate limits", as.UserID)
		return nil
	}

	// Get social account info for the user and platform
	var accountID, accessToken string
	query := `
		SELECT social_id, access_token 
		FROM social_accounts 
		WHERE user_id = $1 AND platform = $2
	`
	err := lib.DB.QueryRow(query, as.UserID, as.Platform).Scan(&accountID, &accessToken)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("No social account found for user %s on platform %s", as.UserID, as.Platform)
			return nil
		}
		return fmt.Errorf("error fetching social account: %v", err)
	}

	log.Printf("Found social account for user %s on platform %s: %s", as.UserID, as.Platform, accountID)

	// Fetch platform-specific data
	var analytics *models.PostAnalytics
	switch as.Platform {
	case "mastodon":
		analytics, err = as.fetchMastodonAnalytics(accountID, accessToken)
	case "facebook":
		analytics, err = as.fetchFacebookAnalytics(accountID, accessToken)
	case "instagram":
		analytics, err = as.fetchInstagramAnalytics(accountID, accessToken)
	case "twitter":
		analytics, err = as.fetchTwitterAnalytics(accountID, accessToken)
	case "youtube":
		analytics, err = as.fetchYouTubeAnalytics(accountID, accessToken)
	case "telegram":
		analytics, err = as.fetchTelegramAnalytics(accountID, accessToken)
	default:
		return fmt.Errorf("unsupported platform: %s", as.Platform)
	}

	if err != nil {
		log.Printf("Error fetching %s analytics for user %s: %v", as.Platform, as.UserID, err)
		// Return the error instead of falling back to mock data
		return fmt.Errorf("failed to fetch %s analytics: %v", as.Platform, err)
	}

	// Store analytics data
	log.Printf("Storing analytics data for user %s on platform %s: %d posts, %d likes, %d comments",
		as.UserID, as.Platform, analytics.TotalPosts, analytics.TotalLikes, analytics.TotalComments)

	err = as.storeAnalytics(analytics)
	if err != nil {
		log.Printf("Error storing analytics: %v", err)
		return fmt.Errorf("failed to store analytics data: %v", err)
	}

	log.Printf("Successfully stored analytics data for user %s on platform %s", as.UserID, as.Platform)
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
	url := fmt.Sprintf("https://%s/api/v1/accounts/%s/statuses?limit=40", domain, userID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating mastodon request: %v", err)
	}
	req.Header.Add("Authorization", "Bearer "+accessToken)

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error fetching mastodon data: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("mastodon API returned status %d: %s", resp.StatusCode, string(body))
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

	// Calculate totals from real data
	var totalPosts, totalLikes, totalComments, totalShares int
	var topPosts []map[string]interface{}

	for _, post := range mastodonResponse {
		totalPosts++
		totalLikes += post.FavouritesCount
		totalComments += post.RepliesCount
		totalShares += post.ReblogsCount

		// Store top posts (limit to 5)
		if len(topPosts) < 5 {
			engagement := post.FavouritesCount + post.RepliesCount + post.ReblogsCount
			topPosts = append(topPosts, map[string]interface{}{
				"id":         post.ID,
				"content":    post.Content,
				"likes":      post.FavouritesCount,
				"comments":   post.RepliesCount,
				"shares":     post.ReblogsCount,
				"engagement": engagement,
				"created_at": post.CreatedAt,
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
		TotalViews:    0, // Mastodon doesn't provide view counts in basic API
		Engagement:    engagement,
		TopPosts:      string(topPostsJSON),
	}, nil
}

// fetchFacebookAnalytics fetches analytics data from Facebook API
func (as *AnalyticsSyncer) fetchFacebookAnalytics(accountID, accessToken string) (*models.PostAnalytics, error) {
	// Use proper HTTP client like your working social account syncer
	client := &http.Client{Timeout: 10 * time.Second}
	url := fmt.Sprintf("https://graph.facebook.com/v18.0/%s/posts?fields=id,message,created_time,likes.summary(true),comments.summary(true),shares&limit=40", accountID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating facebook request: %v", err)
	}
	req.Header.Add("Authorization", "Bearer "+accessToken)

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error fetching facebook data: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("facebook API returned status %d: %s", resp.StatusCode, string(body))
	}

	var fbResponse struct {
		Data []struct {
			ID          string `json:"id"`
			Message     string `json:"message"`
			CreatedTime string `json:"created_time"`
			Likes       struct {
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
	}

	if err := json.NewDecoder(resp.Body).Decode(&fbResponse); err != nil {
		return nil, fmt.Errorf("error decoding facebook response: %v", err)
	}

	// Calculate totals from real data
	var totalPosts, totalLikes, totalComments, totalShares int
	var topPosts []map[string]interface{}

	for _, post := range fbResponse.Data {
		totalPosts++
		totalLikes += post.Likes.Summary.TotalCount
		totalComments += post.Comments.Summary.TotalCount
		totalShares += post.Shares.Count

		// Store top posts (limit to 5)
		if len(topPosts) < 5 {
			engagement := post.Likes.Summary.TotalCount + post.Comments.Summary.TotalCount + post.Shares.Count
			topPosts = append(topPosts, map[string]interface{}{
				"id":         post.ID,
				"content":    post.Message,
				"likes":      post.Likes.Summary.TotalCount,
				"comments":   post.Comments.Summary.TotalCount,
				"shares":     post.Shares.Count,
				"engagement": engagement,
				"created_at": post.CreatedTime,
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
		TotalViews:    0, // Facebook doesn't provide view counts in this API
		Engagement:    engagement,
		TopPosts:      string(topPostsJSON),
	}, nil
}

// fetchInstagramAnalytics fetches analytics data from Instagram API
func (as *AnalyticsSyncer) fetchInstagramAnalytics(accountID, accessToken string) (*models.PostAnalytics, error) {
	// Use proper HTTP client like your working social account syncer
	client := &http.Client{Timeout: 10 * time.Second}
	url := fmt.Sprintf("https://graph.instagram.com/%s/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&limit=40", accountID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating instagram request: %v", err)
	}
	req.Header.Add("Authorization", "Bearer "+accessToken)

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error fetching instagram data: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("instagram API returned status %d: %s", resp.StatusCode, string(body))
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
	}

	if err := json.NewDecoder(resp.Body).Decode(&igResponse); err != nil {
		return nil, fmt.Errorf("error decoding instagram response: %v", err)
	}

	// Calculate totals from real data
	var totalPosts, totalLikes, totalComments int
	var topPosts []map[string]interface{}

	for _, post := range igResponse.Data {
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

// fetchTwitterAnalytics fetches analytics data from Twitter API
func (as *AnalyticsSyncer) fetchTwitterAnalytics(accountID, accessToken string) (*models.PostAnalytics, error) {
	// Use proper HTTP client
	client := &http.Client{Timeout: 10 * time.Second}

	// Get user's tweets from Twitter API v2
	url := fmt.Sprintf("https://api.twitter.com/2/users/%s/tweets?tweet.fields=public_metrics,created_at&max_results=40", accountID)

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
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("twitter API returned status %d: %s", resp.StatusCode, string(body))
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

	log.Printf("Making YouTube API request to: %s", channelsURL)

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error fetching youtube channel info: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 401 {
		// Try to refresh the token
		log.Printf("YouTube token expired, attempting refresh...")
		body, _ := io.ReadAll(resp.Body)
		log.Printf("YouTube API returned status %d for channel info: %s", resp.StatusCode, string(body))

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
			log.Printf("Failed to update YouTube token: %v", err)
		}

		// Retry the request with new token
		req.Header.Set("Authorization", "Bearer "+newAccessToken)
		resp, err = client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("error retrying youtube request: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != 200 {
			body, _ := io.ReadAll(resp.Body)
			return nil, fmt.Errorf("youtube API still returned status %d after refresh: %s", resp.StatusCode, string(body))
		}
	} else if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("youtube API returned status %d for channel info: %s", resp.StatusCode, string(body))
	}

	log.Printf("YouTube API channel request successful, status: %d", resp.StatusCode)

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
	log.Printf("Found YouTube channel: %s", channelID)

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
		body, _ := io.ReadAll(resp2.Body)
		return nil, fmt.Errorf("youtube API returned status %d for playlist info: %s", resp2.StatusCode, string(body))
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
		log.Printf("Error decoding YouTube playlist response: %v", err)
		return nil, fmt.Errorf("YouTube API error")
	}

	if len(playlistResp.Items) == 0 {
		log.Printf("No uploads playlist found")
		return nil, fmt.Errorf("YouTube API error")
	}
	uploadsPlaylistID := playlistResp.Items[0].ContentDetails.RelatedPlaylists.Uploads
	log.Printf("Found uploads playlist: %s", uploadsPlaylistID)

	// Step 3: Get videos from uploads playlist (like your working code)
	videosURL := fmt.Sprintf("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=20&playlistId=%s", uploadsPlaylistID)
	req3, err := http.NewRequest("GET", videosURL, nil)
	if err != nil {
		log.Printf("Error creating YouTube videos request: %v", err)
		return nil, fmt.Errorf("YouTube API error")
	}
	req3.Header.Set("Authorization", "Bearer "+accessToken)

	resp3, err := client.Do(req3)
	if err != nil {
		log.Printf("Error fetching YouTube videos: %v", err)
		return nil, fmt.Errorf("YouTube API error")
	}
	defer resp3.Body.Close()

	if resp3.StatusCode != 200 {
		body, _ := io.ReadAll(resp3.Body)
		log.Printf("YouTube API returned status %d for videos: %s", resp3.StatusCode, string(body))
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
		log.Printf("Error decoding YouTube videos response: %v", err)
		return nil, fmt.Errorf("YouTube API error")
	}

	log.Printf("Found %d YouTube videos", len(videosResponse.Items))

	// Step 4: Get video statistics for all videos (like your working code)
	videoIDs := []string{}
	for _, item := range videosResponse.Items {
		videoIDs = append(videoIDs, item.Snippet.ResourceID.VideoID)
	}

	if len(videoIDs) == 0 {
		log.Printf("No videos found")
		return nil, fmt.Errorf("YouTube API error")
	}

	log.Printf("Getting statistics for %d videos", len(videoIDs))

	// Get stats for all videos at once (like your working code)
	statsURL := fmt.Sprintf("https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=%s", strings.Join(videoIDs, ","))
	req4, err := http.NewRequest("GET", statsURL, nil)
	if err != nil {
		log.Printf("Error creating YouTube stats request: %v", err)
		return nil, fmt.Errorf("YouTube API error")
	}
	req4.Header.Set("Authorization", "Bearer "+accessToken)

	statsResp, err := client.Do(req4)
	if err != nil {
		log.Printf("Error fetching YouTube video stats: %v", err)
		return nil, fmt.Errorf("YouTube API error")
	}
	defer statsResp.Body.Close()

	if statsResp.StatusCode != 200 {
		body, _ := io.ReadAll(statsResp.Body)
		log.Printf("YouTube API returned status %d for video stats: %s", statsResp.StatusCode, string(body))
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
		log.Printf("Error decoding YouTube video stats: %v", err)
		return nil, fmt.Errorf("YouTube API error")
	}

	log.Printf("Successfully fetched statistics for %d videos", len(statsResponse.Items))

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
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("telegram API returned status %d: %s", resp.StatusCode, string(body))
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
	// Check if we already have recent data for this user/platform
	var existingID int
	query := `
		SELECT id FROM post_analytics 
		WHERE user_id = $1 AND platform = $2 
		AND snapshot_at > NOW() - INTERVAL '1 hour'
		ORDER BY snapshot_at DESC LIMIT 1
	`
	err := lib.DB.QueryRow(query, analytics.UserID, analytics.Platform).Scan(&existingID)
	if err == nil {
		// Update existing record
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
	insertQuery := `
		INSERT INTO post_analytics (user_id, platform, total_posts, total_likes, 
			total_comments, total_shares, total_views, engagement, top_posts, snapshot_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err = lib.DB.Exec(insertQuery, analytics.UserID, analytics.Platform,
		analytics.TotalPosts, analytics.TotalLikes, analytics.TotalComments,
		analytics.TotalShares, analytics.TotalViews, analytics.Engagement,
		analytics.TopPosts, analytics.SnapshotAt)
	return err
}

// SyncAllUserAnalytics syncs analytics for all platforms for a specific user
func SyncAllUserAnalytics(userID uuid.UUID) error {
	log.Printf("Starting analytics sync for all platforms for user %s", userID)

	// First, let's check if there are ANY social accounts for this user
	checkQuery := `SELECT COUNT(*) FROM social_accounts WHERE user_id = $1`
	var totalAccounts int
	err := lib.DB.QueryRow(checkQuery, userID).Scan(&totalAccounts)
	if err != nil {
		log.Printf("Error checking social accounts count: %v", err)
		return fmt.Errorf("error checking social accounts: %v", err)
	}
	log.Printf("Total social accounts for user %s: %d", userID, totalAccounts)

	if totalAccounts == 0 {
		log.Printf("No social accounts found for user %s", userID)
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

	log.Printf("Found %d connected platforms for user %s: %v", len(platforms), userID, platforms)

	// Sync each platform
	var syncErrors []string
	for _, platform := range platforms {
		log.Printf("Syncing analytics for platform %s", platform)
		syncer := NewAnalyticsSyncer(userID, platform)
		if err := syncer.SyncAnalytics(); err != nil {
			log.Printf("Error syncing %s analytics for user %s: %v", platform, userID, err)
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
		log.Printf("Some platforms failed to sync: %s", strings.Join(syncErrors, "; "))
	}

	log.Printf("Completed analytics sync for user %s", userID)

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
