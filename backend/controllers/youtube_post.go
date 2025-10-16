package controllers

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
	"social-sync-backend/lib"
	"strconv"
	"strings"
	"time"

	"social-sync-backend/middleware"

	"github.com/lib/pq"
	"golang.org/x/oauth2"
)

// YouTubeUploadRequest represents the video upload request
// (renamed to YouTubeVideoMetadata)
type YouTubeVideoMetadata struct {
	Snippet struct {
		Title       string   `json:"title"`
		Description string   `json:"description"`
		Tags        []string `json:"tags,omitempty"`
		CategoryID  string   `json:"categoryId"`
	} `json:"snippet"`
	Status struct {
		PrivacyStatus string `json:"privacyStatus"`
	} `json:"status"`
}

// YouTubeUploadResponse represents YouTube API response
type YouTubeUploadResponse struct {
	Kind    string `json:"kind"`
	Etag    string `json:"etag"`
	ID      string `json:"id"`
	Snippet struct {
		PublishedAt  string                 `json:"publishedAt"`
		ChannelID    string                 `json:"channelId"`
		Title        string                 `json:"title"`
		Description  string                 `json:"description"`
		Thumbnails   map[string]interface{} `json:"thumbnails"`
		ChannelTitle string                 `json:"channelTitle"`
		Tags         []string               `json:"tags"`
		CategoryID   string                 `json:"categoryId"`
	} `json:"snippet"`
	Status struct {
		UploadStatus        string `json:"uploadStatus"`
		PrivacyStatus       string `json:"privacyStatus"`
		License             string `json:"license"`
		Embeddable          bool   `json:"embeddable"`
		PublicStatsViewable bool   `json:"publicStatsViewable"`
	} `json:"status"`
}

// readSeekCloser wraps a bytes.Reader to satisfy multipart.File (adds Close no-op)
type readSeekCloser struct{ *bytes.Reader }

func (rsc *readSeekCloser) Close() error { return nil }

