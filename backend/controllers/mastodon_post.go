package controllers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"time"

	"social-sync-backend/middleware"

	"github.com/lib/pq"
)

type MastodonPostRequest struct {
	Status     string   `json:"status"`
	MediaUrls  []string `json:"mediaUrls"`
	AccountIds []string `json:"accountIds"`
}

type MastodonPostResult struct {
	AccountID string `json:"accountId"`
	OK        bool   `json:"ok"`
	PostID    string `json:"postId,omitempty"`
	Error     string `json:"error,omitempty"`
}

func PostToMastodonHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "user not authenticated", http.StatusUnauthorized)
			return
		}
		fmt.Printf("DEBUG: Mastodon post - user ID: %s\n", userID)

		var req MastodonPostRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			fmt.Printf("DEBUG: Mastodon post - failed to parse JSON: %v\n", err)
			http.Error(w, "failed to parse JSON data", http.StatusBadRequest)
			return
		}
		fmt.Printf("DEBUG: Mastodon post request: %+v\n", req)

		if req.Status == "" {
			http.Error(w, "status is required", http.StatusBadRequest)
			return
		}

		// Get Mastodon accounts - try with instance_url first, fallback without it
		rows, err := db.Query(`SELECT id::text, access_token, COALESCE(instance_url, 'https://mastodon.social') as instance_url FROM social_accounts WHERE user_id=$1 AND (platform='mastodon' OR provider='mastodon') AND id = ANY($2::uuid[])`, userID, pq.Array(req.AccountIds))
		if err != nil {
			// Fallback query without instance_url
			rows, err = db.Query(`SELECT id::text, access_token FROM social_accounts WHERE user_id=$1 AND (platform='mastodon' OR provider='mastodon') AND id = ANY($2::uuid[])`, userID, pq.Array(req.AccountIds))
			if err != nil {
				// If no Mastodon accounts found, return friendly error message
				fmt.Printf("DEBUG: No Mastodon accounts found\n")
				http.Error(w, "Mastodon account not connected", http.StatusBadRequest)
				return
			}
		}
		defer rows.Close()

	var results []MastodonPostResult
	hasRows := false
	for rows.Next() {
		hasRows = true
			var id, accessToken, instanceURL string
			if err := rows.Scan(&id, &accessToken, &instanceURL); err != nil {
				// Try scanning without instanceURL
				if err := rows.Scan(&id, &accessToken); err != nil {
					results = append(results, MastodonPostResult{
						AccountID: id,
						OK:        false,
						Error:     "Failed to get account details: " + err.Error(),
					})
					continue
				}
				instanceURL = "https://mastodon.social" // Default instance
			}

			// Post to Mastodon
			fmt.Printf("DEBUG: Posting to Mastodon instance: %s\n", instanceURL)
			postData := map[string]interface{}{
				"status": req.Status,
			}

			// Add media if provided
			if len(req.MediaUrls) > 0 {
				mediaIds := []string{}
				for _, mediaUrl := range req.MediaUrls {
					// Upload media to Mastodon instance
					mediaId, err := uploadMediaToMastodon(instanceURL, accessToken, mediaUrl)
					if err != nil {
						fmt.Printf("DEBUG: Media upload failed for account %s: %v\n", id, err)
						results = append(results, MastodonPostResult{
							AccountID: id,
							OK:        false,
							Error:     "Failed to upload media: " + err.Error(),
						})
						continue
					}
					mediaIds = append(mediaIds, mediaId)
				}
				postData["media_ids"] = mediaIds
			}

			postBody, _ := json.Marshal(postData)
			fmt.Printf("DEBUG: Mastodon post data: %s\n", string(postBody))

			// Create HTTP request with proper headers
			req, err := http.NewRequest("POST", instanceURL+"/api/v1/statuses", bytes.NewBuffer(postBody))
			if err != nil {
				results = append(results, MastodonPostResult{
					AccountID: id,
					OK:        false,
					Error:     "Failed to create request: " + err.Error(),
				})
				continue
			}

			req.Header.Set("Authorization", "Bearer "+accessToken)
			req.Header.Set("Content-Type", "application/json")

			client := &http.Client{Timeout: 30 * time.Second}
			resp, err := client.Do(req)
			if err != nil {
				fmt.Printf("DEBUG: Mastodon request failed for account %s: %v\n", id, err)
				results = append(results, MastodonPostResult{
					AccountID: id,
					OK:        false,
					Error:     "Failed to post to Mastodon: " + err.Error(),
				})
				continue
			}
			defer resp.Body.Close()

			fmt.Printf("DEBUG: Mastodon response status: %d\n", resp.StatusCode)
			if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
				body, _ := io.ReadAll(resp.Body)
				fmt.Printf("DEBUG: Mastodon API error response: %s\n", string(body))
				results = append(results, MastodonPostResult{
					AccountID: id,
					OK:        false,
					Error:     fmt.Sprintf("Mastodon API error: %d %s", resp.StatusCode, string(body)),
				})
				continue
			}

			var postResponse map[string]interface{}
			json.NewDecoder(resp.Body).Decode(&postResponse)
			postID := ""
			if responseID, ok := postResponse["id"].(string); ok {
				postID = responseID
			}

			fmt.Printf("DEBUG: Successfully posted to Mastodon account %s, post ID: %s\n", id, postID)
			results = append(results, MastodonPostResult{
				AccountID: id,
				OK:        true,
				PostID:    postID,
			})
		}

		// Check if no accounts were found
		if !hasRows {
			http.Error(w, "Mastodon account not connected", http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"results": results,
		})
	}
}

func GetMastodonPostsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		fmt.Printf("DEBUG: Mastodon posts handler called - URL: %s, Method: %s\n", r.URL.String(), r.Method)

		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			fmt.Printf("DEBUG: Mastodon posts - user not authenticated: %v\n", err)
			http.Error(w, "user not authenticated", http.StatusUnauthorized)
			return
		}
		fmt.Printf("DEBUG: Mastodon posts - user ID: %s\n", userID)

		// Get account IDs from query parameters
		accountIDs := r.URL.Query()["accountId"]
		fmt.Printf("DEBUG: Mastodon posts - account IDs: %v\n", accountIDs)
		if len(accountIDs) == 0 {
			fmt.Printf("DEBUG: Mastodon posts - no accountId parameter provided\n")
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error":   "accountId parameter is required",
				"message": "Please select an account to fetch posts from",
			})
			return
		}

		// Validate that accountIDs are not empty strings
		validAccountIDs := []string{}
		for _, id := range accountIDs {
			if id != "" {
				validAccountIDs = append(validAccountIDs, id)
			}
		}
		if len(validAccountIDs) == 0 {
			fmt.Printf("DEBUG: Mastodon posts - no valid accountId provided\n")
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error":   "valid accountId parameter is required",
				"message": "Please select a valid account to fetch posts from",
			})
			return
		}
		accountIDs = validAccountIDs

		// Get Mastodon accounts
		query := `SELECT id::text, access_token, COALESCE(instance_url, 'https://mastodon.social') as instance_url, 
			COALESCE(display_name, profile_name) as display_name, COALESCE(avatar, profile_picture_url) as avatar 
			FROM social_accounts 
			WHERE user_id=$1 AND (platform='mastodon' OR provider='mastodon') AND id = ANY($2::uuid[])`

		fmt.Printf("DEBUG: Mastodon posts - querying database for user %s with account IDs: %v\n", userID, accountIDs)
		rows, err := db.Query(query, userID, pq.Array(accountIDs))
		if err != nil {
			fmt.Printf("DEBUG: Mastodon posts - database query failed: %v\n", err)
			http.Error(w, "failed to get Mastodon accounts", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var allPosts []map[string]interface{}
		client := &http.Client{Timeout: 30 * time.Second}

		accountCount := 0
		for rows.Next() {
			accountCount++
			var id, accessToken, instanceURL, displayName, avatar sql.NullString
			if err := rows.Scan(&id, &accessToken, &instanceURL, &displayName, &avatar); err != nil {
				fmt.Printf("DEBUG: Mastodon posts - error scanning row: %v\n", err)
				continue
			}

			fmt.Printf("DEBUG: Mastodon posts - found account %d: ID=%s, Instance=%s, DisplayName=%s\n",
				accountCount, id.String, instanceURL.String, displayName.String)

			// Fetch posts from this Mastodon account
			posts, err := fetchMastodonPosts(client, instanceURL.String, accessToken.String)
			if err != nil {
				fmt.Printf("DEBUG: Error fetching Mastodon posts for account %s: %v\n", id.String, err)
				continue
			}

			fmt.Printf("DEBUG: Mastodon posts - fetched %d posts for account %s\n", len(posts), id.String)

			// Add account metadata to posts
			for _, post := range posts {
				post["_accountId"] = id.String
				post["_accountName"] = displayName.String
				post["_accountAvatar"] = avatar.String
				allPosts = append(allPosts, post)
			}
		}

		fmt.Printf("DEBUG: Mastodon posts - returning %d total posts\n", len(allPosts))
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"posts": allPosts,
		})
	}
}

