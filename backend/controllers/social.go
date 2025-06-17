package controllers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"social-sync-backend/middleware" // Make sure this import path is correct
)

// GetSocialAccountsHandler fetches all social accounts linked to the authenticated user.
func GetSocialAccountsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		// Use the correct context key from middleware
		appUserIDVal := ctx.Value(middleware.UserIDKey)
		appUserID, ok := appUserIDVal.(string)
		if !ok || appUserID == "" {
			log.Println("ERROR: Unauthorized access to GetSocialAccountsHandler: User ID not found in context.")
			http.Error(w, "Unauthorized: User not authenticated.", http.StatusUnauthorized)
			return
		}

		rows, err := db.QueryContext(ctx, `
			SELECT platform, profile_picture_url, profile_name, social_id
			FROM social_accounts
			WHERE user_id = $1
		`, appUserID)
		if err != nil {
			log.Printf("ERROR: Failed to fetch social accounts for user %s: %v", appUserID, err)
			http.Error(w, "Internal server error: Could not fetch social accounts.", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type SocialAccountResponse struct {
			Platform          string  `json:"platform"`
			SocialID          string  `json:"socialId"`
			ProfilePictureURL *string `json:"profilePictureUrl"`
			ProfileName       *string `json:"profileName"`
		}
		var accounts []SocialAccountResponse

		for rows.Next() {
			var acc SocialAccountResponse
			if err := rows.Scan(&acc.Platform, &acc.ProfilePictureURL, &acc.ProfileName, &acc.SocialID); err != nil {
				log.Printf("ERROR: Error scanning social account row for user %s: %v", appUserID, err)
				http.Error(w, "Internal server error: Error scanning data.", http.StatusInternalServerError)
				return
			}
			accounts = append(accounts, acc)
		}

		if err := rows.Err(); err != nil {
			log.Printf("ERROR: Error after iterating through social account rows for user %s: %v", appUserID, err)
			http.Error(w, "Internal server error: Database iteration error.", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(accounts); err != nil {
			log.Printf("ERROR: Failed to encode social accounts to JSON for user %s: %v", appUserID, err)
			http.Error(w, "Internal server error: Could not encode response.", http.StatusInternalServerError)
			return
		}

		log.Printf("INFO: Successfully fetched %d social accounts for user %s.", len(accounts), appUserID)
	}
}