// PostToYouTubeHandler handles video upload to YouTube
func PostToYouTubeHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "user not authenticated", http.StatusUnauthorized)
			return
		}

		// Check if this is a JSON request (from frontend) or multipart form (direct upload)
		var title, description, tags, privacy, categoryID string
		var file multipart.File
		var fileHeader *multipart.FileHeader
		var cloudinaryURL string
		var selectedIDs []string

		contentType := r.Header.Get("Content-Type")
		if strings.Contains(contentType, "application/json") {
			// Handle JSON request from frontend
			var requestData struct {
				Title       string   `json:"title"`
				Description string   `json:"description"`
				MediaUrls   []string `json:"mediaUrls"`
				AccountIds  []string `json:"accountIds"`
				Privacy     string   `json:"privacy"`
			}

			if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
				http.Error(w, "failed to parse JSON data", http.StatusBadRequest)
				return
			}

			title = requestData.Title
			description = requestData.Description
			privacy = requestData.Privacy
			if privacy == "" {
				privacy = "private" // Default to private if not specified
			}
			categoryID = "22"
			selectedIDs = requestData.AccountIds

			// For now, we'll just return success since we can't upload without a video file
			// In a real implementation, you'd need to download the video from the media URL
			if len(requestData.MediaUrls) == 0 {
				http.Error(w, "video file is required for YouTube posting", http.StatusBadRequest)
				return
			}

			// Use the first media URL as the video source
			cloudinaryURL = requestData.MediaUrls[0]

		} else {
			// Handle multipart form data (direct upload)
			err = r.ParseMultipartForm(100 << 20)
			if err != nil {
				http.Error(w, "failed to parse form data", http.StatusBadRequest)
				return
			}

			file, fileHeader, err = r.FormFile("video")
			if err != nil {
				http.Error(w, "video file is required", http.StatusBadRequest)
				return
			}
			defer file.Close()

			if !isValidVideoFile(fileHeader.Filename) {
				http.Error(w, "invalid video file format. supported: mp4, mov, avi, wmv, flv, webm, mkv", http.StatusBadRequest)
				return
			}

			title = r.FormValue("title")
			description = r.FormValue("description")
			tags = r.FormValue("tags")
			privacy = r.FormValue("privacy")
			categoryID = r.FormValue("category_id")
		}

		if title == "" {
			http.Error(w, "title is required", http.StatusBadRequest)
			return
		}

		if privacy == "" {
			privacy = "private"
		}
		if categoryID == "" {
			categoryID = "22"
		}

		// Build targets: accountIds (multi) or all; else fallback to default/first
		var postAll bool

		if !strings.Contains(contentType, "application/json") {
			// For multipart form requests
			selectedIDs = r.MultipartForm.Value["accountIds"]
			postAll = r.FormValue("all") == "true"
		}

		var buf bytes.Buffer
		if file != nil {
			// Upload to Cloudinary once (backup), and read the video into memory once for reuse
			cloudinaryURL, err = lib.UploadToCloudinary(file, "videos", fileHeader.Filename)
			if err != nil {
				http.Error(w, "failed to upload video to storage", http.StatusInternalServerError)
				return
			}
			// Rewind and read into buffer for reuse across multiple uploads
			_, _ = file.Seek(0, 0)
			if _, err := io.Copy(&buf, file); err != nil {
				http.Error(w, "failed to buffer upload", http.StatusInternalServerError)
				return
			}
		} else {
			// For JSON requests, we already have the cloudinaryURL
			// We can't actually upload to YouTube without a video file, so we'll return a mock success
			// In a real implementation, you'd download the video from the cloudinaryURL and upload it
		}

		// reader wrapper is defined at file scope

		// Resolve target accounts
		type ytAcct struct {
			ID           string
			AccessToken  string
			RefreshToken string
		}
		var targets []ytAcct

		if len(selectedIDs) > 0 {
			// First, try to get accounts with external_id if the column exists
			rows, qErr := db.Query(`SELECT id::text, access_token, refresh_token, COALESCE(external_id, social_id, '') as channel_id FROM social_accounts WHERE user_id=$1 AND (platform='youtube' OR provider='youtube') AND id = ANY($2::uuid[])`, userID, pq.Array(selectedIDs))
			if qErr != nil {
				// If that fails, try without external_id
				fmt.Printf("DEBUG: First query failed, trying without external_id: %v\n", qErr)
				rows, qErr = db.Query(`SELECT id::text, access_token, refresh_token FROM social_accounts WHERE user_id=$1 AND (platform='youtube' OR provider='youtube') AND id = ANY($2::uuid[])`, userID, pq.Array(selectedIDs))
				if qErr != nil {
					http.Error(w, "failed to get YouTube accounts", http.StatusInternalServerError)
					return
				}
				defer rows.Close()

				// Simple approach without duplicate detection
				for rows.Next() {
					var id, at, rt string
					if scanErr := rows.Scan(&id, &at, &rt); scanErr == nil {
						targets = append(targets, ytAcct{ID: id, AccessToken: at, RefreshToken: rt})
					}
				}
			} else {
				defer rows.Close()

				// Track unique access tokens to prevent duplicate uploads to the same channel
				uniqueTokens := make(map[string]ytAcct)
				for rows.Next() {
					var id, at, rt, channelID string
					if scanErr := rows.Scan(&id, &at, &rt, &channelID); scanErr == nil {
						// Use access token as key to detect same Google account
						if _, exists := uniqueTokens[at]; !exists {
							uniqueTokens[at] = ytAcct{ID: id, AccessToken: at, RefreshToken: rt}
							fmt.Printf("DEBUG: Added unique YouTube account: %s (Channel ID: %s)\n", id, channelID)
						} else {
							fmt.Printf("DEBUG: Skipping duplicate YouTube account (same Google account): %s (Channel ID: %s)\n", id, channelID)
						}
					}
				}

				// Convert map values to slice
				for _, target := range uniqueTokens {
					targets = append(targets, target)
				}

				fmt.Printf("DEBUG: Found %d YouTube accounts from %d selected accounts\n", len(targets), len(selectedIDs))
			}
		} else if postAll {
			rows, qErr := db.Query(`SELECT id::text, access_token, refresh_token FROM social_accounts WHERE user_id=$1 AND (platform='youtube' OR provider='youtube')`, userID)
			if qErr != nil {
				http.Error(w, "failed to get YouTube accounts", http.StatusInternalServerError)
				return
			}
			defer rows.Close()
			for rows.Next() {
				var id, at, rt string
				if scanErr := rows.Scan(&id, &at, &rt); scanErr == nil {
					targets = append(targets, ytAcct{ID: id, AccessToken: at, RefreshToken: rt})
				}
			}
		} else {
			var id, at, rt string
			qErr := db.QueryRow(`SELECT id::text, access_token, refresh_token FROM social_accounts WHERE user_id=$1 AND (platform='youtube' OR provider='youtube') ORDER BY is_default DESC, connected_at DESC LIMIT 1`, userID).Scan(&id, &at, &rt)
			if qErr == sql.ErrNoRows {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(map[string]interface{}{
					"error": "YouTube account not connected",
				})
				return
			} else if qErr != nil {
				http.Error(w, "failed to get YouTube account", http.StatusInternalServerError)
				return
			}
			targets = append(targets, ytAcct{ID: id, AccessToken: at, RefreshToken: rt})
		}
		// Upload per-target and collect results
		type ytResult struct {
			AccountID string `json:"accountId"`
			OK        bool   `json:"ok"`
			VideoID   string `json:"videoId,omitempty"`
			Error     string `json:"error,omitempty"`
		}
		var results []ytResult

		if strings.Contains(contentType, "application/json") {
			// For JSON requests, download video from Cloudinary and upload to YouTube
			fmt.Printf("DEBUG: Processing %d YouTube targets\n", len(targets))
			for i, t := range targets {
				fmt.Printf("DEBUG: Processing target %d/%d - Account ID: %s\n", i+1, len(targets), t.ID)
				// Download video from Cloudinary
				videoData, err := downloadVideoFromCloudinary(cloudinaryURL)
				if err != nil {
					results = append(results, ytResult{
						AccountID: t.ID,
						OK:        false,
						Error:     "Failed to download video: " + err.Error(),
					})
					continue
				}

				// Upload to YouTube
				reader := &readSeekCloser{bytes.NewReader(videoData)}
				videoID, upErr := uploadVideoToYouTube(reader, int64(len(videoData)), title, description, tags, privacy, categoryID, t.AccessToken)
				if upErr != nil {
					// Attempt per-account refresh on auth errors
					if (strings.Contains(upErr.Error(), "401") || strings.Contains(upErr.Error(), "UNAUTHENTICATED") || strings.Contains(upErr.Error(), "Invalid Credentials")) && t.RefreshToken != "" {
						newToken, rErr := refreshYouTubeToken(t.RefreshToken)
						if rErr == nil && newToken != "" {
							// update only this account's token
							_, _ = db.Exec(`UPDATE social_accounts SET access_token=$1, last_synced_at=$2 WHERE id=$3::uuid`, newToken, time.Now(), t.ID)
							reader2 := &readSeekCloser{bytes.NewReader(videoData)}
							videoID, upErr = uploadVideoToYouTube(reader2, int64(len(videoData)), title, description, tags, privacy, categoryID, newToken)
						}
					}
				}
				if upErr != nil {
					fmt.Printf("DEBUG: YouTube upload failed for account %s: %v\n", t.ID, upErr)

					// Check if it's an upload limit error
					errorMsg := upErr.Error()
					if strings.Contains(errorMsg, "uploadLimitExceeded") || strings.Contains(errorMsg, "exceeded the number of videos") {
						errorMsg = "YouTube daily upload limit exceeded. Please try again tomorrow or verify your YouTube account to increase limits."
					}

					results = append(results, ytResult{AccountID: t.ID, OK: false, Error: errorMsg})
					continue
				}
				results = append(results, ytResult{AccountID: t.ID, OK: true, VideoID: videoID})
				fmt.Printf("DEBUG: Successfully uploaded to account %s, video ID: %s\n", t.ID, videoID)
			}
			successfulCount := 0
			for _, result := range results {
				if result.OK {
					successfulCount++
				}
			}
			fmt.Printf("DEBUG: Completed processing %d targets, %d successful, %d failed\n", len(targets), successfulCount, len(results)-successfulCount)
		} else {
			// For multipart form requests, do actual upload
			for _, t := range targets {
				reader := &readSeekCloser{bytes.NewReader(buf.Bytes())}
				videoID, upErr := uploadVideoToYouTube(reader, int64(buf.Len()), title, description, tags, privacy, categoryID, t.AccessToken)
				if upErr != nil {
					// Attempt per-account refresh on auth errors
					if (strings.Contains(upErr.Error(), "401") || strings.Contains(upErr.Error(), "UNAUTHENTICATED") || strings.Contains(upErr.Error(), "Invalid Credentials")) && t.RefreshToken != "" {
						newToken, rErr := refreshYouTubeToken(t.RefreshToken)
						if rErr == nil && newToken != "" {
							// update only this account's token
							_, _ = db.Exec(`UPDATE social_accounts SET access_token=$1, last_synced_at=$2 WHERE id=$3::uuid`, newToken, time.Now(), t.ID)
							reader2 := &readSeekCloser{bytes.NewReader(buf.Bytes())}
							videoID, upErr = uploadVideoToYouTube(reader2, int64(buf.Len()), title, description, tags, privacy, categoryID, newToken)
						}
					}
				}
				if upErr != nil {
					fmt.Printf("DEBUG: YouTube upload failed for account %s: %v\n", t.ID, upErr)

					// Check if it's an upload limit error
					errorMsg := upErr.Error()
					if strings.Contains(errorMsg, "uploadLimitExceeded") || strings.Contains(errorMsg, "exceeded the number of videos") {
						errorMsg = "YouTube daily upload limit exceeded. Please try again tomorrow or verify your YouTube account to increase limits."
					}

					results = append(results, ytResult{AccountID: t.ID, OK: false, Error: errorMsg})
					continue
				}
				results = append(results, ytResult{AccountID: t.ID, OK: true, VideoID: videoID})
			}

			successfulCount := 0
			for _, result := range results {
				if result.OK {
					successfulCount++
				}
			}
			fmt.Printf("DEBUG: Completed processing %d targets, %d successful, %d failed\n", len(targets), successfulCount, len(results)-successfulCount)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"results":    results,
			"backup_url": cloudinaryURL,
			"title":      title,
			"privacy":    privacy,
		})
	}
}

