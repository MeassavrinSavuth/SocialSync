package controllers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"social-sync-backend/middleware"
	"social-sync-backend/models"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// TelegramConnectRequest represents the request body for connecting Telegram
type TelegramConnectRequest struct {
	ChatID string `json:"chat_id"`
}

// TelegramPostRequest represents the request body for posting to Telegram
type TelegramPostRequest struct {
	Message    string   `json:"message"`
	MediaUrls  []string `json:"mediaUrls,omitempty"`
	AccountIDs []string `json:"accountIds,omitempty"`
	All        bool     `json:"all,omitempty"`
}

// TelegramChatResponse represents Telegram getChat API response
type TelegramChatResponse struct {
	OK     bool `json:"ok"`
	Result struct {
		ID       int64  `json:"id"`
		Title    string `json:"title"`
		Username string `json:"username"`
		Type     string `json:"type"`
	} `json:"result"`
	Description string `json:"description,omitempty"`
}

// TelegramSendResponse represents Telegram send API response
type TelegramSendResponse struct {
	OK          bool   `json:"ok"`
	Description string `json:"description,omitempty"`
	Result      struct {
		MessageID int `json:"message_id"`
	} `json:"result"`
}

// ConnectTelegramHandler handles POST /connect/telegram
func ConnectTelegramHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get user ID from JWT context
		userIDStr, ok := r.Context().Value(middleware.UserIDKey).(string)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			http.Error(w, "Invalid user ID", http.StatusUnauthorized)
			return
		}

		// Parse request body
		var req TelegramConnectRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if req.ChatID == "" {
			http.Error(w, "chat_id is required", http.StatusBadRequest)
			return
		}

		// Get bot token from environment
		botToken := os.Getenv("TELEGRAM_BOT_TOKEN")
		if botToken == "" {
			http.Error(w, "Telegram bot not configured", http.StatusInternalServerError)
			return
		}

		// Verify chat exists and bot has access
		chatInfo, err := getTelegramChat(botToken, req.ChatID)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to verify Telegram chat: %v", err), http.StatusBadRequest)
			return
		}

		// Store or update the connection in social_accounts table
		socialAccount := models.SocialAccount{
			ID:          uuid.New(),
			UserID:      userID,
			Platform:    "telegram",
			SocialID:    strconv.FormatInt(chatInfo.Result.ID, 10),
			AccessToken: botToken, // Store bot token (consider if this is the best approach)
			ProfileName: &chatInfo.Result.Title,
			ConnectedAt: time.Now(),
		}

		// Check if already connected
		var existingID uuid.UUID
		err = db.QueryRow(`
			SELECT id FROM social_accounts 
			WHERE user_id = $1 AND platform = 'telegram' AND social_id = $2
		`, userID, socialAccount.SocialID).Scan(&existingID)

		if err == sql.ErrNoRows {
			// Insert new connection
			_, err = db.Exec(`
				INSERT INTO social_accounts (id, user_id, platform, social_id, access_token, profile_name, connected_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7)
			`, socialAccount.ID, socialAccount.UserID, socialAccount.Platform,
				socialAccount.SocialID, socialAccount.AccessToken, socialAccount.ProfileName, socialAccount.ConnectedAt)
		} else if err == nil {
			// Update existing connection
			_, err = db.Exec(`
				UPDATE social_accounts 
				SET access_token = $1, profile_name = $2, connected_at = $3
				WHERE id = $4
			`, socialAccount.AccessToken, socialAccount.ProfileName, time.Now(), existingID)
			socialAccount.ID = existingID
		}

		if err != nil {
			http.Error(w, "Failed to save Telegram connection", http.StatusInternalServerError)
			return
		}

		// Return success response
		response := map[string]interface{}{
			"success": true,
			"message": "Telegram channel connected successfully",
			"data": map[string]interface{}{
				"id":       socialAccount.ID,
				"chatId":   chatInfo.Result.ID,
				"title":    chatInfo.Result.Title,
				"username": chatInfo.Result.Username,
				"type":     chatInfo.Result.Type,
			},
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}
}

