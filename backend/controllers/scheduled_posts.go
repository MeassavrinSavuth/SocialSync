package controllers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"social-sync-backend/middleware"
	"social-sync-backend/models"

	"github.com/gorilla/mux"
	"github.com/lib/pq"
)

// CreateScheduledPostHandler creates a new scheduled post
func CreateScheduledPostHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
			return
		}

		var req models.CreateScheduledPostRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}

		// Validate required fields
		if req.Content == "" {
			http.Error(w, "Content is required", http.StatusBadRequest)
			return
		}

		if len(req.Platforms) == 0 {
			http.Error(w, "At least one platform is required", http.StatusBadRequest)
			return
		}

		// Validate scheduled time is in the future
		if req.ScheduledTime.Before(time.Now()) {
			http.Error(w, "Scheduled time must be in the future", http.StatusBadRequest)
			return
		}

		// Validate platforms
		validPlatforms := map[string]bool{
			"facebook":  true,
			"instagram": true,
			"youtube":   true,
			"twitter":   true,
			"mastodon":  true,
			"telegram":  true,
		}

		for _, platform := range req.Platforms {
			if !validPlatforms[platform] {
				http.Error(w, "Invalid platform: "+platform, http.StatusBadRequest)
				return
			}
		}

		// Insert into database
		query := `
			INSERT INTO scheduled_posts (user_id, content, media_urls, platforms, scheduled_time, status, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			RETURNING id, created_at, updated_at
		`

		var scheduledPost models.ScheduledPost
		now := time.Now()

		err = db.QueryRow(
			query,
			userID,
			req.Content,
			pq.Array(req.MediaURLs),
			pq.Array(req.Platforms),
			req.ScheduledTime,
			models.StatusPending,
			now,
			now,
		).Scan(&scheduledPost.ID, &scheduledPost.CreatedAt, &scheduledPost.UpdatedAt)

		if err != nil {
			http.Error(w, "Failed to create scheduled post: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// Populate the response
		scheduledPost.UserID = userID
		scheduledPost.Content = req.Content
		scheduledPost.MediaURLs = pq.StringArray(req.MediaURLs)
		scheduledPost.Platforms = pq.StringArray(req.Platforms)
		scheduledPost.ScheduledTime = req.ScheduledTime
		scheduledPost.Status = models.StatusPending
		scheduledPost.RetryCount = 0

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(scheduledPost)
	}
}