func uploadVideoToYouTube(file multipart.File, fileSize int64, title, description, tags, privacy, categoryID, accessToken string) (string, error) {
	metadata := YouTubeVideoMetadata{}
	metadata.Snippet.Title = title
	metadata.Snippet.Description = description
	metadata.Snippet.CategoryID = categoryID
	metadata.Status.PrivacyStatus = privacy

	if tags != "" {
		tagList := strings.Split(tags, ",")
		for i, tag := range tagList {
			tagList[i] = strings.TrimSpace(tag)
		}
		metadata.Snippet.Tags = tagList
	}

	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return "", err
	}

	fmt.Printf("DEBUG: Sending metadata to YouTube: %s\n", string(metadataJSON))

	initURL := "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status"
	initReq, err := http.NewRequest("POST", initURL, bytes.NewReader(metadataJSON))
	if err != nil {
		return "", err
	}

	initReq.Header.Set("Authorization", "Bearer "+accessToken)
	initReq.Header.Set("Content-Type", "application/json")
	initReq.Header.Set("X-Upload-Content-Type", "video/*")
	initReq.Header.Set("X-Upload-Content-Length", strconv.FormatInt(fileSize, 10))

	client := &http.Client{Timeout: 30 * time.Second}
	initResp, err := client.Do(initReq)
	if err != nil {
		return "", err
	}
	defer initResp.Body.Close()

	fmt.Printf("DEBUG: Init response status: %d\n", initResp.StatusCode)

	if initResp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(initResp.Body)
		fmt.Printf("DEBUG: Init error response: %s\n", string(bodyBytes))
		return "", fmt.Errorf("failed to initialize upload: %d - %s", initResp.StatusCode, string(bodyBytes))
	}

	uploadURL := initResp.Header.Get("Location")
	if uploadURL == "" {
		return "", fmt.Errorf("no upload URL received from YouTube")
	}

	fmt.Printf("DEBUG: Upload URL: %s\n", uploadURL)

	file.Seek(0, 0)

	uploadReq, err := http.NewRequest("PUT", uploadURL, file)
	if err != nil {
		return "", err
	}

	uploadReq.Header.Set("Content-Type", "video/*")
	uploadReq.Header.Set("Content-Length", strconv.FormatInt(fileSize, 10))

	uploadClient := &http.Client{Timeout: 300 * time.Second}
	uploadResp, err := uploadClient.Do(uploadReq)
	if err != nil {
		return "", err
	}
	defer uploadResp.Body.Close()

	fmt.Printf("DEBUG: Upload response status: %d\n", uploadResp.StatusCode)

	if uploadResp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(uploadResp.Body)
		fmt.Printf("DEBUG: Upload error response: %s\n", string(bodyBytes))
		return "", fmt.Errorf("failed to upload video: %d - %s", uploadResp.StatusCode, string(bodyBytes))
	}

	var uploadRespData YouTubeUploadResponse
	if err := json.NewDecoder(uploadResp.Body).Decode(&uploadRespData); err != nil {
		return "", err
	}

	fmt.Printf("DEBUG: YouTube response - Title: %s, Privacy: %s\n", uploadRespData.Snippet.Title, uploadRespData.Status.PrivacyStatus)
	fmt.Printf("DEBUG: Full YouTube response: %+v\n", uploadRespData)

	// Ensure snippet (title/description/category) is set by updating after upload (defensive)
	if err := updateYouTubeVideoSnippet(uploadRespData.ID, title, description, tags, categoryID, accessToken); err != nil {
		fmt.Printf("WARNING: Failed to update YouTube snippet post-upload: %v\n", err)
	}

	return uploadRespData.ID, nil
}