// PostToTelegramHandler handles POST /api/telegram/post
func PostToTelegramHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get user ID from JWT context
		userIDStr, ok := r.Context().Value(middleware.UserIDKey).(string)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			http.Error(w, "Invalid user ID", http.StatusUnauthorized)
			return
		}

		// Parse request body
		var req TelegramPostRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if req.Message == "" && len(req.MediaUrls) == 0 {
			http.Error(w, "Message or media is required", http.StatusBadRequest)
			return
		}

		// Build targets: AccountIDs, All, or fallback to default/first
		type tgAcct struct {
			ID    uuid.UUID
			Chat  string
			Token string
		}
		var targets []tgAcct
		if len(req.AccountIDs) > 0 {
			rows, qErr := db.Query(`SELECT id, social_id, access_token FROM social_accounts WHERE user_id=$1 AND platform='telegram' AND id = ANY($2::uuid[])`, userID, pq.Array(req.AccountIDs))
			if qErr != nil {
				http.Error(w, "Failed to get Telegram connections", http.StatusInternalServerError)
				return
			}
			defer rows.Close()
			for rows.Next() {
				var id uuid.UUID
				var chat, tok string
				if scanErr := rows.Scan(&id, &chat, &tok); scanErr == nil {
					targets = append(targets, tgAcct{ID: id, Chat: chat, Token: tok})
				}
			}
		} else if req.All {
			rows, qErr := db.Query(`SELECT id, social_id, access_token FROM social_accounts WHERE user_id=$1 AND platform='telegram'`, userID)
			if qErr != nil {
				http.Error(w, "Failed to get Telegram connections", http.StatusInternalServerError)
				return
			}
			defer rows.Close()
			for rows.Next() {
				var id uuid.UUID
				var chat, tok string
				if scanErr := rows.Scan(&id, &chat, &tok); scanErr == nil {
					targets = append(targets, tgAcct{ID: id, Chat: chat, Token: tok})
				}
			}
		} else {
			// default/first
			var id uuid.UUID
			var chat, tok string
			qErr := db.QueryRow(`SELECT id, social_id, access_token FROM social_accounts WHERE user_id=$1 AND platform='telegram' ORDER BY is_default DESC, connected_at DESC LIMIT 1`, userID).Scan(&id, &chat, &tok)
			if qErr == sql.ErrNoRows {
				http.Error(w, "No Telegram account connected", http.StatusBadRequest)
				return
			} else if qErr != nil {
				http.Error(w, "Failed to get Telegram connection", http.StatusInternalServerError)
				return
			}
			targets = append(targets, tgAcct{ID: id, Chat: chat, Token: tok})
		}

		if len(targets) == 0 {
			http.Error(w, "No Telegram targets selected", http.StatusBadRequest)
			return
		}

		// Send to each target independently
		var sendErrs []string
		for _, t := range targets {
			if err := sendTelegramMessage(t.Token, t.Chat, req.Message, req.MediaUrls); err != nil {
				sendErrs = append(sendErrs, fmt.Sprintf("chat %s: %v", t.Chat, err))
				continue
			}
			// Update last_synced_at for success
			_, _ = db.Exec(`UPDATE social_accounts SET last_synced_at=$1 WHERE id=$2`, time.Now(), t.ID)
		}

		if len(sendErrs) > 0 && len(targets) == 1 {
			http.Error(w, "Failed to send Telegram message: "+strings.Join(sendErrs, "; "), http.StatusInternalServerError)
			return
		}

		// Return success (with partial errors if any)
		if len(sendErrs) > 0 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"message":       "Sent with partial errors",
				"partialErrors": sendErrs,
			})
			return
		}
		response := map[string]interface{}{
			"success": true,
			"message": "Message sent to Telegram successfully",
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}
}

// getTelegramChat verifies a chat exists and bot has access
func getTelegramChat(botToken, chatID string) (*TelegramChatResponse, error) {
	url := fmt.Sprintf("https://api.telegram.org/bot%s/getChat?chat_id=%s", botToken, chatID)

	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("network error: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %v", err)
	}

	var chatResp TelegramChatResponse
	if err := json.Unmarshal(body, &chatResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %v", err)
	}

	if !chatResp.OK {
		return nil, fmt.Errorf("telegram API error: %s", chatResp.Description)
	}

	return &chatResp, nil
}

// sendTelegramMessage sends a message with optional media to Telegram
func sendTelegramMessage(botToken, chatID, message string, mediaUrls []string) error {
	if len(mediaUrls) == 0 {
		// Send text-only message
		return sendTelegramTextMessage(botToken, chatID, message)
	} else if len(mediaUrls) == 1 {
		// Send single media with caption
		return sendTelegramSingleMedia(botToken, chatID, message, mediaUrls[0])
	} else {
		// Send media group with caption
		return sendTelegramMediaGroup(botToken, chatID, message, mediaUrls)
	}
}

// sendTelegramTextMessage sends a text-only message
func sendTelegramTextMessage(botToken, chatID, message string) error {
	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", botToken)

	payload := map[string]interface{}{
		"chat_id": chatID,
		"text":    message,
	}

	return sendTelegramRequest(url, payload)
}

