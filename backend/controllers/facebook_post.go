package controllers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"social-sync-backend/middleware"
)

type FacebookPostRequest struct {
	Message    string   `json:"message"`
	MediaUrls  []string `json:"mediaUrls"`
	AccountIDs []string `json:"accountIds,omitempty"`
	All        bool     `json:"all,omitempty"`
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
			http.Error(w, "Invalid JSON body", http.StatusBadRequest)
			return
		}

		if strings.TrimSpace(req.Message) == "" {
			http.Error(w, "Message cannot be empty", http.StatusBadRequest)
			return
		}

		type fbAccount struct {
			AccessToken string
			PageID      string
		}
		var targets []fbAccount

		// Determine target accounts
		fmt.Printf("DEBUG: Facebook post request - AccountIDs: %v, All: %v, Message: %s\n", req.AccountIDs, req.All, req.Message)
		if len(req.AccountIDs) > 0 {
			for _, id := range req.AccountIDs {
				var at, pid string
				qErr := db.QueryRow(`SELECT COALESCE(access_token_enc, access_token), COALESCE(external_account_id, social_id) FROM social_accounts WHERE user_id=$1 AND id=$2::uuid AND (platform='facebook' OR provider='facebook')`, userID, id).Scan(&at, &pid)
				fmt.Printf("DEBUG: Account ID %s - AccessToken: %s, PageID: %s, Error: %v\n", id, at, pid, qErr)
				if qErr == nil && at != "" && pid != "" {
					targets = append(targets, fbAccount{AccessToken: at, PageID: pid})
				}
			}
		} else if req.All {
			rows, qErr := db.Query(`SELECT COALESCE(access_token_enc, access_token), COALESCE(external_account_id, social_id) FROM social_accounts WHERE user_id=$1 AND (platform='facebook' OR provider='facebook')`, userID)
			if qErr == nil {
				defer rows.Close()
				for rows.Next() {
					var at, pid string
					if scanErr := rows.Scan(&at, &pid); scanErr == nil {
						targets = append(targets, fbAccount{AccessToken: at, PageID: pid})
					}
				}
			}
		} else {
			// Try default, else first any
			var at, pid string
			qErr := db.QueryRow(`SELECT COALESCE(access_token_enc, access_token), COALESCE(external_account_id, social_id) FROM social_accounts WHERE user_id=$1 AND (platform='facebook' OR provider='facebook') AND is_default=true LIMIT 1`, userID).Scan(&at, &pid)
			if qErr != nil {
				qErr = db.QueryRow(`SELECT COALESCE(access_token_enc, access_token), COALESCE(external_account_id, social_id) FROM social_accounts WHERE user_id=$1 AND (platform='facebook' OR provider='facebook') LIMIT 1`, userID).Scan(&at, &pid)
			}
			if qErr == nil && at != "" && pid != "" {
				targets = append(targets, fbAccount{AccessToken: at, PageID: pid})
			}
		}
		fmt.Printf("DEBUG: Total targets found: %d\n", len(targets))
		if len(targets) == 0 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error": "Facebook Page not connected",
			})
			return
		}

		urlEncode := func(s string) string {
			return url.QueryEscape(s)
		}

		// For each target account, perform the post and collect results
		type fbResult struct {
			AccountID string `json:"accountId"`
			OK        bool   `json:"ok"`
			PostID    string `json:"postId,omitempty"`
			Error     string `json:"error,omitempty"`
		}
		var results []fbResult

		// CASE 1: Text only
		if len(req.MediaUrls) == 0 {
			fmt.Printf("DEBUG: Posting text to %d Facebook pages\n", len(targets))
			for _, t := range targets {
				fmt.Printf("DEBUG: Posting to Facebook page %s\n", t.PageID)
				postURL := fmt.Sprintf("https://graph.facebook.com/%s/feed", t.PageID)
				payload := strings.NewReader(fmt.Sprintf("message=%s&access_token=%s", urlEncode(req.Message), urlEncode(t.AccessToken)))
				resp, err := http.Post(postURL, "application/x-www-form-urlencoded", payload)
				if err != nil {
					fmt.Printf("DEBUG: Facebook post error for page %s: %v\n", t.PageID, err)
					results = append(results, fbResult{AccountID: t.PageID, OK: false, Error: err.Error()})
					continue
				}
				body, _ := io.ReadAll(resp.Body)
				resp.Body.Close()
				if resp.StatusCode != http.StatusOK {
					fmt.Printf("DEBUG: Facebook post failed for page %s: %d - %s\n", t.PageID, resp.StatusCode, string(body))
					results = append(results, fbResult{AccountID: t.PageID, OK: false, Error: string(body)})
					continue
				}
				fmt.Printf("DEBUG: Facebook post successful for page %s\n", t.PageID)
				results = append(results, fbResult{AccountID: t.PageID, OK: true, PostID: "fb_post_" + t.PageID + "_" + fmt.Sprintf("%d", time.Now().Unix())})
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{"results": results})
			return
		}

		// Separate images and videos
		var imageUrls, videoUrls []string
		for _, url := range req.MediaUrls {
			if strings.Contains(url, ".mp4") || strings.Contains(url, "/video/") {
				videoUrls = append(videoUrls, url)
			} else {
				imageUrls = append(imageUrls, url)
			}
		}

		// CASE 2: Single video only
		if len(videoUrls) > 0 && len(imageUrls) == 0 {
			if len(videoUrls) > 1 {
				http.Error(w, "Facebook only supports posting one video at a time", http.StatusBadRequest)
				return
			}

			fmt.Printf("DEBUG: Posting video to %d Facebook pages\n", len(targets))
			for _, t := range targets {
				fmt.Printf("DEBUG: Posting video to Facebook page %s\n", t.PageID)
				videoURL := fmt.Sprintf("https://graph.facebook.com/%s/videos", t.PageID)
				payload := strings.NewReader(fmt.Sprintf("file_url=%s&description=%s&access_token=%s",
					urlEncode(videoUrls[0]), urlEncode(req.Message), urlEncode(t.AccessToken)))
				resp, err := http.Post(videoURL, "application/x-www-form-urlencoded", payload)
				if err != nil {
					fmt.Printf("DEBUG: Facebook video post error for page %s: %v\n", t.PageID, err)
					results = append(results, fbResult{AccountID: t.PageID, OK: false, Error: err.Error()})
					continue
				}
				body, _ := io.ReadAll(resp.Body)
				resp.Body.Close()
				if resp.StatusCode != http.StatusOK {
					fmt.Printf("DEBUG: Facebook video post failed for page %s: %d - %s\n", t.PageID, resp.StatusCode, string(body))
					results = append(results, fbResult{AccountID: t.PageID, OK: false, Error: string(body)})
					continue
				}
				fmt.Printf("DEBUG: Facebook video post successful for page %s\n", t.PageID)
				results = append(results, fbResult{AccountID: t.PageID, OK: true, PostID: "fb_post_" + t.PageID + "_" + fmt.Sprintf("%d", time.Now().Unix())})
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{"results": results})
			return
		}

		// CASE 3: Multiple images only
		if len(imageUrls) > 0 && len(videoUrls) == 0 {
			fmt.Printf("DEBUG: Posting images to %d Facebook pages\n", len(targets))

			// For each target page, post images individually
			for _, t := range targets {
				fmt.Printf("DEBUG: Posting images to Facebook page %s\n", t.PageID)

				// If single image, use simple photo endpoint
				if len(imageUrls) == 1 {
					photoURL := fmt.Sprintf("https://graph.facebook.com/%s/photos", t.PageID)
					payload := strings.NewReader(fmt.Sprintf("url=%s&message=%s&access_token=%s",
						urlEncode(imageUrls[0]), urlEncode(req.Message), urlEncode(t.AccessToken)))
					resp, err := http.Post(photoURL, "application/x-www-form-urlencoded", payload)
					if err != nil {
						fmt.Printf("DEBUG: Facebook image post error for page %s: %v\n", t.PageID, err)
						results = append(results, fbResult{AccountID: t.PageID, OK: false, Error: err.Error()})
						continue
					}
					body, _ := io.ReadAll(resp.Body)
					resp.Body.Close()
					if resp.StatusCode != http.StatusOK {
						fmt.Printf("DEBUG: Facebook image post failed for page %s: %d - %s\n", t.PageID, resp.StatusCode, string(body))
						results = append(results, fbResult{AccountID: t.PageID, OK: false, Error: string(body)})
						continue
					}
					fmt.Printf("DEBUG: Facebook image post successful for page %s\n", t.PageID)
					results = append(results, fbResult{AccountID: t.PageID, OK: true, PostID: "fb_post_" + t.PageID + "_" + fmt.Sprintf("%d", time.Now().Unix())})
				} else {
					// Multiple images - use carousel approach for this specific page
					var attachedMediaIDs []string

					// Upload each image to this specific page
					for _, mediaURL := range imageUrls {
						uploadURL := fmt.Sprintf("https://graph.facebook.com/%s/photos?access_token=%s", t.PageID, urlEncode(t.AccessToken))
						payload := fmt.Sprintf("url=%s&published=false", urlEncode(mediaURL))

						resp, err := http.Post(uploadURL, "application/x-www-form-urlencoded", strings.NewReader(payload))
						if err != nil {
							fmt.Printf("DEBUG: Failed to upload image to page %s: %v\n", t.PageID, err)
							results = append(results, fbResult{AccountID: t.PageID, OK: false, Error: err.Error()})
							goto nextTarget
						}
						body, _ := io.ReadAll(resp.Body)
						resp.Body.Close()

						if resp.StatusCode != http.StatusOK {
							fmt.Printf("DEBUG: Image upload failed for page %s: %d - %s\n", t.PageID, resp.StatusCode, string(body))
							results = append(results, fbResult{AccountID: t.PageID, OK: false, Error: string(body)})
							goto nextTarget
						}

						var fbRes struct {
							ID string `json:"id"`
						}
						if err := json.Unmarshal(body, &fbRes); err != nil || fbRes.ID == "" {
							fmt.Printf("DEBUG: Failed to parse media ID for page %s\n", t.PageID)
							results = append(results, fbResult{AccountID: t.PageID, OK: false, Error: "Failed to parse media ID"})
							goto nextTarget
						}
						attachedMediaIDs = append(attachedMediaIDs, fbRes.ID)
					}

					// Post with attached images
					var mediaParams []string
					for i, id := range attachedMediaIDs {
						mediaParams = append(mediaParams, fmt.Sprintf(`attached_media[%d]={"media_fbid":"%s"}`, i, id))
					}

					postURL := fmt.Sprintf("https://graph.facebook.com/%s/feed", t.PageID)
					finalPayload := fmt.Sprintf(
						"message=%s&%s&access_token=%s",
						urlEncode(req.Message),
						strings.Join(mediaParams, "&"),
						urlEncode(t.AccessToken),
					)

					resp, err := http.Post(postURL, "application/x-www-form-urlencoded", strings.NewReader(finalPayload))
					if err != nil {
						fmt.Printf("DEBUG: Facebook carousel post error for page %s: %v\n", t.PageID, err)
						results = append(results, fbResult{AccountID: t.PageID, OK: false, Error: err.Error()})
						continue
					}
					body, _ := io.ReadAll(resp.Body)
					resp.Body.Close()
					if resp.StatusCode != http.StatusOK {
						fmt.Printf("DEBUG: Facebook carousel post failed for page %s: %d - %s\n", t.PageID, resp.StatusCode, string(body))
						results = append(results, fbResult{AccountID: t.PageID, OK: false, Error: string(body)})
						continue
					}
					fmt.Printf("DEBUG: Facebook carousel post successful for page %s\n", t.PageID)
					results = append(results, fbResult{AccountID: t.PageID, OK: true, PostID: "fb_post_" + t.PageID + "_" + fmt.Sprintf("%d", time.Now().Unix())})
				}

			nextTarget:
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{"results": results})
			return
		}

		// CASE 4: Mixed media (images + videos) - post separately
		fmt.Printf("DEBUG: Posting mixed media to %d Facebook pages (separate posts)\n", len(targets))
		for _, t := range targets {
			fmt.Printf("DEBUG: Posting mixed media to Facebook page %s\n", t.PageID)

			// Post images first
			if len(imageUrls) > 0 {
				err := postImagesToFacebookPage(t.PageID, t.AccessToken, req.Message, imageUrls)
				if err != nil {
					fmt.Printf("DEBUG: Facebook images post failed for page %s: %v\n", t.PageID, err)
					results = append(results, fbResult{AccountID: t.PageID, OK: false, Error: fmt.Sprintf("images: %v", err)})
					continue
				}
			}

			// Post videos
			if len(videoUrls) > 0 {
				err := postVideosToFacebookPage(t.PageID, t.AccessToken, req.Message, videoUrls)
				if err != nil {
					fmt.Printf("DEBUG: Facebook videos post failed for page %s: %v\n", t.PageID, err)
					results = append(results, fbResult{AccountID: t.PageID, OK: false, Error: fmt.Sprintf("videos: %v", err)})
					continue
				}
			}

			fmt.Printf("DEBUG: Facebook mixed media post successful for page %s\n", t.PageID)
			results = append(results, fbResult{AccountID: t.PageID, OK: true})
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"results": results})
	}
}

