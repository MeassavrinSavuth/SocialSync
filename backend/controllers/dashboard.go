package controllers

import (
	"fmt"
	"net/http"
	"social-sync-backend/middleware"
)

func DashboardHandler(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserIDFromContext(r)
	if err != nil {
		http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
		return
	}

	fmt.Fprintf(w, "Welcome to your dashboard, user %s!", userID)
}
