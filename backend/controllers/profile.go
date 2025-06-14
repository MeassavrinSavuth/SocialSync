package controllers
 
import (
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
    "path/filepath"
    "social-sync-backend/lib"
    "social-sync-backend/middleware"
    "social-sync-backend/models"
)
 
func ProfileHandler(w http.ResponseWriter, r *http.Request) {
    userID := r.Context().Value(middleware.UserIDKey).(string)
 
    // Set response headers
    w.Header().Set("Content-Type", "application/json")
    w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
    w.Header().Set("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS")
    w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
 
    // Handle preflight OPTIONS request
    if r.Method == "OPTIONS" {
        w.WriteHeader(http.StatusOK)
        return
    }
 
    switch r.Method {
    case http.MethodGet:
        // Fetch user profile
        var user models.User
        err := lib.DB.QueryRow(`
            SELECT id, name, email, created_at, updated_at, is_verified, is_active
            FROM users WHERE id = $1
        `, userID).Scan(
            &user.ID,
            &user.Name,
            &user.Email,
            &user.CreatedAt,
            &user.UpdatedAt,
            &user.IsVerified,
            &user.IsActive,
        )
 
        if err != nil {
            fmt.Printf("Error fetching user profile: %v\n", err)
            http.Error(w, "Failed to fetch profile", http.StatusInternalServerError)
            return
        }
 
        // Check if user has a profile image
        // imagePath := filepath.Join("uploads", "profiles", userID+".jpg")
        // if _, err := os.Stat(imagePath); err == nil {
        //     user.ProfileImage = "/api/profile/image/" + userID
        // }
 
        // Log the user data being sent
        fmt.Printf("Sending user data: %+v\n", user)
 
        json.NewEncoder(w).Encode(user)
 
    case http.MethodPut:
        // Update user profile
        var updateData struct {
            Name  string `json:"name,omitempty"`
            Email string `json:"email,omitempty"`
        }
 
        if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
            http.Error(w, "Invalid request body", http.StatusBadRequest)
            return
        }
 
        // Build update query based on provided fields
        query := "UPDATE users SET"
        args := []interface{}{userID}
        argCount := 1
 
        if updateData.Name != "" {
            query += fmt.Sprintf(" name = $%d,", argCount+1)
            args = append(args, updateData.Name)
            argCount++
        }
 
        if updateData.Email != "" {
            query += fmt.Sprintf(" email = $%d,", argCount+1)
            args = append(args, updateData.Email)
            argCount++
        }
 
        // Remove trailing comma and add WHERE clause
        query = query[:len(query)-1] + " WHERE id = $1"
 
        _, err := lib.DB.Exec(query, args...)
        if err != nil {
            http.Error(w, "Failed to update profile", http.StatusInternalServerError)
            return
        }
 
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]string{"message": "Profile updated successfully"})
 
    case http.MethodDelete:
        // Delete user account
        _, err := lib.DB.Exec("DELETE FROM users WHERE id = $1", userID)
        if err != nil {
            http.Error(w, "Failed to delete account", http.StatusInternalServerError)
            return
        }
 
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]string{"message": "Account deleted successfully"})
 
    default:
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
    }
}
 
func ProfileImageHandler(w http.ResponseWriter, r *http.Request) {
    userID := r.Context().Value(middleware.UserIDKey).(string)
 
    switch r.Method {
    case http.MethodPost:
        // Create uploads directory if it doesn't exist
        uploadsDir := filepath.Join("uploads", "profiles")
        if err := os.MkdirAll(uploadsDir, 0755); err != nil {
            http.Error(w, "Failed to create uploads directory", http.StatusInternalServerError)
            return
        }
 
        // Parse multipart form
        err := r.ParseMultipartForm(10 << 20) // 10 MB max
        if err != nil {
            http.Error(w, "Failed to parse form", http.StatusBadRequest)
            return
        }
 
        file, _, err := r.FormFile("profileImage")
        if err != nil {
            http.Error(w, "Failed to get file from form", http.StatusBadRequest)
            return
        }
        defer file.Close()
 
        // Create the file
        imagePath := filepath.Join(uploadsDir, userID+".jpg")
        dst, err := os.Create(imagePath)
        if err != nil {
            http.Error(w, "Failed to create file", http.StatusInternalServerError)
            return
        }
        defer dst.Close()
 
        // Copy the uploaded file to the destination file
        if _, err := io.Copy(dst, file); err != nil {
            http.Error(w, "Failed to save file", http.StatusInternalServerError)
            return
        }
 
        // Return the URL for the uploaded image
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]string{
            "imageUrl": "/api/profile/image/" + userID,
        })
 
    case http.MethodGet:
        // Serve the profile image
        imagePath := filepath.Join("uploads", "profiles", userID+".jpg")
        http.ServeFile(w, r, imagePath)
 
    default:
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
    }
}
 
 