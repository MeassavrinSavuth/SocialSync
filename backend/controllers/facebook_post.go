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

func PostToFacebookHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "Unauthorized: User not authenticated", http.StatusUnauthorized)
			return
		}

		err = r.ParseMultipartForm(20 << 20) // 20MB
		if err != nil {
			http.Error(w, "Failed to parse form", http.StatusBadRequest)
			return
		}

		message := r.FormValue("message")
		if strings.TrimSpace(message) == "" {
			http.Error(w, "Message cannot be empty", http.StatusBadRequest)
			return
		}

		files := r.MultipartForm.File["media"]

		var accessToken, pageID string
		err = db.QueryRow(`
			SELECT access_token, social_id
			FROM social_accounts
			WHERE user_id = $1 AND platform = 'facebook'`, userID).Scan(&accessToken, &pageID)
		if err != nil {
			http.Error(w, "Facebook Page not connected", http.StatusBadRequest)
			return
		}

		// If no media files, post text only
		if len(files) == 0 {
			postURL := fmt.Sprintf("https://graph.facebook.com/%s/feed", pageID)
			payload := strings.NewReader(fmt.Sprintf("message=%s&access_token=%s", message, accessToken))

			resp, err := http.Post(postURL, "application/x-www-form-urlencoded", payload)
			if err != nil {
				http.Error(w, "Failed to publish text post", http.StatusInternalServerError)
				return
			}
			defer resp.Body.Close()

			body, _ := io.ReadAll(resp.Body)
			if resp.StatusCode != http.StatusOK {
				http.Error(w, fmt.Sprintf("Facebook API error: %s", body), http.StatusInternalServerError)
				return
			}

			w.WriteHeader(http.StatusOK)
			w.Write([]byte("Text post published successfully"))
			return
		}

		// Upload files to Cloudinary and get URLs
		var attachedMediaIDs []string
		for _, fileHeader := range files {
			file, err := fileHeader.Open()
			if err != nil {
				http.Error(w, "Failed to open media file", http.StatusBadRequest)
				return
			}
			defer file.Close()

			publicID := fmt.Sprintf("facebook_media_%s_%s", userID, fileHeader.Filename)
			url, err := lib.UploadToCloudinary(file, "facebook_posts", publicID)
			if err != nil {
				http.Error(w, "Cloudinary upload failed: "+err.Error(), http.StatusInternalServerError)
				return
			}

			// Upload to Facebook (image URL)
			createURL := fmt.Sprintf("https://graph.facebook.com/%s/photos?access_token=%s", pageID, accessToken)
			payload := fmt.Sprintf("url=%s&published=false", url)

			resp, err := http.Post(createURL, "application/x-www-form-urlencoded", strings.NewReader(payload))
			if err != nil {
				http.Error(w, "Failed to upload image to Facebook", http.StatusInternalServerError)
				return
			}
			defer resp.Body.Close()

			body, _ := io.ReadAll(resp.Body)
			if resp.StatusCode != http.StatusOK {
				http.Error(w, fmt.Sprintf("Facebook media upload failed: %s", body), http.StatusInternalServerError)
				return
			}

			var fbRes struct {
				ID string `json:"id"`
			}
			if err := json.Unmarshal(body, &fbRes); err != nil || fbRes.ID == "" {
				http.Error(w, "Failed to parse Facebook media ID", http.StatusInternalServerError)
				return
			}

			attachedMediaIDs = append(attachedMediaIDs, fbRes.ID)
		}

		// Build attached_media[i] params
		var mediaParams []string
		for i, id := range attachedMediaIDs {
			mediaParams = append(mediaParams, fmt.Sprintf(`attached_media[%d]={"media_fbid":"%s"}`, i, id))
		}

		finalPayload := fmt.Sprintf("message=%s&%s&access_token=%s",
			urlEncode(message), strings.Join(mediaParams, "&"), accessToken)

		postURL := fmt.Sprintf("https://graph.facebook.com/%s/feed", pageID)
		resp, err := http.Post(postURL, "application/x-www-form-urlencoded", strings.NewReader(finalPayload))
		if err != nil {
			http.Error(w, "Failed to publish post with media", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		// Inside the section where you publish the final post with media
body, _ := io.ReadAll(resp.Body)
if resp.StatusCode != http.StatusOK {
    fmt.Printf("Facebook feed post failed - Status: %d, Response Body: %s\n", resp.StatusCode, body) // Add this line
    http.Error(w, fmt.Sprintf("Facebook feed post failed: %s", body), http.StatusInternalServerError)
    return
}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Post with media published to Facebook page"))
	}
}

// // URL-encodes message string
// func urlEncode(s string) string {
// 	return strings.ReplaceAll(strings.ReplaceAll(s, " ", "%20"), "\n", "%0A")
// }
