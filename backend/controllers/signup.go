package controllers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"social-sync-backend/lib"
	"social-sync-backend/models"
	"social-sync-backend/utils"
)

// RegisterRequest represents the incoming registration request
type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

// RegisterResponse represents the response after successful registration
type RegisterResponse struct {
	Message string `json:"message"`
	UserID  string `json:"user_id"`
}

// ErrorResponse represents error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

// SignupHandler handles user registration
func SignupHandler(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Content-Type", "application/json")

	// Handle preflight OPTIONS request
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Only allow POST method
	if r.Method != "POST" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   "method_not_allowed",
			Message: "Only POST method is allowed",
		})
		return
	}

	// Parse request body
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   "invalid_json",
			Message: "Invalid JSON format",
		})
		return
	}

	// Validate required fields
	if req.Name == "" || req.Email == "" || req.Password == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   "missing_fields",
			Message: "Name, email, and password are required",
		})
		return
	}

	// Validate password strength (minimum 6 characters)
	if len(req.Password) < 6 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   "weak_password",
			Message: "Password must be at least 6 characters long",
		})
		return
	}

	// Check if user already exists
	var existingUserID string
	checkQuery := "SELECT id FROM users WHERE email = $1"
	err := lib.DB.QueryRow(checkQuery, req.Email).Scan(&existingUserID)
	
	if err == nil {
		// User exists
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   "user_exists",
			Message: "User with this email already exists",
		})
		return
	}

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Error hashing password: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   "server_error",
			Message: "Failed to process password",
		})
		return
	}

	// Generate UUID for user
	userID := uuid.New().String()
	now := time.Now()

	// Create user object
	user := models.User{
		ID:         userID,
		Name:       req.Name,
		Email:      req.Email,
		Password:   string(hashedPassword),
		CreatedAt:  now,
		UpdatedAt:  now,
		IsVerified: false,
		IsActive:   true,
	}

	// Insert user into database
	insertQuery := `
		INSERT INTO users (id, name, email, password, created_at, updated_at, is_verified, is_active) 
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	
	_, err = lib.DB.Exec(insertQuery, user.ID, user.Name, user.Email, user.Password, user.CreatedAt, user.UpdatedAt, user.IsVerified, user.IsActive)
	if err != nil {
		log.Printf("Error inserting user: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   "database_error",
			Message: "Failed to create user account",
		})
		return
	}
	
	// Generate email verification token
	token, err := utils.GenerateVerificationToken()
	if err != nil {
		log.Printf("Error generating verification token: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   "token_generation_error",
			Message: "Failed to generate verification token",
		})
		return
	}

	// Insert token into the email_verification_tokens table
	insertTokenQuery := `
		INSERT INTO email_verifications (user_id, token, expires_at, created_at)
		VALUES ($1, $2, $3, $4)
	`
	expiresAt := now.Add(24 * time.Hour)
	_, err = lib.DB.Exec(insertTokenQuery, user.ID, token, expiresAt, now)
	if err != nil {
		log.Printf("Error saving verification token: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   "database_error",
			Message: "Failed to store verification token",
		})
		return
	}

	// Send verification email
	err = utils.SendVerificationEmail(user.Email, token)
	if err != nil {
		log.Printf("Failed to store verification token for user %s: %v", user.ID, err)

		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   "email_send_error",
			Message: "Failed to send verification email",
		})
		return
	}



	// Return success response
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(RegisterResponse{
		Message: "User registered successfully",
		UserID:  userID,
	})

	log.Printf("User registered successfully: %s (ID: %s)", req.Email, userID)
}