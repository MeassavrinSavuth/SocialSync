package controllers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"social-sync-backend/middleware"

	"github.com/gorilla/mux"
)

// GetSocialAccountsHandler fetches all social accounts linked to the authenticated user.
func GetSocialAccountsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		appUserIDVal := ctx.Value(middleware.UserIDKey)
		appUserID, ok := appUserIDVal.(string)
		if !ok || appUserID == "" {
			log.Println("ERROR: Unauthorized access to GetSocialAccountsHandler: User ID not found in context.")
			http.Error(w, "Unauthorized: User not authenticated.", http.StatusUnauthorized)
			return
		}

		rows, err := db.QueryContext(ctx, `
            SELECT id, COALESCE(provider, platform) AS provider, COALESCE(display_name, profile_name) AS display_name,
                   COALESCE(avatar, profile_picture_url) AS avatar, COALESCE(external_account_id, social_id) AS external_id,
                   is_default, status
            FROM social_accounts
            WHERE user_id = $1
            ORDER BY provider, display_name
        `, appUserID)
		if err != nil {
			log.Printf("ERROR: Failed to fetch social accounts for user %s: %v", appUserID, err)
			http.Error(w, "Internal server error: Could not fetch social accounts.", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type SocialAccountResponse struct {
			ID          string  `json:"id"`
			Provider    string  `json:"provider"`
			ExternalID  string  `json:"externalId"`
			DisplayName *string `json:"displayName"`
			Avatar      *string `json:"avatar"`
			IsDefault   bool    `json:"isDefault"`
			Status      *string `json:"status"`
			// Back-compat fields
			Platform          string  `json:"platform"`
			SocialID          string  `json:"socialId"`
			ProfilePictureURL *string `json:"profilePictureUrl"`
			ProfileName       *string `json:"profileName"`
		}
		var accounts []SocialAccountResponse

		for rows.Next() {
			var acc SocialAccountResponse
			if err := rows.Scan(&acc.ID, &acc.Provider, &acc.DisplayName, &acc.Avatar, &acc.ExternalID, &acc.IsDefault, &acc.Status); err != nil {
				log.Printf("ERROR: Error scanning social account row for user %s: %v", appUserID, err)
				http.Error(w, "Internal server error: Error scanning data.", http.StatusInternalServerError)
				return
			}
			// Fill legacy fields for UI back-compat
			acc.Platform = acc.Provider
			acc.ProfilePictureURL = acc.Avatar
			acc.ProfileName = acc.DisplayName
			acc.SocialID = acc.ExternalID
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

// DisconnectSocialAccountHandler unlinks a social media account for the authenticated user.
func DisconnectSocialAccountHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		appUserIDVal := ctx.Value(middleware.UserIDKey)
		appUserID, ok := appUserIDVal.(string)
		if !ok || appUserID == "" {
			log.Println("ERROR: Unauthorized access to DisconnectSocialAccountHandler: User ID not found in context.")
			http.Error(w, "Unauthorized: User not authenticated.", http.StatusUnauthorized)
			return
		}

		vars := mux.Vars(r)
		accountID := vars["accountId"]
		if accountID == "" {
			log.Println("ERROR: accountId missing in request URL.")
			http.Error(w, "Bad request: Missing accountId.", http.StatusBadRequest)
			return
		}

		log.Printf("DEBUG: Disconnecting social account '%s' for user %s", accountID, appUserID)

		result, err := db.ExecContext(ctx, `
            DELETE FROM social_accounts
            WHERE user_id = $1 AND id = $2::uuid
        `, appUserID, accountID)

		if err != nil {
			log.Printf("ERROR: Failed to disconnect account %s for user %s: %v", accountID, appUserID, err)
			http.Error(w, "Internal server error: Failed to disconnect.", http.StatusInternalServerError)
			return
		}

		rowsAffected, err := result.RowsAffected()
		if err != nil {
			log.Printf("ERROR: RowsAffected error: %v", err)
			http.Error(w, "Internal server error.", http.StatusInternalServerError)
			return
		}

		if rowsAffected == 0 {
			log.Printf("INFO: No account %s found for user %s to disconnect.", accountID, appUserID)
			http.Error(w, "No such account connected.", http.StatusNotFound)
			return
		}

		log.Printf("INFO: Successfully disconnected account %s for user %s.", accountID, appUserID)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"message": "Disconnected successfully",
		})
	}
}

// SetDefaultSocialAccountHandler marks one of the user's accounts as default for its provider
func SetDefaultSocialAccountHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		appUserIDVal := ctx.Value(middleware.UserIDKey)
		appUserID, ok := appUserIDVal.(string)
		if !ok || appUserID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		vars := mux.Vars(r)
		accountID := vars["accountId"]
		if accountID == "" {
			http.Error(w, "Missing accountId", http.StatusBadRequest)
			return
		}

		// Determine provider of the selected account
		var provider string
		if err := db.QueryRowContext(ctx, `SELECT COALESCE(provider, platform) FROM social_accounts WHERE id=$1::uuid AND user_id=$2`, accountID, appUserID).Scan(&provider); err != nil {
			http.Error(w, "Account not found", http.StatusNotFound)
			return
		}

		// Clear defaults for this provider, then set this one
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
			return
		}
		defer tx.Rollback()

		if _, err := tx.ExecContext(ctx, `UPDATE social_accounts SET is_default=false WHERE user_id=$1 AND COALESCE(provider, platform)=$2`, appUserID, provider); err != nil {
			http.Error(w, "Failed to clear defaults", http.StatusInternalServerError)
			return
		}
		if _, err := tx.ExecContext(ctx, `UPDATE social_accounts SET is_default=true WHERE user_id=$1 AND id=$2::uuid`, appUserID, accountID); err != nil {
			http.Error(w, "Failed to set default", http.StatusInternalServerError)
			return
		}
		if err := tx.Commit(); err != nil {
			http.Error(w, "Failed to commit", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"ok": true})
	}
}