// GetScheduledPostsHandler retrieves all scheduled posts for a user
func GetScheduledPostsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
			return
		}

		query := `
			SELECT id, user_id, content, media_urls, platforms, scheduled_time, status, retry_count, error_message, created_at, updated_at
			FROM scheduled_posts
			WHERE user_id = $1
			ORDER BY scheduled_time ASC
		`

		rows, err := db.Query(query, userID)
		if err != nil {
			http.Error(w, "Failed to fetch scheduled posts: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var scheduledPosts []models.ScheduledPost

		for rows.Next() {
			var post models.ScheduledPost
			err := rows.Scan(
				&post.ID,
				&post.UserID,
				&post.Content,
				&post.MediaURLs,
				&post.Platforms,
				&post.ScheduledTime,
				&post.Status,
				&post.RetryCount,
				&post.ErrorMessage,
				&post.CreatedAt,
				&post.UpdatedAt,
			)
			if err != nil {
				http.Error(w, "Failed to scan scheduled post: "+err.Error(), http.StatusInternalServerError)
				return
			}
			scheduledPosts = append(scheduledPosts, post)
		}

		if err := rows.Err(); err != nil {
			http.Error(w, "Error iterating scheduled posts: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(scheduledPosts)
	}
}

// GetScheduledPostHandler retrieves a specific scheduled post
func GetScheduledPostHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
			return
		}
		vars := mux.Vars(r)
		var postID int
		postID, err = strconv.Atoi(vars["id"])
		if err != nil {
			http.Error(w, "Invalid post ID", http.StatusBadRequest)
			return
		}

		query := `
			SELECT id, user_id, content, media_urls, platforms, scheduled_time, status, retry_count, error_message, created_at, updated_at
			FROM scheduled_posts
			WHERE id = $1 AND user_id = $2
		`

		var post models.ScheduledPost
		err = db.QueryRow(query, postID, userID).Scan(
			&post.ID,
			&post.UserID,
			&post.Content,
			&post.MediaURLs,
			&post.Platforms,
			&post.ScheduledTime,
			&post.Status,
			&post.RetryCount,
			&post.ErrorMessage,
			&post.CreatedAt,
			&post.UpdatedAt,
		)

		if err == sql.ErrNoRows {
			http.Error(w, "Scheduled post not found", http.StatusNotFound)
			return
		}

		if err != nil {
			http.Error(w, "Failed to fetch scheduled post: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(post)
	}
}

// UpdateScheduledPostHandler updates a scheduled post
func UpdateScheduledPostHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
			return
		}
		vars := mux.Vars(r)
		var postID int
		postID, err = strconv.Atoi(vars["id"])
		if err != nil {
			http.Error(w, "Invalid post ID", http.StatusBadRequest)
			return
		}

		// Check if post exists and belongs to user
		var currentPost models.ScheduledPost
		checkQuery := `
			SELECT id, user_id, content, media_urls, platforms, scheduled_time, status, retry_count, error_message, created_at, updated_at
			FROM scheduled_posts
			WHERE id = $1 AND user_id = $2
		`

		err = db.QueryRow(checkQuery, postID, userID).Scan(
			&currentPost.ID,
			&currentPost.UserID,
			&currentPost.Content,
			&currentPost.MediaURLs,
			&currentPost.Platforms,
			&currentPost.ScheduledTime,
			&currentPost.Status,
			&currentPost.RetryCount,
			&currentPost.ErrorMessage,
			&currentPost.CreatedAt,
			&currentPost.UpdatedAt,
		)

		if err == sql.ErrNoRows {
			http.Error(w, "Scheduled post not found", http.StatusNotFound)
			return
		}

		if err != nil {
			http.Error(w, "Failed to fetch scheduled post: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// Check if post is editable
		if !currentPost.IsEditable() {
			http.Error(w, "Cannot edit scheduled post with status: "+currentPost.Status, http.StatusBadRequest)
			return
		}

		var req models.UpdateScheduledPostRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}

		// Update fields if provided
		if req.Content != nil {
			currentPost.Content = *req.Content
		}

		if req.MediaURLs != nil {
			currentPost.MediaURLs = pq.StringArray(*req.MediaURLs)
		}

		if req.Platforms != nil {
			if len(*req.Platforms) == 0 {
				http.Error(w, "At least one platform is required", http.StatusBadRequest)
				return
			}

			// Validate platforms
			validPlatforms := map[string]bool{
				"facebook":  true,
				"instagram": true,
				"youtube":   true,
				"twitter":   true,
				"mastodon":  true,
			}

			for _, platform := range *req.Platforms {
				if !validPlatforms[platform] {
					http.Error(w, "Invalid platform: "+platform, http.StatusBadRequest)
					return
				}
			}

			currentPost.Platforms = pq.StringArray(*req.Platforms)
		}

		if req.ScheduledTime != nil {
			if req.ScheduledTime.Before(time.Now()) {
				http.Error(w, "Scheduled time must be in the future", http.StatusBadRequest)
				return
			}
			currentPost.ScheduledTime = *req.ScheduledTime
		}

		// Update in database
		updateQuery := `
			UPDATE scheduled_posts
			SET content = $1, media_urls = $2, platforms = $3, scheduled_time = $4, updated_at = $5
			WHERE id = $6 AND user_id = $7
		`

		currentPost.UpdatedAt = time.Now()

		_, err = db.Exec(
			updateQuery,
			currentPost.Content,
			currentPost.MediaURLs,
			currentPost.Platforms,
			currentPost.ScheduledTime,
			currentPost.UpdatedAt,
			postID,
			userID,
		)

		if err != nil {
			http.Error(w, "Failed to update scheduled post: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(currentPost)
	}
}

// DeleteScheduledPostHandler deletes/cancels a scheduled post
func DeleteScheduledPostHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.GetUserIDFromContext(r)
		if err != nil {
			http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
			return
		}
		vars := mux.Vars(r)
		var postID int
		postID, err = strconv.Atoi(vars["id"])
		if err != nil {
			http.Error(w, "Invalid post ID", http.StatusBadRequest)
			return
		}

		// Check if post exists and belongs to user
		var status string
		checkQuery := `
			SELECT status
			FROM scheduled_posts
			WHERE id = $1 AND user_id = $2
		`

		err = db.QueryRow(checkQuery, postID, userID).Scan(&status)

		if err == sql.ErrNoRows {
			http.Error(w, "Scheduled post not found", http.StatusNotFound)
			return
		}

		if err != nil {
			http.Error(w, "Failed to fetch scheduled post: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// Check if post can be deleted
		if status != models.StatusPending && status != models.StatusFailed {
			http.Error(w, "Cannot delete scheduled post with status: "+status, http.StatusBadRequest)
			return
		}

		// Update status to cancelled instead of deleting
		updateQuery := `
			UPDATE scheduled_posts
			SET status = $1, updated_at = $2
			WHERE id = $3 AND user_id = $4
		`

		_, err = db.Exec(updateQuery, models.StatusCancelled, time.Now(), postID, userID)

		if err != nil {
			http.Error(w, "Failed to cancel scheduled post: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "Scheduled post cancelled successfully"})
	}
}