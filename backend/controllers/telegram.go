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
)

// TelegramConnectRequest represents the request body for connecting Telegram
type TelegramConnectRequest struct {
	ChatID string `json:"chat_id"`
}

// TelegramPostRequest represents the request body for posting to Telegram
type TelegramPostRequest struct {
	Message   string   `json:"message"`
	MediaUrls []string `json:"mediaUrls,omitempty"`
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

		// Get user's connected Telegram account
		var socialAccount models.SocialAccount
		err = db.QueryRow(`
			SELECT id, social_id, access_token, profile_name 
			FROM social_accounts 
			WHERE user_id = $1 AND platform = 'telegram'
			ORDER BY connected_at DESC 
			LIMIT 1
		`, userID).Scan(&socialAccount.ID, &socialAccount.SocialID, &socialAccount.AccessToken, &socialAccount.ProfileName)

		if err == sql.ErrNoRows {
			http.Error(w, "No Telegram account connected", http.StatusBadRequest)
			return
		} else if err != nil {
			http.Error(w, "Failed to get Telegram connection", http.StatusInternalServerError)
			return
		}

		// Send message to Telegram
		err = sendTelegramMessage(socialAccount.AccessToken, socialAccount.SocialID, req.Message, req.MediaUrls)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to send Telegram message: %v", err), http.StatusInternalServerError)
			return
		}

		// Update last synced timestamp
		_, err = db.Exec(`
			UPDATE social_accounts 
			SET last_synced_at = $1 
			WHERE id = $2
		`, time.Now(), socialAccount.ID)

		if err != nil {
			// Log error but don't fail the request
			fmt.Printf("Failed to update last_synced_at for Telegram account %s: %v\n", socialAccount.ID, err)
		}

		// Return success response
		response := map[string]interface{}{
			"success": true,
			"message": "Message sent to Telegram successfully",
			"data": map[string]interface{}{
				"chatId":      socialAccount.SocialID,
				"channelName": socialAccount.ProfileName,
			},
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

		// Get user's connected Telegram account
		var socialAccount models.SocialAccount
		err = db.QueryRow(`
			SELECT id, social_id, access_token, profile_name 
			FROM social_accounts 
			WHERE user_id = $1 AND platform = 'telegram'
			ORDER BY connected_at DESC 
			LIMIT 1
		`, userID).Scan(&socialAccount.ID, &socialAccount.SocialID, &socialAccount.AccessToken, &socialAccount.ProfileName)

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
	// Get recent updates from the bot
	url := fmt.Sprintf("https://api.telegram.org/bot%s/getUpdates?limit=100&offset=-100", botToken)

	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("network error: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %v", err)
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
		return nil, fmt.Errorf("failed to parse response: %v", err)
	}

	if !updatesResp.OK {
		return nil, fmt.Errorf("telegram API error")
	}

	// Convert to our format and filter for the specific chat
	var messages []map[string]interface{}
	for _, update := range updatesResp.Result {
		if update.Message.MessageID == 0 {
			continue
		}

		// Only include messages from the specified chat
		if fmt.Sprintf("%d", update.Message.Chat.ID) != chatID && update.Message.Chat.Username != chatID {
			continue
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
			// Get the largest photo
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

	// If no messages found, return a sample message
	if len(messages) == 0 {
		return []map[string]interface{}{
			{
				"id":         1,
				"message_id": 1,
				"text":       "No messages found in this channel. Start by sending a message to your connected Telegram channel.",
				"message":    "No messages found in this channel. Start by sending a message to your connected Telegram channel.",
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
					"type":     "channel",
					"title":    "Your Channel",
					"username": "your_channel",
				},
				"views":    0,
				"forwards": 0,
			},
		}, nil
	}

	// Sort by date (newest first)
	sort.Slice(messages, func(i, j int) bool {
		dateI, _ := time.Parse(time.RFC3339, messages[i]["date"].(string))
		dateJ, _ := time.Parse(time.RFC3339, messages[j]["date"].(string))
		return dateI.After(dateJ)
	})

	return messages, nil
}