// updateYouTubeVideoSnippet ensures the uploaded video's title/description/category are set
func updateYouTubeVideoSnippet(videoID, title, description, tags, categoryID, accessToken string) error {
	if videoID == "" {
		return nil
	}
	var tagList []string
	if tags != "" {
		for _, t := range strings.Split(tags, ",") {
			tt := strings.TrimSpace(t)
			if tt != "" {
				tagList = append(tagList, tt)
			}
		}
	}
	body := map[string]interface{}{
		"id": videoID,
		"snippet": map[string]interface{}{
			"title":       title,
			"description": description,
			"categoryId":  categoryID,
			"tags":        tagList,
		},
	}
	payload, _ := json.Marshal(body)
	req, err := http.NewRequest("PUT", "https://www.googleapis.com/youtube/v3/videos?part=snippet", bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("videos.update failed: %d - %s", resp.StatusCode, string(b))
	}
	return nil
}

func refreshYouTubeToken(refreshToken string) (string, error) {
	config := getYouTubeOAuthConfig()
	token := &oauth2.Token{RefreshToken: refreshToken}
	tokenSource := config.TokenSource(context.Background(), token)
	newToken, err := tokenSource.Token()
	if err != nil {
		return "", err
	}
	return newToken.AccessToken, nil
}

// downloadVideoFromCloudinary downloads a video from Cloudinary URL
func downloadVideoFromCloudinary(cloudinaryURL string) ([]byte, error) {
	client := &http.Client{Timeout: 300 * time.Second}
	resp, err := client.Get(cloudinaryURL)
	if err != nil {
		return nil, fmt.Errorf("failed to download video from Cloudinary: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to download video: HTTP %d", resp.StatusCode)
	}

	videoData, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read video data: %v", err)
	}

	return videoData, nil
}

