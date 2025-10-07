package controllers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"social-sync-backend/lib"
	"social-sync-backend/middleware"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

// DraftAddComment adds a comment to a draft
func DraftAddComment(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	vars := mux.Vars(r)
	draftID := vars["draftId"]
	workspaceID := vars["workspaceId"]

	var req struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Content == "" {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	id := uuid.NewString()
	now := time.Now()
	if _, err := lib.DB.Exec(`
        INSERT INTO draft_comments (id, draft_id, user_id, content, created_at)
        VALUES ($1, $2, $3, $4, $5)
    `, id, draftID, userID, req.Content, now); err != nil {
		log.Printf("draft comment insert failed: %v", err)
		http.Error(w, "Failed to add comment", http.StatusInternalServerError)
		return
	}

	var name, email, avatar sql.NullString
	_ = lib.DB.QueryRow(`SELECT name, email, profile_picture FROM users WHERE id=$1`, userID).Scan(&name, &email, &avatar)
	resp := map[string]interface{}{
		"id":          id,
		"draft_id":    draftID,
		"user_id":     userID,
		"user_name":   firstNonEmpty(name.String, email.String, userID),
		"user_avatar": nullOrDefault(avatar, "/default-avatar.png"),
		"content":     req.Content,
		"created_at":  now,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(resp)

	// Broadcast new comment
	msg, _ := json.Marshal(map[string]interface{}{
		"type":     "draft_comment_added",
		"draft_id": draftID,
		"comment":  resp,
	})
	hub.broadcast(workspaceID, websocket.TextMessage, msg)
}

// DraftListComments lists comments for a draft
func DraftListComments(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	draftID := vars["draftId"]

	rows, err := lib.DB.Query(`
        SELECT c.id, c.user_id, c.content, c.created_at, u.name, u.email, u.profile_picture
        FROM draft_comments c
        LEFT JOIN users u ON u.id = c.user_id
        WHERE c.draft_id = $1
        ORDER BY c.created_at ASC
    `, draftID)
	if err != nil {
		http.Error(w, "Failed to fetch comments", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	out := []map[string]interface{}{}
	for rows.Next() {
		var id, userID, content string
		var createdAt time.Time
		var name, email, avatar sql.NullString
		if err := rows.Scan(&id, &userID, &content, &createdAt, &name, &email, &avatar); err != nil {
			continue
		}
		out = append(out, map[string]interface{}{
			"id":          id,
			"user_id":     userID,
			"content":     content,
			"created_at":  createdAt,
			"user_name":   firstNonEmpty(name.String, email.String, userID),
			"user_avatar": nullOrDefault(avatar, "/default-avatar.png"),
		})
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out)
}

// DraftDeleteComment deletes a draft comment (author only)
func DraftDeleteComment(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	vars := mux.Vars(r)
	commentID := vars["commentId"]
	workspaceID := vars["workspaceId"]

	var authorID string
	if err := lib.DB.QueryRow(`SELECT user_id FROM draft_comments WHERE id=$1`, commentID).Scan(&authorID); err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Comment not found", http.StatusNotFound)
		} else {
			http.Error(w, "Failed to find comment", http.StatusInternalServerError)
		}
		return
	}
	if authorID != userID {
		http.Error(w, "You can only delete your own comments", http.StatusForbidden)
		return
	}
	if _, err := lib.DB.Exec(`DELETE FROM draft_comments WHERE id=$1`, commentID); err != nil {
		http.Error(w, "Failed to delete comment", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)

	// Broadcast deletion
	msg, _ := json.Marshal(map[string]interface{}{
		"type":       "draft_comment_deleted",
		"comment_id": commentID,
	})
	hub.broadcast(workspaceID, websocket.TextMessage, msg)
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

func nullOrDefault(s sql.NullString, def string) string {
	if s.Valid && s.String != "" {
		return s.String
	}
	return def
}
