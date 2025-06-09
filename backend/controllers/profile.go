package controllers

import (
	"encoding/json"
	"net/http"

	"social-sync-backend/middleware"
)

func ProfileHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)

	json.NewEncoder(w).Encode(map[string]string{
		"message": "Access granted to protected route",
		"user_id": userID,
	})
}