func isValidVideoFile(filename string) bool {
	validExtensions := []string{".mp4", ".mov", ".avi", ".wmv", ".flv", ".webm", ".mkv"}
	filename = strings.ToLower(filename)
	for _, ext := range validExtensions {
		if strings.HasSuffix(filename, ext) {
			return true
		}
	}
	return false
}

// GetYouTubePostsHandler fetches the user's YouTube videos with stats
func GetYouTubePostsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "user not authenticated", http.StatusUnauthorized)
			return
		}

		// Check for accountId query parameter
		accountID := r.URL.Query().Get("accountId")

		// Get YouTube access token and channel ID
		var accessToken string
		var refreshToken string
		var channelID string
		var query string
		var args []interface{}

		if accountID != "" {
			// Fetch specific account
			query = `
				SELECT access_token, refresh_token, external_account_id 
				FROM social_accounts 
				WHERE user_id = $1 AND platform = 'youtube' AND id = $2::uuid
			`
			args = []interface{}{userID, accountID}
		} else {
			// Fetch default account
			query = `
				SELECT access_token, refresh_token, external_account_id 
			FROM social_accounts 
			WHERE user_id = $1 AND platform = 'youtube'
				ORDER BY is_default DESC, connected_at DESC
				LIMIT 1
			`
			args = []interface{}{userID}
		}

		err = db.QueryRow(query, args...).Scan(&accessToken, &refreshToken, &channelID)
		if err == sql.ErrNoRows {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error": "YouTube account not connected",
			})
			return
		} else if err != nil {
			http.Error(w, "failed to get YouTube account", http.StatusInternalServerError)
			return
		}

		// Step 1: Get the channel info using the stored channel ID
		channelsURL := fmt.Sprintf("https://www.googleapis.com/youtube/v3/channels?part=id,snippet&id=%s", channelID)
		req, err := http.NewRequest("GET", channelsURL, nil)
		if err != nil {
			http.Error(w, "failed to create request to YouTube API", http.StatusInternalServerError)
			return
		}
		req.Header.Set("Authorization", "Bearer "+accessToken)
		client := &http.Client{Timeout: 30 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			http.Error(w, "failed to contact YouTube API", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			http.Error(w, "failed to get YouTube channel: "+string(body), resp.StatusCode)
			return
		}
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
			http.Error(w, "failed to decode YouTube channel response", http.StatusInternalServerError)
			return
		}
		if len(channelsResp.Items) == 0 {
			http.Error(w, "No YouTube channel found", http.StatusBadRequest)
			return
		}

		// Step 2: Get the user's videos (playlistItems for uploads)
		playlistURL := fmt.Sprintf("https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=%s", channelID)
		req2, err := http.NewRequest("GET", playlistURL, nil)
		if err != nil {
			http.Error(w, "failed to create request to YouTube API", http.StatusInternalServerError)
			return
		}
		req2.Header.Set("Authorization", "Bearer "+accessToken)
		resp2, err := client.Do(req2)
		if err != nil {
			http.Error(w, "failed to contact YouTube API", http.StatusInternalServerError)
			return
		}
		defer resp2.Body.Close()
		if resp2.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp2.Body)
			http.Error(w, "failed to get YouTube uploads playlist: "+string(body), resp2.StatusCode)
			return
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
			http.Error(w, "failed to decode YouTube playlist response", http.StatusInternalServerError)
			return
		}
		if len(playlistResp.Items) == 0 {
			http.Error(w, "No uploads playlist found", http.StatusBadRequest)
			return
		}
		uploadsPlaylistID := playlistResp.Items[0].ContentDetails.RelatedPlaylists.Uploads

		// Step 3: Get videos from the uploads playlist
		videosURL := fmt.Sprintf("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=%s", uploadsPlaylistID)
		req3, err := http.NewRequest("GET", videosURL, nil)
		if err != nil {
			http.Error(w, "failed to create request to YouTube API", http.StatusInternalServerError)
			return
		}
		req3.Header.Set("Authorization", "Bearer "+accessToken)
		resp3, err := client.Do(req3)
		if err != nil {
			http.Error(w, "failed to contact YouTube API", http.StatusInternalServerError)
			return
		}
		defer resp3.Body.Close()
		if resp3.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp3.Body)
			http.Error(w, "failed to get YouTube videos: "+string(body), resp3.StatusCode)
			return
		}
		var videosResp struct {
			Items []struct {
				Snippet struct {
					Title       string                 `json:"title"`
					Description string                 `json:"description"`
					Thumbnails  map[string]interface{} `json:"thumbnails"`
					PublishedAt string                 `json:"publishedAt"`
					ResourceID  struct {
						VideoID string `json:"videoId"`
					} `json:"resourceId"`
				} `json:"snippet"`
				ContentDetails struct {
					VideoID string `json:"videoId"`
				} `json:"contentDetails"`
			} `json:"items"`
		}
		if err := json.NewDecoder(resp3.Body).Decode(&videosResp); err != nil {
			http.Error(w, "failed to decode YouTube videos response", http.StatusInternalServerError)
			return
		}

		// Debug logging
		log.Printf("DEBUG: YouTube videos response - Found %d videos in playlist", len(videosResp.Items))
		for i, item := range videosResp.Items {
			log.Printf("DEBUG: Video %d - ID: %s, Title: %s", i, item.Snippet.ResourceID.VideoID, item.Snippet.Title)
		}

		// Step 4: Get video statistics for each video
		videoIDs := []string{}
		for _, item := range videosResp.Items {
			videoIDs = append(videoIDs, item.Snippet.ResourceID.VideoID)
		}

		log.Printf("DEBUG: Processing %d video IDs for statistics", len(videoIDs))

		if len(videoIDs) == 0 {
			log.Printf("DEBUG: No video IDs found, returning empty response")
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode([]interface{}{})
			return
		}
		// YouTube API has a limit of 50 video IDs per request, so we need to batch them
		const maxVideosPerRequest = 50
		var allVideos []interface{}

		for i := 0; i < len(videoIDs); i += maxVideosPerRequest {
			end := i + maxVideosPerRequest
			if end > len(videoIDs) {
				end = len(videoIDs)
			}
			batch := videoIDs[i:end]

			log.Printf("DEBUG: Processing batch %d-%d of %d videos", i, end-1, len(videoIDs))

			statsURL := fmt.Sprintf("https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=%s", strings.Join(batch, ","))
			req4, err := http.NewRequest("GET", statsURL, nil)
			if err != nil {
				http.Error(w, "failed to create request to YouTube API", http.StatusInternalServerError)
				return
			}
			req4.Header.Set("Authorization", "Bearer "+accessToken)
			resp4, err := client.Do(req4)
			if err != nil {
				http.Error(w, "failed to contact YouTube API", http.StatusInternalServerError)
				return
			}
			defer resp4.Body.Close()
			if resp4.StatusCode != http.StatusOK {
				body, _ := io.ReadAll(resp4.Body)
				log.Printf("DEBUG: YouTube stats API error - Status: %d, Body: %s", resp4.StatusCode, string(body))
				http.Error(w, "failed to get YouTube video stats: "+string(body), resp4.StatusCode)
				return
			}
			var statsResp map[string]interface{}
			if err := json.NewDecoder(resp4.Body).Decode(&statsResp); err != nil {
				http.Error(w, "failed to decode YouTube video stats", http.StatusInternalServerError)
				return
			}

			// Debug logging for batch response
			if items, ok := statsResp["items"].([]interface{}); ok {
				log.Printf("DEBUG: YouTube stats batch response - Found %d videos with statistics", len(items))
				allVideos = append(allVideos, items...)
			} else {
				log.Printf("DEBUG: YouTube stats batch response - No items found or wrong format")
			}
		}

		// Create final response with all videos
		finalResp := map[string]interface{}{
			"items": allVideos,
		}

		log.Printf("DEBUG: Final YouTube response - Returning %d total videos", len(allVideos))

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(finalResp)
	}
}

