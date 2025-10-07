package controllers

import (
	"encoding/json"
	"net/http"
	"time"

	"social-sync-backend/lib"
	"social-sync-backend/middleware"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

// DraftToggleReaction toggles like on a draft
func DraftToggleReaction(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	vars := mux.Vars(r)
	draftID := vars["draftId"]
	workspaceID := vars["workspaceId"]

	var req struct {
		ReactionType string `json:"reaction_type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ReactionType == "" {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	var existing string
	err := lib.DB.QueryRow(`SELECT id FROM draft_reactions WHERE draft_id=$1 AND user_id=$2 AND reaction_type=$3`, draftID, userID, req.ReactionType).Scan(&existing)
	status := "added"
	if err == nil {
		// exists -> remove
		_, _ = lib.DB.Exec(`DELETE FROM draft_reactions WHERE id=$1`, existing)
		status = "removed"
	} else {
		// add
		id := uuid.NewString()
		_, _ = lib.DB.Exec(`INSERT INTO draft_reactions (id, draft_id, user_id, reaction_type, created_at) VALUES ($1,$2,$3,$4,$5)`,
			id, draftID, userID, req.ReactionType, time.Now())
	}
	// compute counts
	var likes int
	_ = lib.DB.QueryRow(`SELECT COUNT(*) FROM draft_reactions WHERE draft_id=$1 AND reaction_type='thumbsUp'`, draftID).Scan(&likes)

	// broadcast
	msg, _ := json.Marshal(map[string]interface{}{
		"type":      "draft_reaction_changed",
		"draft_id":  draftID,
		"reactions": map[string]int{"thumbsUp": likes},
	})
	hub.broadcast(workspaceID, websocket.TextMessage, msg)

	// respond
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{"thumbsUp": likes, "status": status})
}

// DraftGetReactions returns counts for a draft
func DraftGetReactions(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	draftID := vars["draftId"]
	var likes int
	_ = lib.DB.QueryRow(`SELECT COUNT(*) FROM draft_reactions WHERE draft_id=$1 AND reaction_type='thumbsUp'`, draftID).Scan(&likes)
	_ = json.NewEncoder(w).Encode(map[string]int{"thumbsUp": likes})
}
