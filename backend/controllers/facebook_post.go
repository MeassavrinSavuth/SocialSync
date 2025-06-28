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

type FacebookPostRequest struct {
	Message   string   `json:"message"`
	MediaUrls []string `json:"mediaUrls"`
}

func PostToFacebookHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get user ID from context
		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "Unauthorized: User not authenticated", http.StatusUnauthorized)
			return
		}

		// Parse JSON body
		var req FacebookPostRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON body", http.StatusBadRequest)
			return
		}

		if strings.TrimSpace(req.Message) == "" {
			http.Error(w, "Message cannot be empty", http.StatusBadRequest)
			return
		}

		// Get Facebook access token and page ID from DB
		var accessToken, pageID string
		err = db.QueryRow(`
			SELECT access_token, social_id
			FROM social_accounts
			WHERE user_id = $1 AND platform = 'facebook'`, userID).Scan(&accessToken, &pageID)
		if err != nil {
			http.Error(w, "Facebook Page not connected", http.StatusBadRequest)
			return
		}

		// Helper for URL encoding
		urlEncode := func(s string) string {
			return url.QueryEscape(s)
		}

		// No media: text-only post
		if len(req.MediaUrls) == 0 {
			postURL := fmt.Sprintf("https://graph.facebook.com/%s/feed", pageID)
			payload := strings.NewReader(fmt.Sprintf("message=%s&access_token=%s", urlEncode(req.Message), urlEncode(accessToken)))

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

		// Upload media (unpublished) and collect media IDs
		var attachedMediaIDs []string
		for _, mediaURL := range req.MediaUrls {
			uploadURL := fmt.Sprintf("https://graph.facebook.com/%s/photos?access_token=%s", pageID, urlEncode(accessToken))
			payload := fmt.Sprintf("url=%s&published=false", urlEncode(mediaURL))

			resp, err := http.Post(uploadURL, "application/x-www-form-urlencoded", strings.NewReader(payload))
			if err != nil {
				http.Error(w, "Failed to upload media to Facebook", http.StatusInternalServerError)
				return
			}
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()

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

		// Build attached_media params
		var mediaParams []string
		for i, id := range attachedMediaIDs {
			// Note: Facebook expects attached_media[i] param in JSON string format
			mediaParams = append(mediaParams, fmt.Sprintf(`attached_media[%d]={"media_fbid":"%s"}`, i, id))
		}

		postURL := fmt.Sprintf("https://graph.facebook.com/%s/feed", pageID)
		finalPayload := fmt.Sprintf(
			"message=%s&%s&access_token=%s",
			urlEncode(req.Message),
			strings.Join(mediaParams, "&"),
			urlEncode(accessToken),
		)

		resp, err := http.Post(postURL, "application/x-www-form-urlencoded", strings.NewReader(finalPayload))
		if err != nil {
			http.Error(w, "Failed to publish post with media", http.StatusInternalServerError)
			return
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			http.Error(w, fmt.Sprintf("Facebook post failed: %s", body), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Facebook post with media published successfully"))
	}
}
