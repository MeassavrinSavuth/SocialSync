package controllers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"time"

	"social-sync-backend/lib"
	"social-sync-backend/middleware"
)

type MastodonPostRequest struct {
	Message    string   `json:"message"`
	Visibility string   `json:"visibility,omitempty"` // public, unlisted, private, direct
	Images     []string `json:"images,omitempty"`     // Base64 encoded images or URLs
}

type MastodonMediaResponse struct {
	ID          string `json:"id"`
	Type        string `json:"type"`
	URL         string `json:"url"`
	PreviewURL  string `json:"preview_url"`
	Description string `json:"description,omitempty"`
}

type MastodonPostResponse struct {
	ID               string                  `json:"id"`
	Content          string                  `json:"content"`
	URL              string                  `json:"url"`
	CreatedAt        time.Time               `json:"created_at"`
	Visibility       string                  `json:"visibility"`
	MediaAttachments []MastodonMediaResponse `json:"media_attachments"`
}

type MastodonErrorResponse struct {
	Error            string `json:"error"`
	ErrorDescription string `json:"error_description"`
}

func PostToMastodonHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "Unauthorized: User not authenticated", http.StatusUnauthorized)
			return
		}

		var message string
		var visibility string

		contentType := r.Header.Get("Content-Type")
		fmt.Printf("DEBUG: Content-Type: %s\n", contentType)

		if strings.Contains(contentType, "multipart/form-data") {
			fmt.Printf("DEBUG: Parsing multipart form data\n")
			err = r.ParseMultipartForm(32 << 20) // 32MB max
			if err != nil {
				fmt.Printf("DEBUG: Error parsing multipart form: %v\n", err)
				http.Error(w, "Failed to parse form data", http.StatusBadRequest)
				return
			}

			message = strings.TrimSpace(r.FormValue("message"))
			visibility = r.FormValue("visibility")
		} else {
			fmt.Printf("DEBUG: Parsing JSON request\n")
			var req MastodonPostRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				fmt.Printf("DEBUG: Error decoding JSON request body: %v\n", err)
				http.Error(w, "Invalid request body", http.StatusBadRequest)
				return
			}
			message = strings.TrimSpace(req.Message)
			visibility = req.Visibility
		}

		if message == "" {
			fmt.Printf("DEBUG: Message is empty\n")
			http.Error(w, "Message cannot be empty", http.StatusBadRequest)
			return
		}
		fmt.Printf("DEBUG: Request message: %s\n", message)

		if len(message) > 500 {
			fmt.Printf("DEBUG: Message too long: %d characters\n", len(message))
			http.Error(w, "Message exceeds Mastodon's 500 character limit", http.StatusBadRequest)
			return
		}

		if visibility == "" {
			visibility = "public"
		}
		fmt.Printf("DEBUG: Visibility: %s\n", visibility)

		validVisibilities := map[string]bool{
			"public":   true,
			"unlisted": true,
			"private":  true,
			"direct":   true,
		}
		if !validVisibilities[visibility] {
			fmt.Printf("DEBUG: Invalid visibility: %s\n", visibility)
			http.Error(w, "Invalid visibility. Must be: public, unlisted, private, or direct", http.StatusBadRequest)
			return
		}

		var accessToken string
		var tokenExpiry *time.Time
		var refreshToken *string
		var socialID string

		fmt.Printf("DEBUG: Querying database for Mastodon account\n")
		err = db.QueryRow(`
			SELECT access_token, access_token_expires_at, refresh_token, social_id
			FROM social_accounts
			WHERE user_id = $1 AND platform = 'mastodon'
		`, userID).Scan(&accessToken, &tokenExpiry, &refreshToken, &socialID)

		if err != nil {
			if err == sql.ErrNoRows {
				fmt.Printf("DEBUG: Mastodon account not found in database\n")
				http.Error(w, "Mastodon account not connected", http.StatusBadRequest)
				return
			}
			fmt.Printf("DEBUG: Database error retrieving Mastodon account: %v\n", err)
			http.Error(w, "Failed to retrieve Mastodon account", http.StatusInternalServerError)
			return
		}
		fmt.Printf("DEBUG: Found Mastodon account, social_id: %s\n", socialID)

		// Extract instance URL from social_id
		var instanceURL string
		if strings.Contains(socialID, "://") {
			lastColonIndex := strings.LastIndex(socialID, ":")
			if lastColonIndex == -1 {
				fmt.Printf("DEBUG: Invalid social_id format (no colon found): %s\n", socialID)
				http.Error(w, "Invalid Mastodon account data", http.StatusInternalServerError)
				return
			}
			instanceURL = socialID[:lastColonIndex]
		} else {
			parts := strings.Split(socialID, ":")
			if len(parts) < 2 {
				fmt.Printf("DEBUG: Invalid social_id format: %s\n", socialID)
				http.Error(w, "Invalid Mastodon account data", http.StatusInternalServerError)
				return
			}
			instanceURL = parts[0]
			if !strings.HasPrefix(instanceURL, "http://") && !strings.HasPrefix(instanceURL, "https://") {
				instanceURL = "https://" + instanceURL
			}
		}
		fmt.Printf("DEBUG: Instance URL: %s\n", instanceURL)

		if tokenExpiry != nil && time.Now().After(*tokenExpiry) {
			fmt.Printf("DEBUG: Token expired\n")
			http.Error(w, "Mastodon access token has expired. Please reconnect your account.", http.StatusUnauthorized)
			return
		}

		// Handle media uploads
		var mediaIDs []string
		var mediaFileNames []string

		if strings.Contains(contentType, "multipart/form-data") {
			files := r.MultipartForm.File["images"]
			if len(files) > 0 {
				fmt.Printf("DEBUG: Processing %d media files\n", len(files))

				if len(files) > 4 {
					fmt.Printf("DEBUG: Too many media files: %d (max 4)\n", len(files))
					http.Error(w, "Maximum 4 images/videos allowed per post", http.StatusBadRequest)
					return
				}

				for i, fileHeader := range files {
					fmt.Printf("DEBUG: Processing media %d: %s\n", i+1, fileHeader.Filename)

					if !isValidImageFile(fileHeader.Filename) && !isValidVideoFile(fileHeader.Filename) {
						fmt.Printf("DEBUG: Invalid media file: %s\n", fileHeader.Filename)
						http.Error(w, "Invalid media file format. Supported images: jpg,jpeg,png,gif,webp and videos: mp4,mov,avi,mkv,wmv,flv,webm", http.StatusBadRequest)
						return
					}

					file, err := fileHeader.Open()
					if err != nil {
						fmt.Printf("DEBUG: Error opening file: %v\n", err)
						http.Error(w, "Failed to process media", http.StatusInternalServerError)
						return
					}
					defer file.Close()

					cloudinaryURL, err := lib.UploadToCloudinary(file, "mastodon-images", fileHeader.Filename)
					if err != nil {
						fmt.Printf("DEBUG: Error uploading to Cloudinary: %v\n", err)
						http.Error(w, "Failed to upload media", http.StatusInternalServerError)
						return
					}
					fmt.Printf("DEBUG: Media uploaded to Cloudinary: %s\n", cloudinaryURL)

					mediaID, err := uploadImageToMastodon(instanceURL, accessToken, cloudinaryURL, fileHeader.Filename)
					if err != nil {
						fmt.Printf("DEBUG: Error uploading to Mastodon: %v\n", err)
						http.Error(w, "Failed to upload media to Mastodon", http.StatusInternalServerError)
						return
					}
					fmt.Printf("DEBUG: Media uploaded to Mastodon, media ID: %s\n", mediaID)
					mediaIDs = append(mediaIDs, mediaID)
					mediaFileNames = append(mediaFileNames, fileHeader.Filename)
				}
			}
		}

		// If any video present, only keep first video media ID, remove others (Mastodon disallows mixing images and videos)
		hasVideo := false
		var videoMediaID string
		for i, fname := range mediaFileNames {
			if isValidVideoFile(fname) {
				hasVideo = true
				videoMediaID = mediaIDs[i]
				break
			}
		}
		if hasVideo {
			mediaIDs = []string{}
			if videoMediaID != "" {
				mediaIDs = append(mediaIDs, videoMediaID)
			}
		}

		tootPayload := map[string]interface{}{
			"status":     message,
			"visibility": visibility,
		}
		if len(mediaIDs) > 0 {
			tootPayload["media_ids"] = mediaIDs
		}

		payloadBytes, err := json.Marshal(tootPayload)
		if err != nil {
			fmt.Printf("DEBUG: Error marshaling payload: %v\n", err)
			http.Error(w, "Failed to prepare toot payload", http.StatusInternalServerError)
			return
		}
		fmt.Printf("DEBUG: Payload prepared: %s\n", string(payloadBytes))

		tootURL := instanceURL + "/api/v1/statuses"
		fmt.Printf("DEBUG: Making request to: %s\n", tootURL)
		req_mastodon, err := http.NewRequest("POST", tootURL, bytes.NewBuffer(payloadBytes))
		if err != nil {
			fmt.Printf("DEBUG: Error creating request: %v\n", err)
			http.Error(w, "Failed to create request", http.StatusInternalServerError)
			return
		}

		req_mastodon.Header.Set("Content-Type", "application/json")
		req_mastodon.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

		client := &http.Client{Timeout: 30 * time.Second}

		fmt.Printf("DEBUG: Sending request to Mastodon API\n")
		resp, err := client.Do(req_mastodon)
		if err != nil {
			fmt.Printf("DEBUG: Error making request to Mastodon: %v\n", err)
			http.Error(w, "Failed to publish toot", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		fmt.Printf("DEBUG: Mastodon API response status: %d\n", resp.StatusCode)

		if resp.StatusCode == http.StatusOK {
			fmt.Printf("DEBUG: Success! Toot posted successfully\n")
			var mastodonResp MastodonPostResponse
			if err := json.NewDecoder(resp.Body).Decode(&mastodonResp); err != nil {
				w.WriteHeader(http.StatusOK)
				w.Write([]byte("Toot published successfully"))
				return
			}

			response := map[string]interface{}{
				"message":    "Toot published successfully",
				"tootId":     mastodonResp.ID,
				"content":    mastodonResp.Content,
				"url":        mastodonResp.URL,
				"visibility": mastodonResp.Visibility,
				"createdAt":  mastodonResp.CreatedAt,
				"mediaCount": len(mastodonResp.MediaAttachments),
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(response)
			return
		}

		fmt.Printf("DEBUG: Mastodon API returned error status: %d\n", resp.StatusCode)
		var errorResp MastodonErrorResponse
		if err := json.NewDecoder(resp.Body).Decode(&errorResp); err != nil {
			fmt.Printf("DEBUG: Error decoding error response: %v\n", err)
			http.Error(w, fmt.Sprintf("Mastodon API error (status: %d)", resp.StatusCode), resp.StatusCode)
			return
		}

		if errorResp.Error != "" {
			errorMsg := errorResp.Error
			if errorResp.ErrorDescription != "" {
				errorMsg = errorResp.ErrorDescription
			}
			fmt.Printf("DEBUG: Mastodon API error: %s\n", errorMsg)
			http.Error(w, fmt.Sprintf("Mastodon API error: %s", errorMsg), resp.StatusCode)
			return
		}

		fmt.Printf("DEBUG: Unknown Mastodon API error\n")
		http.Error(w, "Unknown Mastodon API error", resp.StatusCode)
	}
}

// uploadImageToMastodon uploads an image/video to Mastodon and returns the media ID
func uploadImageToMastodon(instanceURL, accessToken, imageURL, filename string) (string, error) {
	resp, err := http.Get(imageURL)
	if err != nil {
		return "", fmt.Errorf("failed to download media from Cloudinary: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to download media from Cloudinary: status %d", resp.StatusCode)
	}

	var b bytes.Buffer
	writer := multipart.NewWriter(&b)

	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		return "", err
	}

	_, err = io.Copy(part, resp.Body)
	if err != nil {
		return "", err
	}

	if filename != "" {
		descField, err := writer.CreateFormField("description")
		if err != nil {
			return "", err
		}
		descField.Write([]byte(filename))
	}

	writer.Close()

	mediaURL := instanceURL + "/api/v1/media"
	req, err := http.NewRequest("POST", mediaURL, &b)
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	client := &http.Client{Timeout: 30 * time.Second}
	resp_media, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp_media.Body.Close()

	if resp_media.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp_media.Body)
		return "", fmt.Errorf("mastodon media upload failed: %s", string(body))
	}

	var mediaResp MastodonMediaResponse
	if err := json.NewDecoder(resp_media.Body).Decode(&mediaResp); err != nil {
		return "", err
	}

	return mediaResp.ID, nil
}

// isValidImageFile checks if the file has a valid image extension
func isValidImageFile(filename string) bool {
	ext := strings.ToLower(filename)
	return strings.HasSuffix(ext, ".jpg") ||
		strings.HasSuffix(ext, ".jpeg") ||
		strings.HasSuffix(ext, ".png") ||
		strings.HasSuffix(ext, ".gif") ||
		strings.HasSuffix(ext, ".webp")
}

// isValidVideoFile checks if the file has a valid video extension
// func isValidVideoFile(filename string) bool {
// 	ext := strings.ToLower(filename)
// 	return strings.HasSuffix(ext, ".mp4") ||
// 		strings.HasSuffix(ext, ".mov") ||
// 		strings.HasSuffix(ext, ".avi") ||
// 		strings.HasSuffix(ext, ".mkv") ||
// 		strings.HasSuffix(ext, ".wmv") ||
// 		strings.HasSuffix(ext, ".flv") ||
// 		strings.HasSuffix(ext, ".webm")
// }