// sendTelegramSingleMedia sends a single photo/video with caption
func sendTelegramSingleMedia(botToken, chatID, caption, mediaUrl string) error {
	var url string
	var payload map[string]interface{}

	// Determine if it's a photo or video based on URL
	if isVideoUrl(mediaUrl) {
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

	return sendTelegramRequest(url, payload)
}

// sendTelegramMediaGroup sends multiple media items as a group
func sendTelegramMediaGroup(botToken, chatID, caption string, mediaUrls []string) error {
	// Check if we have mixed media types
	var hasPhotos, hasVideos bool
	for _, mediaUrl := range mediaUrls {
		if isVideoUrl(mediaUrl) {
			hasVideos = true
		} else {
			hasPhotos = true
		}
	}

	// If we have mixed media, send them separately
	if hasPhotos && hasVideos {
		return sendTelegramMixedMedia(botToken, chatID, caption, mediaUrls)
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
		if isVideoUrl(mediaUrl) {
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

	return sendTelegramRequest(url, payload)
}

// sendTelegramMixedMedia handles mixed media by sending them as separate messages
func sendTelegramMixedMedia(botToken, chatID, caption string, mediaUrls []string) error {
	// Separate photos and videos
	var photos, videos []string
	for _, mediaUrl := range mediaUrls {
		if isVideoUrl(mediaUrl) {
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
			if err := sendTelegramSingleMedia(botToken, chatID, photoCaption, photos[0]); err != nil {
				return fmt.Errorf("failed to send photo: %v", err)
			}
		} else {
			// Multiple photos - use media group
			if err := sendTelegramMediaGroup(botToken, chatID, photoCaption, photos); err != nil {
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
			if err := sendTelegramSingleMedia(botToken, chatID, videoCaption, videos[0]); err != nil {
				return fmt.Errorf("failed to send video: %v", err)
			}
		} else {
			// Multiple videos - use media group
			if err := sendTelegramMediaGroup(botToken, chatID, videoCaption, videos); err != nil {
				return fmt.Errorf("failed to send videos: %v", err)
			}
		}
	}

	return nil
}

// sendTelegramRequest sends a request to Telegram API
func sendTelegramRequest(url string, payload map[string]interface{}) error {
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

	var sendResp TelegramSendResponse
	if err := json.Unmarshal(body, &sendResp); err != nil {
		return fmt.Errorf("failed to parse response: %v", err)
	}

	if !sendResp.OK {
		return fmt.Errorf("telegram API error: %s", sendResp.Description)
	}

	return nil
}

// isVideoUrl determines if a URL points to a video file
func isVideoUrl(url string) bool {
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

// GetTelegramPostsHandler fetches the user's Telegram channel messages
func GetTelegramPostsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "Unauthorized: User not authenticated", http.StatusUnauthorized)
			return
		}

		// Check for accountId query parameter
		accountID := r.URL.Query().Get("accountId")

		// Get user's connected Telegram account
		var socialAccount models.SocialAccount
		var query string
		var args []interface{}

		if accountID != "" {
			// Fetch specific account
			query = `
				SELECT id, social_id, access_token, profile_name 
				FROM social_accounts 
				WHERE user_id = $1 AND platform = 'telegram' AND id = $2::uuid
			`
			args = []interface{}{userID, accountID}
			// Fetching specific Telegram account
		} else {
			// Fetch default account
			query = `
			SELECT id, social_id, access_token, profile_name 
			FROM social_accounts 
			WHERE user_id = $1 AND platform = 'telegram'
			ORDER BY connected_at DESC 
			LIMIT 1
			`
			args = []interface{}{userID}
		}

		err = db.QueryRow(query, args...).Scan(&socialAccount.ID, &socialAccount.SocialID, &socialAccount.AccessToken, &socialAccount.ProfileName)

		if err == sql.ErrNoRows {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error":          "Telegram account not connected",
				"needsReconnect": true,
				"message":        "Please connect your Telegram channel to view messages.",
			})
			return
		} else if err != nil {
			http.Error(w, "Failed to get Telegram connection", http.StatusInternalServerError)
			return
		}

		// Get bot token from environment
		botToken := os.Getenv("TELEGRAM_BOT_TOKEN")
		if botToken == "" {
			http.Error(w, "Telegram bot token not configured", http.StatusInternalServerError)
			return
		}

		// Fetch messages from Telegram channel
		messages, err := getTelegramChannelMessages(botToken, socialAccount.SocialID)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to fetch Telegram messages: %v", err), http.StatusInternalServerError)
			return
		}

		// Return response with channel info and messages
		response := map[string]interface{}{
			"data": messages,
			"channelInfo": map[string]interface{}{
				"name":     socialAccount.ProfileName,
				"id":       socialAccount.SocialID,
				"username": socialAccount.ProfileName, // Use profile name as username
			},
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}
}

