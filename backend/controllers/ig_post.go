package controllers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"social-sync-backend/middleware"
)

type InstagramPostRequest struct {
	Caption   string   `json:"caption"`
	MediaUrls []string `json:"mediaUrls"`
}

func PostToInstagramHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "Unauthorized: User not authenticated", http.StatusUnauthorized)
			return
		}

		var req InstagramPostRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON body", http.StatusBadRequest)
			return
		}

		if strings.TrimSpace(req.Caption) == "" {
			http.Error(w, "Caption cannot be empty", http.StatusBadRequest)
			return
		}

		// Get Instagram access token and Instagram user ID from DB
		var accessToken, instagramUserID string
		err = db.QueryRow(`
			SELECT access_token, social_id
			FROM social_accounts
			WHERE user_id = $1 AND platform = 'instagram'`, userID).Scan(&accessToken, &instagramUserID)
		if err != nil {
			http.Error(w, "Instagram account not connected", http.StatusBadRequest)
			return
		}

		// If no media, create a simple caption-only container then publish
		if len(req.MediaUrls) == 0 {
			http.Error(w, "Instagram requires at least one media URL", http.StatusBadRequest)
			return
		}

		mediaContainerIDs := []string{}

		for _, mediaURL := range req.MediaUrls {
			form := url.Values{}

			// Determine media type based on file extension (simple check)
			lower := strings.ToLower(mediaURL)
			isVideo := strings.HasSuffix(lower, ".mp4") || strings.HasSuffix(lower, ".mov") ||
				strings.HasSuffix(lower, ".avi") || strings.HasSuffix(lower, ".mkv")

			if isVideo {
				form.Set("media_type", "VIDEO")
				form.Set("video_url", mediaURL)
			} else {
				form.Set("media_type", "IMAGE")
				form.Set("image_url", mediaURL)
			}

			form.Set("caption", req.Caption)
			form.Set("access_token", accessToken)

			createMediaURL := fmt.Sprintf("https://graph.facebook.com/v16.0/%s/media", instagramUserID)

			resp, err := http.Post(createMediaURL, "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
			if err != nil {
				http.Error(w, "Failed to create Instagram media container", http.StatusInternalServerError)
				return
			}
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				http.Error(w, fmt.Sprintf("Instagram media container creation failed: %s", body), http.StatusInternalServerError)
				return
			}

			var mediaResp struct {
				ID string `json:"id"`
			}
			if err := json.Unmarshal(body, &mediaResp); err != nil || mediaResp.ID == "" {
				http.Error(w, "Failed to parse Instagram media container ID", http.StatusInternalServerError)
				return
			}

			mediaContainerIDs = append(mediaContainerIDs, mediaResp.ID)
		}

		// If multiple media, create a carousel container
		var publishURL string
		var publishForm url.Values

		if len(mediaContainerIDs) == 1 {
			// Single media publish
			publishURL = fmt.Sprintf("https://graph.facebook.com/v16.0/%s/media_publish", instagramUserID)
			publishForm = url.Values{}
			publishForm.Set("creation_id", mediaContainerIDs[0])
			publishForm.Set("access_token", accessToken)
		} else {
			// Carousel (multiple media)
			publishURL = fmt.Sprintf("https://graph.facebook.com/v16.0/%s/media", instagramUserID)
			publishForm = url.Values{}
			publishForm.Set("media_type", "CAROUSEL")
			publishForm.Set("children", strings.Join(mediaContainerIDs, ","))
			publishForm.Set("caption", req.Caption)
			publishForm.Set("access_token", accessToken)

			// Create the carousel container first
			resp, err := http.Post(publishURL, "application/x-www-form-urlencoded", strings.NewReader(publishForm.Encode()))
			if err != nil {
				http.Error(w, "Failed to create Instagram carousel container", http.StatusInternalServerError)
				return
			}
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				http.Error(w, fmt.Sprintf("Instagram carousel container creation failed: %s", body), http.StatusInternalServerError)
				return
			}

			var carouselResp struct {
				ID string `json:"id"`
			}
			if err := json.Unmarshal(body, &carouselResp); err != nil || carouselResp.ID == "" {
				http.Error(w, "Failed to parse Instagram carousel container ID", http.StatusInternalServerError)
				return
			}

			// Now publish the carousel container
			publishURL = fmt.Sprintf("https://graph.facebook.com/v16.0/%s/media_publish", instagramUserID)
			publishForm = url.Values{}
			publishForm.Set("creation_id", carouselResp.ID)
			publishForm.Set("access_token", accessToken)
		}

		// Publish the post
		resp, err := http.Post(publishURL, "application/x-www-form-urlencoded", strings.NewReader(publishForm.Encode()))
		if err != nil {
			http.Error(w, "Failed to publish Instagram post", http.StatusInternalServerError)
			return
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			http.Error(w, fmt.Sprintf("Instagram publish failed: %s", body), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Instagram post published successfully"))
	}
}