// GetFacebookPostsHandler fetches the user's Facebook Page posts
func GetFacebookPostsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "Unauthorized: User not authenticated", http.StatusUnauthorized)
			return
		}

		// Check for accountId query parameter
		accountID := r.URL.Query().Get("accountId")

		// Get Facebook access token and page ID
		var accessToken, pageID, pageName, pageAvatar string
		var query string
		var args []interface{}

		if accountID != "" {
			// Fetch specific account
			query = `
				SELECT access_token, social_id, profile_name, profile_picture_url
				FROM social_accounts
				WHERE user_id = $1 AND platform = 'facebook' AND id = $2::uuid
			`
			args = []interface{}{userID, accountID}
		} else {
			// Fetch default account
			query = `
				SELECT access_token, social_id, profile_name, profile_picture_url
				FROM social_accounts
				WHERE user_id = $1 AND platform = 'facebook'
				ORDER BY is_default DESC, connected_at DESC
				LIMIT 1
			`
			args = []interface{}{userID}
		}

		err = db.QueryRow(query, args...).Scan(&accessToken, &pageID, &pageName, &pageAvatar)
		if err == sql.ErrNoRows {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error":          "Facebook Page not connected",
				"needsReconnect": true,
				"message":        "Please connect your Facebook Page to view posts.",
			})
			return
		} else if err != nil {
			http.Error(w, "Failed to get Facebook account", http.StatusInternalServerError)
			return
		}

		// Fetch posts from Facebook Graph API
		graphURL := fmt.Sprintf("https://graph.facebook.com/v20.0/%s/posts?fields=message,created_time,full_picture,permalink_url,likes.summary(true),comments.summary(true)&access_token=%s", pageID, accessToken)
		resp, err := http.Get(graphURL)
		if err != nil {
			http.Error(w, "Failed to contact Facebook API", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode == 401 || resp.StatusCode == 403 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error":          "Invalid token",
				"needsReconnect": true,
				"message":        "Your Facebook connection has expired. Please reconnect your account.",
			})
			return
		}
		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(resp.StatusCode)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error":          "API error",
				"needsReconnect": false,
				"message":        "Failed to fetch Facebook posts: " + string(body),
			})
			return
		}
		var fbResp struct {
			Data []map[string]interface{} `json:"data"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&fbResp); err != nil {
			http.Error(w, "Failed to decode Facebook posts", http.StatusInternalServerError)
			return
		}

		// For each post, fetch attachments and add all image URLs
		for i, post := range fbResp.Data {
			postID, ok := post["id"].(string)
			if !ok || postID == "" {
				continue
			}
			attachmentsURL := fmt.Sprintf("https://graph.facebook.com/v20.0/%s/attachments?access_token=%s", postID, accessToken)
			attachResp, err := http.Get(attachmentsURL)
			if err != nil || attachResp.StatusCode != http.StatusOK {
				continue
			}
			var attachData struct {
				Data []struct {
					Type  string `json:"type"`
					Media struct {
						Image struct {
							Src string `json:"src"`
						} `json:"image"`
					} `json:"media"`
					Subattachments struct {
						Data []struct {
							Media struct {
								Image struct {
									Src string `json:"src"`
								} `json:"image"`
							} `json:"media"`
						} `json:"data"`
					} `json:"subattachments"`
				} `json:"data"`
			}
			if err := json.NewDecoder(attachResp.Body).Decode(&attachData); err != nil {
				attachResp.Body.Close()
				continue
			}
			attachResp.Body.Close()
			var images []string
			for _, att := range attachData.Data {
				if att.Type == "photo" && att.Media.Image.Src != "" {
					images = append(images, att.Media.Image.Src)
				}
				// Handle multi-photo (subattachments)
				for _, sub := range att.Subattachments.Data {
					if sub.Media.Image.Src != "" {
						images = append(images, sub.Media.Image.Src)
					}
				}
			}
			fbResp.Data[i]["attachments"] = images
		}

		w.Header().Set("Content-Type", "application/json")

		// Include page info with the response
		response := map[string]interface{}{
			"data": fbResp.Data,
			"pageInfo": map[string]interface{}{
				"name":   pageName,
				"avatar": pageAvatar,
				"id":     pageID,
			},
		}

		json.NewEncoder(w).Encode(response)
	}
}

// postImagesToFacebookPage posts multiple images to a Facebook page
func postImagesToFacebookPage(pageID, accessToken, message string, imageUrls []string) error {
	if len(imageUrls) == 1 {
		// Single image
		imageURL := fmt.Sprintf("https://graph.facebook.com/%s/photos", pageID)
		payload := strings.NewReader(fmt.Sprintf("url=%s&message=%s&access_token=%s",
			urlEncode(imageUrls[0]), urlEncode(message), urlEncode(accessToken)))
		resp, err := http.Post(imageURL, "application/x-www-form-urlencoded", payload)
		if err != nil {
			return err
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return fmt.Errorf("image post failed: %s", string(body))
		}
		return nil
	} else {
		// Multiple images - create carousel
		var attachedMediaIDs []string

		// Upload each image
		for _, mediaURL := range imageUrls {
			uploadURL := fmt.Sprintf("https://graph.facebook.com/%s/photos?access_token=%s", pageID, urlEncode(accessToken))
			payload := fmt.Sprintf("url=%s&published=false", urlEncode(mediaURL))

			resp, err := http.Post(uploadURL, "application/x-www-form-urlencoded", strings.NewReader(payload))
			if err != nil {
				return err
			}
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				return fmt.Errorf("image upload failed: %s", string(body))
			}

			var fbRes struct {
				ID string `json:"id"`
			}
			if err := json.Unmarshal(body, &fbRes); err != nil || fbRes.ID == "" {
				return fmt.Errorf("failed to parse media ID")
			}
			attachedMediaIDs = append(attachedMediaIDs, fbRes.ID)
		}

		// Post with attached images
		var mediaParams []string
		for i, id := range attachedMediaIDs {
			mediaParams = append(mediaParams, fmt.Sprintf(`attached_media[%d]={"media_fbid":"%s"}`, i, id))
		}

		postURL := fmt.Sprintf("https://graph.facebook.com/%s/feed", pageID)
		finalPayload := fmt.Sprintf(
			"message=%s&%s&access_token=%s",
			urlEncode(message),
			strings.Join(mediaParams, "&"),
			urlEncode(accessToken),
		)

		resp, err := http.Post(postURL, "application/x-www-form-urlencoded", strings.NewReader(finalPayload))
		if err != nil {
			return err
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return fmt.Errorf("carousel post failed: %s", string(body))
		}
		return nil
	}
}

// postVideosToFacebookPage posts multiple videos to a Facebook page
func postVideosToFacebookPage(pageID, accessToken, message string, videoUrls []string) error {
	for i, videoURL := range videoUrls {
		// Add video number to message for multiple videos
		postMessage := message
		if len(videoUrls) > 1 {
			postMessage = fmt.Sprintf("%s\n\n[Video %d/%d]", message, i+1, len(videoUrls))
		}

		videoPostURL := fmt.Sprintf("https://graph.facebook.com/%s/videos", pageID)
		payload := strings.NewReader(fmt.Sprintf("file_url=%s&description=%s&access_token=%s",
			urlEncode(videoURL), urlEncode(postMessage), urlEncode(accessToken)))
		resp, err := http.Post(videoPostURL, "application/x-www-form-urlencoded", payload)
		if err != nil {
			return err
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return fmt.Errorf("video post failed: %s", string(body))
		}
	}
	return nil
}

// urlEncode encodes a string for URL parameters
func urlEncode(s string) string {
	return url.QueryEscape(s)
}