// getTelegramChannelMessages fetches messages from a Telegram channel
func getTelegramChannelMessages(botToken, chatID string) ([]map[string]interface{}, error) {
	// First, try to get the chat information to verify the channel exists
	chatInfo, err := getTelegramChat(botToken, chatID)
	if err != nil {
		return nil, fmt.Errorf("failed to get chat info: %v", err)
	}

	fmt.Printf("DEBUG: Chat info retrieved: %+v\n", chatInfo)

	// For channels, we need to use getUpdates to get messages
	// The bot must be added to the channel as an admin to see messages
	// Note: getUpdates only returns recent updates, not historical messages
	// Try to get more updates by using a larger limit and different offset
	url := fmt.Sprintf("https://api.telegram.org/bot%s/getUpdates?limit=100&offset=-100", botToken)
	// Note: getUpdates only returns recent updates, not historical messages

	// Try to get messages using getChatHistory first (this might include bot's own messages)
	historyURL := fmt.Sprintf("https://api.telegram.org/bot%s/getChatHistory?chat_id=%s&limit=50", botToken, chatID)
	historyResp, err := http.Get(historyURL)
	var historyMessages []map[string]interface{}

	if err == nil {
		defer historyResp.Body.Close()
		historyBody, err := io.ReadAll(historyResp.Body)
		if err == nil {
			var historyResult struct {
				OK     bool `json:"ok"`
				Result []struct {
					ID   int    `json:"id"`
					Date int64  `json:"date"`
					Text string `json:"text"`
					From struct {
						ID       int64  `json:"id"`
						IsBot    bool   `json:"is_bot"`
						Username string `json:"username"`
					} `json:"from"`
					Photo []struct {
						FileID   string `json:"file_id"`
						Width    int    `json:"width"`
						Height   int    `json:"height"`
						FileSize int    `json:"file_size"`
					} `json:"photo"`
					Video struct {
						FileID    string `json:"file_id"`
						Width     int    `json:"width"`
						Height    int    `json:"height"`
						Duration  int    `json:"duration"`
						FileName  string `json:"file_name"`
						MimeType  string `json:"mime_type"`
						FileSize  int    `json:"file_size"`
						Thumbnail struct {
							FileID string `json:"file_id"`
						} `json:"thumbnail"`
					} `json:"video"`
					Document struct {
						FileID   string `json:"file_id"`
						FileName string `json:"file_name"`
						MimeType string `json:"mime_type"`
						FileSize int    `json:"file_size"`
					} `json:"document"`
					Caption  string `json:"caption"`
					Views    int    `json:"views"`
					Forwards int    `json:"forwards"`
				} `json:"result"`
			}

			if err := json.Unmarshal(historyBody, &historyResult); err == nil && historyResult.OK {
				// Convert history messages to our format
				for _, msg := range historyResult.Result {
					message := map[string]interface{}{
						"id":         msg.ID,
						"message_id": msg.ID,
						"text":       msg.Text,
						"message":    msg.Text,
						"date":       time.Unix(msg.Date, 0).Format(time.RFC3339),
						"created_at": time.Unix(msg.Date, 0).Format(time.RFC3339),
						"from": map[string]interface{}{
							"id":       msg.From.ID,
							"username": msg.From.Username,
							"is_bot":   msg.From.IsBot,
						},
						"chat": map[string]interface{}{
							"id":       chatInfo.Result.ID,
							"type":     chatInfo.Result.Type,
							"title":    chatInfo.Result.Title,
							"username": chatInfo.Result.Username,
						},
						"views":    msg.Views,
						"forwards": msg.Forwards,
					}

					// Add media if present
					if len(msg.Photo) > 0 {
						largestPhoto := msg.Photo[len(msg.Photo)-1]
						message["photo"] = map[string]interface{}{
							"url":       fmt.Sprintf("https://api.telegram.org/file/bot%s/%s", botToken, largestPhoto.FileID),
							"type":      "image",
							"width":     largestPhoto.Width,
							"height":    largestPhoto.Height,
							"file_size": largestPhoto.FileSize,
						}
					}

					if msg.Video.FileID != "" {
						message["video"] = map[string]interface{}{
							"url":       fmt.Sprintf("https://api.telegram.org/file/bot%s/%s", botToken, msg.Video.FileID),
							"type":      "video",
							"width":     msg.Video.Width,
							"height":    msg.Video.Height,
							"duration":  msg.Video.Duration,
							"file_name": msg.Video.FileName,
							"mime_type": msg.Video.MimeType,
							"file_size": msg.Video.FileSize,
						}
					}

					if msg.Document.FileID != "" {
						message["document"] = map[string]interface{}{
							"url":       fmt.Sprintf("https://api.telegram.org/file/bot%s/%s", botToken, msg.Document.FileID),
							"type":      "document",
							"file_name": msg.Document.FileName,
							"mime_type": msg.Document.MimeType,
							"file_size": msg.Document.FileSize,
						}
					}

					if msg.Caption != "" {
						message["caption"] = msg.Caption
					}

					historyMessages = append(historyMessages, message)
				}
			}
		}
	}

	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("network error: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %v", err)
	}

	// API response received

	var updatesResp struct {
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
				Date  int64  `json:"date"`
				Text  string `json:"text"`
				Photo []struct {
					FileID       string `json:"file_id"`
					FileUniqueID string `json:"file_unique_id"`
					Width        int    `json:"width"`
					Height       int    `json:"height"`
					FileSize     int    `json:"file_size"`
				} `json:"photo"`
				Video struct {
					FileID       string `json:"file_id"`
					FileUniqueID string `json:"file_unique_id"`
					Width        int    `json:"width"`
					Height       int    `json:"height"`
					Duration     int    `json:"duration"`
					Thumbnail    struct {
						FileID       string `json:"file_id"`
						FileUniqueID string `json:"file_unique_id"`
						Width        int    `json:"width"`
						Height       int    `json:"height"`
						FileSize     int    `json:"file_size"`
					} `json:"thumbnail"`
					FileName string `json:"file_name"`
					MimeType string `json:"mime_type"`
					FileSize int    `json:"file_size"`
				} `json:"video"`
				Document struct {
					FileID       string `json:"file_id"`
					FileUniqueID string `json:"file_unique_id"`
					FileName     string `json:"file_name"`
					MimeType     string `json:"mime_type"`
					FileSize     int    `json:"file_size"`
				} `json:"document"`
				Caption  string `json:"caption"`
				Views    int    `json:"views"`
				Forwards int    `json:"forwards"`
			} `json:"message"`
			ChannelPost struct {
				MessageID  int `json:"message_id"`
				SenderChat struct {
					ID       int64  `json:"id"`
					Type     string `json:"type"`
					Title    string `json:"title"`
					Username string `json:"username"`
				} `json:"sender_chat"`
				Chat struct {
					ID       int64  `json:"id"`
					Type     string `json:"type"`
					Title    string `json:"title"`
					Username string `json:"username"`
				} `json:"chat"`
				Date  int64  `json:"date"`
				Text  string `json:"text"`
				Photo []struct {
					FileID       string `json:"file_id"`
					FileUniqueID string `json:"file_unique_id"`
					Width        int    `json:"width"`
					Height       int    `json:"height"`
					FileSize     int    `json:"file_size"`
				} `json:"photo"`
				Video struct {
					FileID       string `json:"file_id"`
					FileUniqueID string `json:"file_unique_id"`
					Width        int    `json:"width"`
					Height       int    `json:"height"`
					Duration     int    `json:"duration"`
					Thumbnail    struct {
						FileID       string `json:"file_id"`
						FileUniqueID string `json:"file_unique_id"`
						Width        int    `json:"width"`
						Height       int    `json:"height"`
						FileSize     int    `json:"file_size"`
					} `json:"thumbnail"`
					FileName string `json:"file_name"`
					MimeType string `json:"mime_type"`
					FileSize int    `json:"file_size"`
				} `json:"video"`
				Document struct {
					FileID       string `json:"file_id"`
					FileUniqueID string `json:"file_unique_id"`
					FileName     string `json:"file_name"`
					MimeType     string `json:"mime_type"`
					FileSize     int    `json:"file_size"`
				} `json:"document"`
				Caption      string `json:"caption"`
				Views        int    `json:"views"`
				Forwards     int    `json:"forwards"`
				MediaGroupID string `json:"media_group_id"`
			} `json:"channel_post"`
		} `json:"result"`
	}

	if err := json.Unmarshal(body, &updatesResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %v", err)
	}

	if !updatesResp.OK {
		return nil, fmt.Errorf("telegram API error")
	}

	// Convert to our format and filter for the specific chat
	var messages []map[string]interface{}
	for _, update := range updatesResp.Result {
		// Check if this is a regular message or channel post
		var messageID int
		var currentChatID int64
		var chatType string
		var chatTitle string
		var chatUsername string
		var date int64
		var text string
		var photo []struct {
			FileID       string `json:"file_id"`
			FileUniqueID string `json:"file_unique_id"`
			Width        int    `json:"width"`
			Height       int    `json:"height"`
			FileSize     int    `json:"file_size"`
		}
		var video struct {
			FileID       string `json:"file_id"`
			FileUniqueID string `json:"file_unique_id"`
			Width        int    `json:"width"`
			Height       int    `json:"height"`
			Duration     int    `json:"duration"`
			Thumbnail    struct {
				FileID       string `json:"file_id"`
				FileUniqueID string `json:"file_unique_id"`
				Width        int    `json:"width"`
				Height       int    `json:"height"`
				FileSize     int    `json:"file_size"`
			} `json:"thumbnail"`
			FileName string `json:"file_name"`
			MimeType string `json:"mime_type"`
			FileSize int    `json:"file_size"`
		}
		var document struct {
			FileID       string `json:"file_id"`
			FileUniqueID string `json:"file_unique_id"`
			FileName     string `json:"file_name"`
			MimeType     string `json:"mime_type"`
			FileSize     int    `json:"file_size"`
		}
		var caption string
		var views int
		var forwards int
		var mediaGroupID string

		// Check if it's a regular message
		if update.Message.MessageID != 0 {
			messageID = update.Message.MessageID
			currentChatID = update.Message.Chat.ID
			chatType = update.Message.Chat.Type
			chatTitle = update.Message.Chat.Title
			chatUsername = update.Message.Chat.Username
			date = update.Message.Date
			text = update.Message.Text
			photo = update.Message.Photo
			video = update.Message.Video
			document = update.Message.Document
			caption = update.Message.Caption
			views = update.Message.Views
			forwards = update.Message.Forwards
			// Processing regular message
		} else if update.ChannelPost.MessageID != 0 {
			// It's a channel post
			messageID = update.ChannelPost.MessageID
			currentChatID = update.ChannelPost.Chat.ID
			chatType = update.ChannelPost.Chat.Type
			chatTitle = update.ChannelPost.Chat.Title
			chatUsername = update.ChannelPost.Chat.Username
			date = update.ChannelPost.Date
			text = update.ChannelPost.Text
			photo = update.ChannelPost.Photo
			video = update.ChannelPost.Video
			document = update.ChannelPost.Document
			caption = update.ChannelPost.Caption
			views = update.ChannelPost.Views
			forwards = update.ChannelPost.Forwards
			mediaGroupID = update.ChannelPost.MediaGroupID
			// Processing channel post
		} else {
			continue
		}

		// Convert target chatID to int64 for comparison
		targetChatIDInt, err := strconv.ParseInt(chatID, 10, 64)
		if err != nil {
			// If target chatID is not a number, compare as string
			if chatUsername != chatID {
				continue
			}
		} else {
			// Compare as int64
			if currentChatID != targetChatIDInt {
				continue
			}
		}

		message := map[string]interface{}{
			"id":         messageID,
			"message_id": messageID,
			"text":       text,
			"message":    text,
			"date":       time.Unix(date, 0).Format(time.RFC3339),
			"created_at": time.Unix(date, 0).Format(time.RFC3339),
			"from": map[string]interface{}{
				"id":         123456789, // System ID for channel posts
				"first_name": "System",
				"username":   "system",
				"is_bot":     true,
			},
			"chat": map[string]interface{}{
				"id":       currentChatID,
				"type":     chatType,
				"title":    chatTitle,
				"username": chatUsername,
			},
			"views":    views,
			"forwards": forwards,
		}

		// Add media group ID if present
		if mediaGroupID != "" {
			message["media_group_id"] = mediaGroupID
		}

		// Handle media attachments
		if len(photo) > 0 {
			// Get the largest photo
			largestPhoto := photo[len(photo)-1]
			// Get the actual file URL from Telegram
			fileURL := fmt.Sprintf("https://api.telegram.org/bot%s/getFile?file_id=%s", botToken, largestPhoto.FileID)

			// Fetch the file path from Telegram
			resp, err := http.Get(fileURL)
			if err == nil {
				defer resp.Body.Close()
				var fileResp struct {
					OK     bool `json:"ok"`
					Result struct {
						FilePath string `json:"file_path"`
					} `json:"result"`
				}
				if err := json.NewDecoder(resp.Body).Decode(&fileResp); err == nil && fileResp.OK {
					actualURL := fmt.Sprintf("https://api.telegram.org/file/bot%s/%s", botToken, fileResp.Result.FilePath)
					message["photo"] = map[string]interface{}{
						"url":       actualURL,
						"type":      "image",
						"width":     largestPhoto.Width,
						"height":    largestPhoto.Height,
						"file_size": largestPhoto.FileSize,
					}
				} else {
					// Fallback to getFile URL
					message["photo"] = map[string]interface{}{
						"url":       fileURL,
						"type":      "image",
						"width":     largestPhoto.Width,
						"height":    largestPhoto.Height,
						"file_size": largestPhoto.FileSize,
					}
				}
			} else {
				// Fallback to getFile URL
				message["photo"] = map[string]interface{}{
					"url":       fileURL,
					"type":      "image",
					"width":     largestPhoto.Width,
					"height":    largestPhoto.Height,
					"file_size": largestPhoto.FileSize,
				}
			}
		}

		if video.FileID != "" {
			// Get the actual file URL from Telegram
			fileURL := fmt.Sprintf("https://api.telegram.org/bot%s/getFile?file_id=%s", botToken, video.FileID)

			// Fetch the file path from Telegram
			resp, err := http.Get(fileURL)
			var actualURL string
			if err == nil {
				defer resp.Body.Close()
				var fileResp struct {
					OK     bool `json:"ok"`
					Result struct {
						FilePath string `json:"file_path"`
					} `json:"result"`
				}
				if err := json.NewDecoder(resp.Body).Decode(&fileResp); err == nil && fileResp.OK {
					actualURL = fmt.Sprintf("https://api.telegram.org/file/bot%s/%s", botToken, fileResp.Result.FilePath)
				} else {
					actualURL = fileURL
				}
			} else {
				actualURL = fileURL
			}

			// Get thumbnail URL
			thumbURL := ""
			if video.Thumbnail.FileID != "" {
				thumbFileURL := fmt.Sprintf("https://api.telegram.org/bot%s/getFile?file_id=%s", botToken, video.Thumbnail.FileID)
				thumbResp, err := http.Get(thumbFileURL)
				if err == nil {
					defer thumbResp.Body.Close()
					var thumbFileResp struct {
						OK     bool `json:"ok"`
						Result struct {
							FilePath string `json:"file_path"`
						} `json:"result"`
					}
					if err := json.NewDecoder(thumbResp.Body).Decode(&thumbFileResp); err == nil && thumbFileResp.OK {
						thumbURL = fmt.Sprintf("https://api.telegram.org/file/bot%s/%s", botToken, thumbFileResp.Result.FilePath)
					} else {
						thumbURL = thumbFileURL
					}
				} else {
					thumbURL = thumbFileURL
				}
			}

			message["video"] = map[string]interface{}{
				"url":       actualURL,
				"type":      "video",
				"width":     video.Width,
				"height":    video.Height,
				"duration":  video.Duration,
				"file_name": video.FileName,
				"mime_type": video.MimeType,
				"file_size": video.FileSize,
				"thumb": map[string]interface{}{
					"url": thumbURL,
				},
			}
		}

		if document.FileID != "" {
			// Get the actual file URL from Telegram
			fileURL := fmt.Sprintf("https://api.telegram.org/bot%s/getFile?file_id=%s", botToken, document.FileID)

			// Fetch the file path from Telegram
			resp, err := http.Get(fileURL)
			var actualURL string
			if err == nil {
				defer resp.Body.Close()
				var fileResp struct {
					OK     bool `json:"ok"`
					Result struct {
						FilePath string `json:"file_path"`
					} `json:"result"`
				}
				if err := json.NewDecoder(resp.Body).Decode(&fileResp); err == nil && fileResp.OK {
					actualURL = fmt.Sprintf("https://api.telegram.org/file/bot%s/%s", botToken, fileResp.Result.FilePath)
				} else {
					actualURL = fileURL
				}
			} else {
				actualURL = fileURL
			}

			message["document"] = map[string]interface{}{
				"url":       actualURL,
				"type":      "document",
				"file_name": document.FileName,
				"mime_type": document.MimeType,
				"file_size": document.FileSize,
			}
		}

		// Add caption if present
		if caption != "" {
			message["caption"] = caption
		}

		messages = append(messages, message)
	}

	// If no messages found, try alternative approaches to get real messages
	if len(messages) == 0 {
		// Try to get messages using different approaches
		realMessages, err := tryAlternativeMessageFetching(botToken, chatID, chatInfo)
		if err == nil && len(realMessages) > 0 {
			return realMessages, nil
		}

		// If still no messages, check bot permissions and provide helpful feedback
		adminURL := fmt.Sprintf("https://api.telegram.org/bot%s/getChatAdministrators?chat_id=%s", botToken, chatID)
		adminResp, err := http.Get(adminURL)
		if err == nil {
			defer adminResp.Body.Close()
			adminBody, _ := io.ReadAll(adminResp.Body)
			var adminResult struct {
				OK     bool `json:"ok"`
				Result []struct {
					User struct {
						ID       int64  `json:"id"`
						IsBot    bool   `json:"is_bot"`
						Username string `json:"username"`
					} `json:"user"`
					Status string `json:"status"`
				} `json:"result"`
			}
			json.Unmarshal(adminBody, &adminResult)

			// Check if bot is admin
			botIsAdmin := false
			for _, admin := range adminResult.Result {
				if admin.User.IsBot && (admin.Status == "administrator" || admin.Status == "creator") {
					botIsAdmin = true
					break
				}
			}

			if !botIsAdmin {
				return []map[string]interface{}{
					{
						"id":         1,
						"message_id": 1,
						"text":       fmt.Sprintf("Bot is not an admin of channel '%s'. To see messages, add the bot as an administrator to the channel.", chatInfo.Result.Title),
						"message":    fmt.Sprintf("Bot is not an admin of channel '%s'. To see messages, add the bot as an administrator to the channel.", chatInfo.Result.Title),
						"date":       time.Now().Format(time.RFC3339),
						"created_at": time.Now().Format(time.RFC3339),
						"from": map[string]interface{}{
							"id":         123456789,
							"first_name": "System",
							"username":   "system",
							"is_bot":     true,
						},
						"chat": map[string]interface{}{
							"id":       chatID,
							"type":     chatInfo.Result.Type,
							"title":    chatInfo.Result.Title,
							"username": chatInfo.Result.Username,
						},
						"views":    0,
						"forwards": 0,
					},
				}, nil
			}
		}

		// If no messages found, return empty array instead of fake debug message
		return []map[string]interface{}{}, nil
	}

	// Combine history messages with getUpdates messages
	allMessages := append(historyMessages, messages...)

	// Remove duplicates based on message ID
	seen := make(map[int]bool)
	var uniqueMessages []map[string]interface{}
	for _, msg := range allMessages {
		if msgID, ok := msg["message_id"].(int); ok {
			if !seen[msgID] {
				seen[msgID] = true
				uniqueMessages = append(uniqueMessages, msg)
			}
		}
	}

	// Sort by date (newest first)
	sort.Slice(uniqueMessages, func(i, j int) bool {
		dateI, _ := time.Parse(time.RFC3339, uniqueMessages[i]["date"].(string))
		dateJ, _ := time.Parse(time.RFC3339, uniqueMessages[j]["date"].(string))
		return dateI.After(dateJ)
	})

	// Return messages
	return uniqueMessages, nil
}

