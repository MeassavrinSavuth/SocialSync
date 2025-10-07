package controllers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"social-sync-backend/lib"
	"social-sync-backend/middleware"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// AddComment adds a comment to a task
func AddComment(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	vars := mux.Vars(r)
	taskID := vars["taskId"]
	workspaceID := vars["workspaceId"]

	log.Printf("[DEBUG] Adding comment - userID: %s, taskID: %s, workspaceID: %s", userID, taskID, workspaceID)
	log.Printf("[DEBUG] All route vars: %+v", vars)

	// Comments can be created by all workspace members - no permission check needed
	log.Printf("[DEBUG] Allowing comment creation for all workspace members")

	var req struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[ERROR] Failed to decode request: %v", err)
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	if req.Content == "" {
		log.Printf("[ERROR] Content is empty")
		http.Error(w, "Content is required", http.StatusBadRequest)
		return
	}

	log.Printf("[DEBUG] Comment content: %s", req.Content)

	commentID := uuid.NewString()
	now := time.Now()

	log.Printf("[DEBUG] Inserting comment with ID: %s", commentID)

	_, dbErr := lib.DB.Exec(`
		INSERT INTO comments (id, task_id, user_id, content, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`, commentID, taskID, userID, req.Content, now)
	if dbErr != nil {
		log.Printf("[ERROR] Failed to add comment to database: %v", dbErr)
		http.Error(w, "Failed to add comment", http.StatusInternalServerError)
		return
	}

	// Fetch user name and email for response
	var userName, userEmail string
	userErr := lib.DB.QueryRow("SELECT name, email FROM users WHERE id = $1", userID).Scan(&userName, &userEmail)
	if userErr != nil {
		userName = ""
		userEmail = ""
	}
	displayName := userName
	if displayName == "" {
		displayName = userEmail
	}
	if displayName == "" {
		displayName = userID
	}

	comment := map[string]interface{}{
		"id":         commentID,
		"task_id":    taskID,
		"user_id":    userID,
		"content":    req.Content,
		"created_at": now,
		"user_name":  displayName,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(comment)
}

// ListComments lists all comments for a task
func ListComments(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	taskID := vars["taskId"]
	workspaceID := vars["workspaceId"]

	log.Printf("[DEBUG] Listing comments for taskID: %s, workspaceID: %s", taskID, workspaceID)
	log.Printf("[DEBUG] All route vars: %+v", vars)

	// Comments are readable by all workspace members - no permission check needed
	log.Printf("[DEBUG] Allowing comment read for all workspace members")

	// Get user name and email
	rows, err := lib.DB.Query(`
		SELECT c.id, c.task_id, c.user_id, c.content, c.created_at, u.name, u.email
		FROM comments c
		LEFT JOIN users u ON c.user_id = u.id
		WHERE c.task_id = $1 
		ORDER BY c.created_at ASC
	`, taskID)
	if err != nil {
		log.Printf("[ERROR] Failed to fetch comments: %v", err)
		http.Error(w, "Failed to fetch comments", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	comments := []map[string]interface{}{}
	for rows.Next() {
		var id, taskID, userID, content, userName, userEmail string
		var createdAt time.Time
		err := rows.Scan(&id, &taskID, &userID, &content, &createdAt, &userName, &userEmail)
		if err != nil {
			log.Printf("[ERROR] Failed to scan comment row: %v", err)
			continue
		}

		// Use name if available, otherwise use email, fallback to user ID
		displayName := userName
		if displayName == "" {
			displayName = userEmail
		}
		if displayName == "" {
			displayName = userID
		}

		comment := map[string]interface{}{
			"id":         id,
			"task_id":    taskID,
			"user_id":    userID,
			"content":    content,
			"created_at": createdAt,
			"user_name":  displayName,
		}
		comments = append(comments, comment)
	}

	log.Printf("[DEBUG] Found %d comments for task %s", len(comments), taskID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comments)
}

// DeleteComment deletes a comment by ID
func DeleteComment(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	vars := mux.Vars(r)
	commentID := vars["commentId"]
	workspaceID := vars["workspaceId"]

	log.Printf("[DEBUG] Deleting comment - userID: %s, commentID: %s, workspaceID: %s", userID, commentID, workspaceID)

	// Check if user is the author of the comment or has admin permission
	var commentAuthorID string
	queryErr := lib.DB.QueryRow("SELECT user_id FROM comments WHERE id = $1", commentID).Scan(&commentAuthorID)
	if queryErr != nil {
		if queryErr == sql.ErrNoRows {
			http.Error(w, "Comment not found", http.StatusNotFound)
		} else {
			http.Error(w, "Failed to find comment", http.StatusInternalServerError)
		}
		return
	}

	// Only allow deletion if user is the comment author
	if userID != commentAuthorID {
		log.Printf("[ERROR] User %s is not the comment author (author: %s)", userID, commentAuthorID)
		http.Error(w, "You can only delete your own comments", http.StatusForbidden)
		return
	}

	_, deleteErr := lib.DB.Exec(`DELETE FROM comments WHERE id = $1`, commentID)
	if deleteErr != nil {
		http.Error(w, "Failed to delete comment", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Comment deleted successfully"})
}