// fetchMastodonPosts fetches posts from a Mastodon instance
func fetchMastodonPosts(client *http.Client, instanceURL, accessToken string) ([]map[string]interface{}, error) {
	fmt.Printf("DEBUG: fetchMastodonPosts - instanceURL: %s\n", instanceURL)

	// Get current user's account info first
	accountReq, err := http.NewRequest("GET", instanceURL+"/api/v1/accounts/verify_credentials", nil)
	if err != nil {
		return nil, fmt.Errorf("error creating account request: %v", err)
	}
	accountReq.Header.Set("Authorization", "Bearer "+accessToken)

	accountResp, err := client.Do(accountReq)
	if err != nil {
		fmt.Printf("DEBUG: fetchMastodonPosts - error fetching account info: %v\n", err)
		return nil, fmt.Errorf("error fetching account info: %v", err)
	}
	defer accountResp.Body.Close()

	fmt.Printf("DEBUG: fetchMastodonPosts - verify_credentials response status: %d\n", accountResp.StatusCode)
	if accountResp.StatusCode != 200 {
		fmt.Printf("DEBUG: fetchMastodonPosts - failed to verify credentials: %d\n", accountResp.StatusCode)
		return nil, fmt.Errorf("failed to verify credentials: %d", accountResp.StatusCode)
	}

	var accountInfo map[string]interface{}
	if err := json.NewDecoder(accountResp.Body).Decode(&accountInfo); err != nil {
		return nil, fmt.Errorf("error decoding account info: %v", err)
	}

	accountID, ok := accountInfo["id"].(string)
	if !ok {
		return nil, fmt.Errorf("invalid account ID in response")
	}

	// Fetch user's statuses (posts)
	statusesURL := fmt.Sprintf("%s/api/v1/accounts/%s/statuses?limit=40", instanceURL, accountID)
	fmt.Printf("DEBUG: fetchMastodonPosts - fetching statuses from: %s\n", statusesURL)
	req, err := http.NewRequest("GET", statusesURL, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating statuses request: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("DEBUG: fetchMastodonPosts - error fetching statuses: %v\n", err)
		return nil, fmt.Errorf("error fetching statuses: %v", err)
	}
	defer resp.Body.Close()

	fmt.Printf("DEBUG: fetchMastodonPosts - statuses response status: %d\n", resp.StatusCode)
	if resp.StatusCode != 200 {
		fmt.Printf("DEBUG: fetchMastodonPosts - mastodon API returned status %d\n", resp.StatusCode)
		return nil, fmt.Errorf("mastodon API returned status %d", resp.StatusCode)
	}

	var statuses []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&statuses); err != nil {
		return nil, fmt.Errorf("error decoding statuses: %v", err)
	}

	fmt.Printf("DEBUG: fetchMastodonPosts - received %d statuses from API\n", len(statuses))

	// Transform posts to match expected format
	var posts []map[string]interface{}
	for _, status := range statuses {
		post := map[string]interface{}{
			"id":                status["id"],
			"content":           status["content"],
			"created_at":        status["created_at"],
			"favourites_count":  status["favourites_count"],
			"replies_count":     status["replies_count"],
			"reblogs_count":     status["reblogs_count"],
			"url":               status["url"],
			"visibility":        status["visibility"],
			"sensitive":         status["sensitive"],
			"spoiler_text":      status["spoiler_text"],
			"media_attachments": status["media_attachments"],
			"account":           status["account"],
		}
		posts = append(posts, post)
	}

	fmt.Printf("DEBUG: fetchMastodonPosts - returning %d transformed posts\n", len(posts))
	return posts, nil
}

func GetMastodonAnalyticsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "user not authenticated", http.StatusUnauthorized)
			return
		}

		// Mock implementation - return empty analytics for now
		// TODO: Implement real Mastodon analytics
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"analytics": map[string]interface{}{
				"followers":  0,
				"posts":      0,
				"engagement": 0,
			},
		})
	}
}

func uploadMediaToMastodon(instanceURL, accessToken, mediaUrl string) (string, error) {
	// Download media from URL
	resp, err := http.Get(mediaUrl)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	// Upload to Mastodon
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	part, err := writer.CreateFormFile("file", "media")
	if err != nil {
		return "", err
	}

	_, err = io.Copy(part, resp.Body)
	if err != nil {
		return "", err
	}

	writer.Close()

	req, err := http.NewRequest("POST", instanceURL+"/api/v1/media", body)
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err = client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("media upload failed: %d %s", resp.StatusCode, string(body))
	}

	var mediaResponse map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&mediaResponse); err != nil {
		return "", err
	}

	if id, ok := mediaResponse["id"].(string); ok {
		return id, nil
	}

	return "", fmt.Errorf("no media ID in response")
}
