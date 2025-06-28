package controllers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	// "mime/multipart"
	"net/http"
	"strings"

	"social-sync-backend/lib"
	"social-sync-backend/middleware"
)

// Request expects multipart form with caption and multiple files named "media"
func PostToInstagramHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "Unauthorized: User not authenticated", http.StatusUnauthorized)
			return
		}

		// Parse multipart form (limit to 20MB)
		err = r.ParseMultipartForm(20 << 20)
		if err != nil {
			http.Error(w, "Failed to parse form data", http.StatusBadRequest)
			return
		}

		caption := r.FormValue("caption")
		if strings.TrimSpace(caption) == "" {
			http.Error(w, "Caption cannot be empty", http.StatusBadRequest)
			return
		}

		// Retrieve media files
		files := r.MultipartForm.File["media"]
		if len(files) == 0 {
			http.Error(w, "At least one media file is required", http.StatusBadRequest)
			return
		}

		// Get Instagram User ID and Access Token from DB
		var igAccessToken, igUserID string
		err = db.QueryRow(`
			SELECT access_token, social_id
			FROM social_accounts
			WHERE user_id = $1 AND platform = 'instagram'`, userID).Scan(&igAccessToken, &igUserID)
		if err != nil {
			http.Error(w, "Instagram account not connected", http.StatusBadRequest)
			return
		}

		// Create media container IDs slice
		var mediaContainerIDs []string

		for idx, fileHeader := range files {
			file, err := fileHeader.Open()
			if err != nil {
				http.Error(w, "Failed to open media file", http.StatusBadRequest)
				return
			}
			defer file.Close()

			// Upload to Cloudinary and get URL
			publicID := fmt.Sprintf("instagram_post_%s_%d", userID, idx)
			mediaURL, err := lib.UploadToCloudinary(file, "instagram_posts", publicID)
			if err != nil {
				http.Error(w, "Failed to upload media: "+err.Error(), http.StatusInternalServerError)
				return
			}

			// Determine media type (image or video)
			mediaType := "image_url"
			if strings.HasPrefix(fileHeader.Header.Get("Content-Type"), "video/") {
				mediaType = "video_url"
			}

			// Create media container for this media
			createMediaURL := fmt.Sprintf("https://graph.facebook.com/v16.0/%s/media", igUserID)
			params := fmt.Sprintf(
				"%s=%s&caption=%s&access_token=%s",
				mediaType,
				mediaURL,
				urlEncode(caption),
				igAccessToken,
			)

			resp, err := http.Post(createMediaURL, "application/x-www-form-urlencoded", strings.NewReader(params))
			if err != nil {
				http.Error(w, "Failed to create media container: "+err.Error(), http.StatusInternalServerError)
				return
			}
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				http.Error(w, fmt.Sprintf("Instagram API error creating media: %s", body), http.StatusInternalServerError)
				return
			}

			mediaID, err := parseMediaIDFromResponse(body)
			if err != nil {
				http.Error(w, "Failed to parse media ID from Instagram response", http.StatusInternalServerError)
				return
			}

			mediaContainerIDs = append(mediaContainerIDs, mediaID)
		}

		// Create carousel container referencing media container IDs
		carouselURL := fmt.Sprintf("https://graph.facebook.com/v16.0/%s/media", igUserID)
		children := strings.Join(mediaContainerIDs, ",")
		carouselParams := fmt.Sprintf(
			"media_type=CAROUSEL&caption=%s&children=%s&access_token=%s",
			urlEncode(caption),
			children,
			igAccessToken,
		)

		respCarousel, err := http.Post(carouselURL, "application/x-www-form-urlencoded", strings.NewReader(carouselParams))
		if err != nil {
			http.Error(w, "Failed to create carousel container: "+err.Error(), http.StatusInternalServerError)
			return
		}
		bodyCarousel, _ := io.ReadAll(respCarousel.Body)
		respCarousel.Body.Close()

		if respCarousel.StatusCode != http.StatusOK {
			http.Error(w, fmt.Sprintf("Instagram API error creating carousel: %s", bodyCarousel), http.StatusInternalServerError)
			return
		}

		carouselID, err := parseMediaIDFromResponse(bodyCarousel)
		if err != nil {
			http.Error(w, "Failed to parse carousel ID", http.StatusInternalServerError)
			return
		}

		// Publish carousel container
		publishURL := fmt.Sprintf("https://graph.facebook.com/v16.0/%s/media_publish", igUserID)
		publishParams := fmt.Sprintf("creation_id=%s&access_token=%s", carouselID, igAccessToken)

		respPublish, err := http.Post(publishURL, "application/x-www-form-urlencoded", strings.NewReader(publishParams))
		if err != nil {
			http.Error(w, "Failed to publish carousel post: "+err.Error(), http.StatusInternalServerError)
			return
		}
		bodyPublish, _ := io.ReadAll(respPublish.Body)
		respPublish.Body.Close()

		if respPublish.StatusCode != http.StatusOK {
			http.Error(w, fmt.Sprintf("Instagram API error publishing carousel: %s", bodyPublish), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Instagram carousel post published successfully!"))
	}
}

// Helper to parse media ID from Instagram API response
func parseMediaIDFromResponse(body []byte) (string, error) {
	type MediaResponse struct {
		ID string `json:"id"`
	}
	var res MediaResponse
	err := json.Unmarshal(body, &res)
	if err != nil || res.ID == "" {
		return "", fmt.Errorf("invalid media ID in response")
	}
	return res.ID, nil
}

// Helper to URL-encode parameters (basic)
func urlEncode(s string) string {
	return strings.ReplaceAll(strings.ReplaceAll(s, " ", "%20"), "\n", "%0A")
}