// tryAlternativeMessageFetching tries different approaches to get real messages from the channel
func tryAlternativeMessageFetching(botToken, chatID string, chatInfo *TelegramChatResponse) ([]map[string]interface{}, error) {
	var messages []map[string]interface{}

	// Approach 1: Try to get messages with different offset values
	for offset := 0; offset < 5; offset++ {
		url := fmt.Sprintf("https://api.telegram.org/bot%s/getUpdates?limit=100&offset=%d", botToken, offset)
		resp, err := http.Get(url)
		if err != nil {
			continue
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			continue
		}

		var updatesResp struct {
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
					Date  int64  `json:"date"`
					Text  string `json:"text"`
					Photo []struct {
						FileID       string `json:"file_id"`
						FileUniqueID string `json:"file_unique_id"`
						Width        int    `json:"width"`
						Height       int    `json:"height"`
						FileSize     int    `json:"file_size"`
					} `json:"photo"`
					Video struct {
						FileID       string `json:"file_id"`
						FileUniqueID string `json:"file_unique_id"`
						Width        int    `json:"width"`
						Height       int    `json:"height"`
						Duration     int    `json:"duration"`
						Thumbnail    struct {
							FileID       string `json:"file_id"`
							FileUniqueID string `json:"file_unique_id"`
							Width        int    `json:"width"`
							Height       int    `json:"height"`
							FileSize     int    `json:"file_size"`
						} `json:"thumbnail"`
						FileName string `json:"file_name"`
						MimeType string `json:"mime_type"`
						FileSize int    `json:"file_size"`
					} `json:"video"`
					Document struct {
						FileID       string `json:"file_id"`
						FileUniqueID string `json:"file_unique_id"`
						FileName     string `json:"file_name"`
						MimeType     string `json:"mime_type"`
						FileSize     int    `json:"file_size"`
					} `json:"document"`
					Caption  string `json:"caption"`
					Views    int    `json:"views"`
					Forwards int    `json:"forwards"`
				} `json:"message"`
			} `json:"result"`
		}

		if err := json.Unmarshal(body, &updatesResp); err != nil {
			continue
		}

		if !updatesResp.OK {
			continue
		}

		// Process messages from this batch
		for _, update := range updatesResp.Result {
			if update.Message.MessageID == 0 {
				continue
			}

			// Convert chatID to int64 for comparison
			chatIDInt, err := strconv.ParseInt(chatID, 10, 64)
			if err != nil {
				// If chatID is not a number, compare as string
				if update.Message.Chat.Username != chatID {
					continue
				}
			} else {
				// Compare as int64
				if update.Message.Chat.ID != chatIDInt {
					continue
				}
			}

			message := map[string]interface{}{
				"id":         update.Message.MessageID,
				"message_id": update.Message.MessageID,
				"text":       update.Message.Text,
				"message":    update.Message.Text,
				"date":       time.Unix(update.Message.Date, 0).Format(time.RFC3339),
				"created_at": time.Unix(update.Message.Date, 0).Format(time.RFC3339),
				"from": map[string]interface{}{
					"id":         update.Message.From.ID,
					"first_name": update.Message.From.FirstName,
					"username":   update.Message.From.Username,
					"is_bot":     update.Message.From.IsBot,
				},
				"chat": map[string]interface{}{
					"id":       update.Message.Chat.ID,
					"type":     update.Message.Chat.Type,
					"title":    update.Message.Chat.Title,
					"username": update.Message.Chat.Username,
				},
				"views":    update.Message.Views,
				"forwards": update.Message.Forwards,
			}

			// Handle media attachments
			if len(update.Message.Photo) > 0 {
				largestPhoto := update.Message.Photo[len(update.Message.Photo)-1]
				message["photo"] = map[string]interface{}{
					"url":       fmt.Sprintf("https://api.telegram.org/bot%s/getFile?file_id=%s", botToken, largestPhoto.FileID),
					"type":      "image",
					"width":     largestPhoto.Width,
					"height":    largestPhoto.Height,
					"file_size": largestPhoto.FileSize,
				}
			}

			if update.Message.Video.FileID != "" {
				message["video"] = map[string]interface{}{
					"url":       fmt.Sprintf("https://api.telegram.org/bot%s/getFile?file_id=%s", botToken, update.Message.Video.FileID),
					"type":      "video",
					"width":     update.Message.Video.Width,
					"height":    update.Message.Video.Height,
					"duration":  update.Message.Video.Duration,
					"file_name": update.Message.Video.FileName,
					"mime_type": update.Message.Video.MimeType,
					"file_size": update.Message.Video.FileSize,
					"thumb": map[string]interface{}{
						"url": fmt.Sprintf("https://api.telegram.org/bot%s/getFile?file_id=%s", botToken, update.Message.Video.Thumbnail.FileID),
					},
				}
			}

			if update.Message.Document.FileID != "" {
				message["document"] = map[string]interface{}{
					"url":       fmt.Sprintf("https://api.telegram.org/bot%s/getFile?file_id=%s", botToken, update.Message.Document.FileID),
					"type":      "document",
					"file_name": update.Message.Document.FileName,
					"mime_type": update.Message.Document.MimeType,
					"file_size": update.Message.Document.FileSize,
				}
			}

			if update.Message.Caption != "" {
				message["caption"] = update.Message.Caption
			}

			messages = append(messages, message)
		}

		// If we found messages, break
		if len(messages) > 0 {
			break
		}
	}

	// Sort by date (newest first)
	if len(messages) > 0 {
		sort.Slice(messages, func(i, j int) bool {
			dateI, _ := time.Parse(time.RFC3339, messages[i]["date"].(string))
			dateJ, _ := time.Parse(time.RFC3339, messages[j]["date"].(string))
			return dateI.After(dateJ)
		})
	}

	return messages, nil
}