// GetYouTubeAnalyticsHandler fetches real analytics from YouTube Data API v3
func GetYouTubeAnalyticsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "Unauthorized: User not authenticated", http.StatusUnauthorized)
			return
		}

		// 1. Get YouTube access token from DB
		var accessToken string
		var tokenExpiry *time.Time
		err = db.QueryRow(`
			SELECT access_token, access_token_expires_at
			FROM social_accounts
			WHERE user_id = $1 AND platform = 'youtube'
		`, userID).Scan(&accessToken, &tokenExpiry)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error": "YouTube account not connected",
			})
			return
		}
		if tokenExpiry != nil && time.Now().After(*tokenExpiry) {
			http.Error(w, "YouTube access token expired. Please reconnect.", http.StatusUnauthorized)
			return
		}

		client := &http.Client{Timeout: 30 * time.Second}

		// 2. Fetch channel stats (subscriberCount, videoCount, viewCount)
		channelsURL := "https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true"
		req, _ := http.NewRequest("GET", channelsURL, nil)
		req.Header.Set("Authorization", "Bearer "+accessToken)
		resp, err := client.Do(req)
		if err != nil {
			http.Error(w, "Failed to fetch YouTube channel stats", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			http.Error(w, "YouTube API error (channels)", resp.StatusCode)
			return
		}
		var channelData struct {
			Items []struct {
				Statistics struct {
					ViewCount       string `json:"viewCount"`
					SubscriberCount string `json:"subscriberCount"`
					VideoCount      string `json:"videoCount"`
				} `json:"statistics"`
			} `json:"items"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&channelData); err != nil {
			http.Error(w, "Failed to decode YouTube channel stats", http.StatusInternalServerError)
			return
		}
		if len(channelData.Items) == 0 {
			http.Error(w, "No YouTube channel found", http.StatusNotFound)
			return
		}
		stats := channelData.Items[0].Statistics

		// 3. Fetch latest videos (title, views, likes, comments)
		videosURL := "https://www.googleapis.com/youtube/v3/search?part=id&forMine=true&maxResults=5&order=date&type=video"
		req2, _ := http.NewRequest("GET", videosURL, nil)
		req2.Header.Set("Authorization", "Bearer "+accessToken)
		resp2, err := client.Do(req2)
		if err != nil {
			http.Error(w, "Failed to fetch YouTube videos", http.StatusInternalServerError)
			return
		}
		defer resp2.Body.Close()
		if resp2.StatusCode != http.StatusOK {
			http.Error(w, "YouTube API error (videos)", resp2.StatusCode)
			return
		}
		var videoSearch struct {
			Items []struct {
				ID struct {
					VideoID string `json:"videoId"`
				} `json:"id"`
			} `json:"items"`
		}
		if err := json.NewDecoder(resp2.Body).Decode(&videoSearch); err != nil {
			http.Error(w, "Failed to decode YouTube videos", http.StatusInternalServerError)
			return
		}

		videoIDs := ""
		for _, v := range videoSearch.Items {
			if videoIDs != "" {
				videoIDs += ","
			}
			videoIDs += v.ID.VideoID
		}

		videoDetails := []map[string]interface{}{}
		if videoIDs != "" {
			videosStatsURL := fmt.Sprintf("https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=%s", videoIDs)
			req3, _ := http.NewRequest("GET", videosStatsURL, nil)
			req3.Header.Set("Authorization", "Bearer "+accessToken)
			resp3, err := client.Do(req3)
			if err != nil {
				http.Error(w, "Failed to fetch video stats", http.StatusInternalServerError)
				return
			}
			defer resp3.Body.Close()
			if resp3.StatusCode != http.StatusOK {
				http.Error(w, "YouTube API error (video stats)", resp3.StatusCode)
				return
			}
			var videosResp struct {
				Items []struct {
					ID      string `json:"id"`
					Snippet struct {
						Title string `json:"title"`
					} `json:"snippet"`
					Statistics struct {
						ViewCount    string `json:"viewCount"`
						LikeCount    string `json:"likeCount"`
						CommentCount string `json:"commentCount"`
					} `json:"statistics"`
				} `json:"items"`
			}
			if err := json.NewDecoder(resp3.Body).Decode(&videosResp); err != nil {
				http.Error(w, "Failed to decode video stats", http.StatusInternalServerError)
				return
			}
			for _, v := range videosResp.Items {
				videoDetails = append(videoDetails, map[string]interface{}{
					"id":       v.ID,
					"title":    v.Snippet.Title,
					"views":    v.Statistics.ViewCount,
					"likes":    v.Statistics.LikeCount,
					"comments": v.Statistics.CommentCount,
				})
			}
		}

		result := map[string]interface{}{
			"channelStats": stats,
			"videos":       videoDetails,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
	}
}
