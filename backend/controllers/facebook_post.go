// controllers/facebook_post.go
package controllers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"social-sync-backend/middleware"
)

type FacebookPostRequest struct {
	Message string `json:"message"`
}

func PostToFacebookHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "Unauthorized: User not authenticated", http.StatusUnauthorized)
			return
		}

		var req FacebookPostRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		if strings.TrimSpace(req.Message) == "" {
			http.Error(w, "Message cannot be empty", http.StatusBadRequest)
			return
		}

		var accessToken, pageID string
		err = db.QueryRow(`
			SELECT access_token, social_id 
			FROM social_accounts 
			WHERE user_id = $1 AND platform = 'facebook'`, userID).Scan(&accessToken, &pageID)
		if err != nil {
			http.Error(w, "Facebook Page not connected", http.StatusBadRequest)
			return
		}

		postURL := fmt.Sprintf("https://graph.facebook.com/%s/feed", pageID)
		payload := strings.NewReader(fmt.Sprintf("message=%s&access_token=%s", req.Message, accessToken))

		resp, err := http.Post(postURL, "application/x-www-form-urlencoded", payload)
		if err != nil {
			http.Error(w, "Failed to publish post to Facebook", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		body, _ := io.ReadAll(resp.Body)
		if resp.StatusCode != http.StatusOK {
			http.Error(w, fmt.Sprintf("Facebook API error: %s", body), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Post published successfully to Facebook page"))
	}
}
