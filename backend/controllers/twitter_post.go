package controllers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"social-sync-backend/middleware"
)

// refreshTwitterToken uses the refresh token to get a new access token
func refreshTwitterToken(refreshToken string) (string, error) {
	clientID := os.Getenv("TWITTER_CLIENT_ID")
	clientSecret := os.Getenv("TWITTER_CLIENT_SECRET")

	if clientID == "" || clientSecret == "" {
		return "", fmt.Errorf("missing Twitter OAuth credentials")
	}

	// Prepare refresh token request
	data := url.Values{}
	data.Set("grant_type", "refresh_token")
	data.Set("refresh_token", refreshToken)
	data.Set("client_id", clientID)

	req, err := http.NewRequest("POST", "https://api.twitter.com/2/oauth2/token", strings.NewReader(data.Encode()))
	if err != nil {
		return "", fmt.Errorf("failed to create refresh request: %v", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.SetBasicAuth(clientID, clientSecret)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("refresh request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("Twitter refresh failed with status %d: %s", resp.StatusCode, string(body))
	}

	var tokenResponse struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		ExpiresIn    int    `json:"expires_in"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&tokenResponse); err != nil {
		return "", fmt.Errorf("failed to decode refresh response: %v", err)
	}

	if tokenResponse.AccessToken == "" {
		return "", fmt.Errorf("received empty access token from Twitter")
	}

	return tokenResponse.AccessToken, nil
}

type TwitterPostRequest struct {
	Message string `json:"message"`
}

type TwitterPostResponse struct {
	Data struct {
		ID   string `json:"id"`
		Text string `json:"text"`
	} `json:"data"`
}

type TwitterErrorResponse struct {
	Errors []struct {
		Message string `json:"message"`
		Code    int    `json:"code"`
	} `json:"errors"`
}

func PostToTwitterHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "Unauthorized: User not authenticated", http.StatusUnauthorized)
			return
		}

		var req TwitterPostRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Validate message
		message := strings.TrimSpace(req.Message)
		if message == "" {
			http.Error(w, "Message cannot be empty", http.StatusBadRequest)
			return
		}

		// Check Twitter character limit (280 characters)
		if len(message) > 280 {
			http.Error(w, "Message exceeds Twitter's 280 character limit", http.StatusBadRequest)
			return
		}

		// Get Twitter account details
		var accessToken string
		var tokenExpiry *time.Time
		var refreshToken *string

		err = db.QueryRow(`
			SELECT access_token, access_token_expires_at, refresh_token
			FROM social_accounts
			WHERE user_id = $1 AND platform = 'twitter'
		`, userID).Scan(&accessToken, &tokenExpiry, &refreshToken)

		if err != nil {
			if err == sql.ErrNoRows {
				http.Error(w, "Twitter account not connected", http.StatusBadRequest)
				return
			}
			http.Error(w, "Failed to retrieve Twitter account", http.StatusInternalServerError)
			return
		}

		// Debug: Print the access token (first 10 chars for privacy)
		fmt.Printf("DEBUG: Twitter access token (first 10 chars): %s\n", accessToken[:10])
		fmt.Printf("DEBUG: Twitter message content: %q\n", message)

		// Check if token is expired (if expiry is set)
		if tokenExpiry != nil && time.Now().After(*tokenExpiry) {
			if refreshToken != nil && *refreshToken != "" {
				// Try to refresh the token
				newAccessToken, refreshErr := refreshTwitterToken(*refreshToken)
				if refreshErr != nil {
					// Return structured error for frontend
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusUnauthorized)
					json.NewEncoder(w).Encode(map[string]interface{}{
						"error":       "Your Twitter connection has expired. Please reconnect your Twitter account to continue posting.",
						"userMessage": "Your Twitter connection has expired. Please reconnect your Twitter account to continue posting.",
						"type":        "AUTH_EXPIRED",
						"action":      "RECONNECT_REQUIRED",
					})
					return
				}

				// Update token in database
				_, updateErr := db.Exec(`
					UPDATE social_accounts 
					SET access_token = $1, access_token_expires_at = $2, last_synced_at = $3
					WHERE user_id = $4 AND platform = 'twitter'
				`, newAccessToken, time.Now().Add(2*time.Hour), time.Now(), userID)
				if updateErr != nil {
					http.Error(w, "Failed to update access token", http.StatusInternalServerError)
					return
				}

				// Use the new token for the request
				accessToken = newAccessToken
				fmt.Printf("DEBUG: Twitter token refreshed successfully\n")
			} else {
				// No refresh token available
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]interface{}{
					"error":       "Your Twitter connection has expired. Please reconnect your Twitter account to continue posting.",
					"userMessage": "Your Twitter connection has expired. Please reconnect your Twitter account to continue posting.",
					"type":        "AUTH_EXPIRED",
					"action":      "RECONNECT_REQUIRED",
				})
				return
			}
		}

		// Prepare tweet payload
		tweetPayload := map[string]interface{}{
			"text": message,
		}

		payloadBytes, err := json.Marshal(tweetPayload)
		if err != nil {
			http.Error(w, "Failed to prepare tweet payload", http.StatusInternalServerError)
			return
		}

		// Debug: Print the payload being sent
		fmt.Printf("DEBUG: Twitter payload: %s\n", string(payloadBytes))

		// Create HTTP request to Twitter API
		tweetURL := "https://api.twitter.com/2/tweets"
		req_twitter, err := http.NewRequest("POST", tweetURL, bytes.NewBuffer(payloadBytes))
		if err != nil {
			http.Error(w, "Failed to create request", http.StatusInternalServerError)
			return
		}

		// Set headers - Use OAuth 2.0 Bearer token
		req_twitter.Header.Set("Content-Type", "application/json")
		req_twitter.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
		req_twitter.Header.Set("User-Agent", "SocialSync/1.0")
		req_twitter.Header.Set("Accept", "application/json")

		// Debug: Print request details
		fmt.Printf("DEBUG: Twitter request URL: %s\n", tweetURL)
		fmt.Printf("DEBUG: Twitter request headers: %v\n", req_twitter.Header)

		// Make the request
		client := &http.Client{
			Timeout: 30 * time.Second,
		}

		// Simple retry mechanism with token refresh for 401 errors
		var resp *http.Response
		for attempt := 1; attempt <= 2; attempt++ {
			resp, err = client.Do(req_twitter)
			if err != nil {
				if attempt == 2 {
					http.Error(w, "Failed to publish tweet", http.StatusInternalServerError)
					return
				}
				time.Sleep(2 * time.Second)
				continue
			}

			// If we get a 401 error and have a refresh token, try to refresh and retry
			if resp.StatusCode == 401 && attempt == 1 && refreshToken != nil && *refreshToken != "" {
				fmt.Printf("DEBUG: Twitter API 401 error, attempting token refresh...\n")
				resp.Body.Close()

				// Try to refresh the token
				newAccessToken, refreshErr := refreshTwitterToken(*refreshToken)
				if refreshErr != nil {
					fmt.Printf("DEBUG: Twitter token refresh failed: %v\n", refreshErr)
					break // Exit retry loop and handle 401 error normally
				}

				// Update token in database
				_, updateErr := db.Exec(`
					UPDATE social_accounts 
					SET access_token = $1, access_token_expires_at = $2, last_synced_at = $3
					WHERE user_id = $4 AND platform = 'twitter'
				`, newAccessToken, time.Now().Add(2*time.Hour), time.Now(), userID)
				if updateErr != nil {
					fmt.Printf("DEBUG: Failed to update Twitter token in database: %v\n", updateErr)
					break
				}

				// Update the request with the new token and retry
				req_twitter.Header.Set("Authorization", "Bearer "+newAccessToken)
				accessToken = newAccessToken
				fmt.Printf("DEBUG: Twitter token refreshed successfully, retrying request...\n")
				time.Sleep(1 * time.Second)
				continue
			}

			// If we get a 500 error, retry once
			if resp.StatusCode == 500 && attempt == 1 {
				fmt.Printf("DEBUG: Twitter API 500 error, retrying...\n")
				resp.Body.Close()
				time.Sleep(2 * time.Second)
				continue
			}

			break
		}
		defer resp.Body.Close()

		// Handle response
		if resp.StatusCode == http.StatusCreated {
			// Success - Tweet posted
			var twitterResp TwitterPostResponse
			if err := json.NewDecoder(resp.Body).Decode(&twitterResp); err != nil {
				// Even if we can't decode response, the tweet was posted successfully
				w.WriteHeader(http.StatusOK)
				w.Write([]byte("Tweet published successfully"))
				return
			}

			// Return success with tweet ID
			response := map[string]interface{}{
				"message": "Tweet published successfully",
				"tweetId": twitterResp.Data.ID,
				"text":    twitterResp.Data.Text,
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(response)
			return
		}

		// Handle errors
		fmt.Printf("DEBUG: Twitter API response status: %d\n", resp.StatusCode)

		// Read the full response body for debugging
		bodyBytes, err := io.ReadAll(resp.Body)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to read response body: %v", err), resp.StatusCode)
			return
		}

		fmt.Printf("DEBUG: Twitter API response body: %s\n", string(bodyBytes))

		// Handle specific error cases
		if resp.StatusCode == 500 {
			// Twitter API internal server error - this is usually temporary
			http.Error(w, "Twitter API is experiencing temporary issues. Please try again in a few minutes.", http.StatusServiceUnavailable)
			return
		}

		if resp.StatusCode == 429 {
			// Rate limiting
			http.Error(w, "Twitter API rate limit exceeded. Please wait a moment before trying again.", http.StatusTooManyRequests)
			return
		}

		if resp.StatusCode == 400 {
			// Check if it's a Cloudflare response
			if strings.Contains(string(bodyBytes), "cloudflare") || strings.Contains(string(bodyBytes), "400 Bad Request") {
				http.Error(w, "Twitter API request was blocked. This might be due to rate limiting or temporary issues. Please try again later.", http.StatusBadRequest)
				return
			}
		}

		// Check for specific error patterns
		if strings.Contains(string(bodyBytes), "The string did not match the expected pattern") {
			// This error often occurs when the text format is invalid
			http.Error(w, "Invalid tweet text format. Please check for special characters or formatting issues.", http.StatusBadRequest)
			return
		}

		var errorResp TwitterErrorResponse
		if err := json.Unmarshal(bodyBytes, &errorResp); err != nil {
			http.Error(w, fmt.Sprintf("Twitter API error (status: %d, body: %s)", resp.StatusCode, string(bodyBytes)), resp.StatusCode)
			return
		}

		// Return specific error message
		if len(errorResp.Errors) > 0 {
			errorMsg := errorResp.Errors[0].Message
			http.Error(w, fmt.Sprintf("Twitter API error: %s", errorMsg), resp.StatusCode)
			return
		}

		http.Error(w, "Unknown Twitter API error", resp.StatusCode)
	}
}

// GetTwitterPostsHandler fetches the user's Twitter posts
func GetTwitterPostsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "Unauthorized: User not authenticated", http.StatusUnauthorized)
			return
		}

		// Get Twitter access token
		var accessToken string
		err = db.QueryRow(`
			SELECT access_token
			FROM social_accounts
			WHERE user_id = $1 AND platform = 'twitter'
		`, userID).Scan(&accessToken)
		if err == sql.ErrNoRows {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error": "Twitter account not connected",
				"needsReconnect": true,
				"message": "Please connect your Twitter account to view tweets.",
			})
			return
		} else if err != nil {
			http.Error(w, "Failed to get Twitter account", http.StatusInternalServerError)
			return
		}

	// First get the user ID and profile info
	userURL := "https://api.twitter.com/2/users/me?user.fields=name,username,verified,profile_image_url"
	req, err := http.NewRequest("GET", userURL, nil)
	if err != nil {
		http.Error(w, "Failed to create Twitter API request", http.StatusInternalServerError)
		return
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "Failed to contact Twitter API", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == 429 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusTooManyRequests)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": "Rate limit exceeded",
			"needsReconnect": false,
			"message": "Twitter API rate limit exceeded. Please try again later.",
		})
		return
	}

	if resp.StatusCode == 401 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":       "Your Twitter connection has expired. Please reconnect your Twitter account to continue posting.",
			"userMessage": "Your Twitter connection has expired. Please reconnect your Twitter account to continue posting.",
			"type":        "AUTH_EXPIRED",
			"action":      "RECONNECT_REQUIRED",
		})
		return
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": "API error",
			"needsReconnect": resp.StatusCode == 403,
			"message": "Failed to fetch Twitter data: " + string(body),
		})
		return
	}

	var userResp struct {
		Data struct {
			ID              string `json:"id"`
			Name            string `json:"name"`
			Username        string `json:"username"`
			Verified        bool   `json:"verified"`
			ProfileImageURL string `json:"profile_image_url"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&userResp); err != nil {
		http.Error(w, "Failed to decode Twitter user response", http.StatusInternalServerError)
		return
	}		// Now fetch user's tweets
		tweetsURL := fmt.Sprintf("https://api.twitter.com/2/users/%s/tweets?max_results=20&tweet.fields=created_at,public_metrics&expansions=attachments.media_keys&media.fields=url,preview_image_url", userResp.Data.ID)
		req, err = http.NewRequest("GET", tweetsURL, nil)
		if err != nil {
			http.Error(w, "Failed to create Twitter tweets request", http.StatusInternalServerError)
			return
		}
		req.Header.Set("Authorization", "Bearer "+accessToken)

		resp, err = client.Do(req)
		if err != nil {
			http.Error(w, "Failed to contact Twitter API for tweets", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode == 429 {
			http.Error(w, "Twitter API rate limit exceeded. Please try again later.", http.StatusTooManyRequests)
			return
		}

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			http.Error(w, "Failed to fetch Twitter tweets: "+string(body), resp.StatusCode)
			return
		}

		var tweetsResp map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&tweetsResp); err != nil {
			http.Error(w, "Failed to decode Twitter tweets response", http.StatusInternalServerError)
			return
		}

		// Add user info to the response
		if tweetsResp["includes"] == nil {
			tweetsResp["includes"] = make(map[string]interface{})
		}
		
		includes := tweetsResp["includes"].(map[string]interface{})
		includes["users"] = []interface{}{userResp.Data}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(tweetsResp)
	}
}
