package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"social-sync-backend/lib"
	"social-sync-backend/middleware"
	"social-sync-backend/models"
)

// ProfileHandler manages user profile GET, PUT, DELETE.
func ProfileHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)

	// Set CORS headers
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
	w.Header().Set("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	// Handle OPTIONS preflight
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	switch r.Method {
	case http.MethodGet:
		var user models.User
		// Scan profile_picture into pointer
		err := lib.DB.QueryRow(`
            SELECT id, name, email, created_at, updated_at, is_verified, is_active, profile_picture, provider
            FROM users WHERE id = $1
        `, userID).Scan(
			&user.ID,
			&user.Name,
			&user.Email,
			&user.CreatedAt,
			&user.UpdatedAt,
			&user.IsVerified,
			&user.IsActive,
			&user.ProfilePicture,
			&user.Provider,
		)

		if err != nil {
			fmt.Printf("Error fetching profile: %v\n", err)
			http.Error(w, "Failed to fetch profile", http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(user)

	case http.MethodPut:
		var updateData struct {
			Name  string `json:"name,omitempty"`
			Email string `json:"email,omitempty"`
		}

		if r.Body == nil {
			http.Error(w, "Empty request body", http.StatusBadRequest)
			return
		}
		if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
			http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
			return
		}

		query := "UPDATE users SET updated_at = NOW()"
		args := []interface{}{}
		argCount := 1

		if updateData.Name != "" {
			query += fmt.Sprintf(", name = $%d", argCount+1)
			args = append(args, updateData.Name)
			argCount++
		}
		if updateData.Email != "" {
			query += fmt.Sprintf(", email = $%d", argCount+1)
			args = append(args, updateData.Email)
			argCount++
		}

		if argCount == 1 { // No name or email provided
			http.Error(w, "No fields to update", http.StatusBadRequest)
			return
		}

		query += fmt.Sprintf(" WHERE id = $%d", argCount+1)
		args = append(args, userID)

		_, err := lib.DB.Exec(query, args...)
		if err != nil {
			fmt.Printf("Error updating profile: %v\n", err)
			http.Error(w, "Failed to update profile", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "Profile updated"})

	case http.MethodDelete:
		_, err := lib.DB.Exec("DELETE FROM users WHERE id = $1", userID)
		if err != nil {
			fmt.Printf("Error deleting account: %v\n", err)
			http.Error(w, "Failed to delete account", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "Account deleted"})

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// ProfileImageHandler handles POST requests for uploading profile pictures.
func ProfileImageHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	// Handle OPTIONS preflight
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	switch r.Method {
	case http.MethodPost:
		// Parse multipart form (10 MB limit)
		maxMemory := int64(10 << 20)
		if err := r.ParseMultipartForm(maxMemory); err != nil {
			http.Error(w, "Failed to parse form: "+err.Error(), http.StatusBadRequest)
			return
		}

		file, _, err := r.FormFile("profileImage")
		if err != nil {
			http.Error(w, "Failed to get file 'profileImage': "+err.Error(), http.StatusBadRequest)
			return
		}
		defer file.Close()

		// Define Cloudinary folder and public ID
		folderName := "user_profile_pictures"
		imagePublicID := userID + "_main_profile_pic"

		// Call UploadToCloudinary with correct args
		imageURL, err := lib.UploadToCloudinary(file, folderName, imagePublicID)
		if err != nil {
			fmt.Printf("Cloudinary upload error: %v\n", err)
			http.Error(w, "Failed to upload image", http.StatusInternalServerError)
			return
		}

		// Update profile_picture in DB
		_, err = lib.DB.Exec("UPDATE users SET profile_picture = $1 WHERE id = $2", imageURL, userID)
		if err != nil {
			fmt.Printf("Error saving image URL to DB: %v\n", err)
			http.Error(w, "Failed to save image URL", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{
			"message":  "Profile image uploaded",
			"imageUrl": imageURL,
		})

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}