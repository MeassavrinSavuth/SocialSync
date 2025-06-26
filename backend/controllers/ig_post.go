// controllers/instagram_post.go
package controllers

import (
	// "context"
	"database/sql"
	"fmt"
	"io"
	// "mime/multipart"
	"net/http"
	// "os"
	"strings"
	"encoding/json"  // <--- add this import


	"social-sync-backend/lib"
	"social-sync-backend/middleware"
)

func PostToInstagramHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "Unauthorized: User not authenticated", http.StatusUnauthorized)
			return
		}

		// Parse multipart form with a reasonable maxMemory (e.g. 10 MB)
		err = r.ParseMultipartForm(10 << 20) // 10 MB
		if err != nil {
			http.Error(w, "Failed to parse form data", http.StatusBadRequest)
			return
		}

		// Get caption from form
		caption := r.FormValue("caption")
		if strings.TrimSpace(caption) == "" {
			http.Error(w, "Caption cannot be empty", http.StatusBadRequest)
			return
		}

		// Get image file from form
		file, _, err := r.FormFile("image")
		if err != nil {
			http.Error(w, "Image file is required", http.StatusBadRequest)
			return
		}
		defer file.Close()

		// Upload image to Cloudinary
		publicID := fmt.Sprintf("instagram_post_%s", userID) // Customize as needed
		imageURL, err := lib.UploadToCloudinary(file, "instagram_posts", publicID)
		if err != nil {
			http.Error(w, "Failed to upload image to Cloudinary: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// Get Instagram Page ID and Access Token from DB for this user
		var igAccessToken, igUserID string
		err = db.QueryRow(`
			SELECT access_token, social_id 
			FROM social_accounts 
			WHERE user_id = $1 AND platform = 'instagram'`, userID).Scan(&igAccessToken, &igUserID)
		if err != nil {
			http.Error(w, "Instagram account not connected", http.StatusBadRequest)
			return
		}

		// Step 1: Create Media Container
		createMediaURL := fmt.Sprintf("https://graph.facebook.com/v16.0/%s/media", igUserID)
		mediaParams := fmt.Sprintf(
			"image_url=%s&caption=%s&access_token=%s",
			imageURL,
			urlEncode(caption),
			igAccessToken,
		)

		resp, err := http.Post(createMediaURL, "application/x-www-form-urlencoded", strings.NewReader(mediaParams))
		if err != nil {
			http.Error(w, "Failed to create Instagram media container: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)

		if resp.StatusCode != http.StatusOK {
			http.Error(w, fmt.Sprintf("Instagram API error on media creation: %s", body), http.StatusInternalServerError)
			return
		}

		// Parse media container ID from response JSON
		mediaID, err := parseMediaIDFromResponse(body)
		if err != nil {
			http.Error(w, "Failed to parse media ID from Instagram response", http.StatusInternalServerError)
			return
		}

		// Step 2: Publish Media Container
		publishURL := fmt.Sprintf("https://graph.facebook.com/v16.0/%s/media_publish", igUserID)
		publishParams := fmt.Sprintf(
			"creation_id=%s&access_token=%s",
			mediaID,
			igAccessToken,
		)

		respPublish, err := http.Post(publishURL, "application/x-www-form-urlencoded", strings.NewReader(publishParams))
		if err != nil {
			http.Error(w, "Failed to publish Instagram media: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer respPublish.Body.Close()
		bodyPublish, _ := io.ReadAll(respPublish.Body)

		if respPublish.StatusCode != http.StatusOK {
			http.Error(w, fmt.Sprintf("Instagram API error on media publish: %s", bodyPublish), http.StatusInternalServerError)
			return
		}

		// Success response
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Instagram post published successfully!"))
	}
}

// Helper to parse media ID from Instagram response JSON
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

// Helper to URL-encode parameters
func urlEncode(s string) string {
	return strings.ReplaceAll(strings.ReplaceAll(s, " ", "%20"), "\n", "%0A")
}
