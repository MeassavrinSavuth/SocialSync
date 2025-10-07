package controllers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"social-sync-backend/lib"
	"social-sync-backend/middleware"
	"social-sync-backend/models"
	"social-sync-backend/utils"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

// CreateTask creates a new task in a workspace
func CreateTask(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	vars := mux.Vars(r)
	workspaceID := vars["workspaceId"]

	// Permission: allow explicit task:create or fallback to post:create for editors
	if ok, err := middleware.CheckUserPermission(userID, workspaceID, "task:create"); err != nil {
		http.Error(w, "Failed to verify permissions", http.StatusInternalServerError)
		return
	} else if !ok {
		if ok2, err2 := middleware.CheckUserPermission(userID, workspaceID, models.PermPostCreate); err2 != nil || !ok2 {
			http.Error(w, "You don't have permission to create tasks", http.StatusForbidden)
			return
		}
	}

	var req struct {
		Title       string     `json:"title"`
		Description string     `json:"description"`
		Status      string     `json:"status"`
		AssignedTo  *string    `json:"assigned_to"`
		DueDate     *time.Time `json:"due_date"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	if req.Title == "" {
		http.Error(w, "Title is required", http.StatusBadRequest)
		return
	}
	if req.Status == "" {
		req.Status = "Todo"
	}

	taskID := uuid.NewString()
	now := time.Now()

	// Parse mentions from description
	mentionedTags := utils.ExtractMentionedMedia(req.Description)
	log.Printf("[DEBUG] Task tag mentions: %v", mentionedTags)

	// Debug log
	log.Printf("[DEBUG] Creating task in workspace: %s, assigned_to: %v, created_by: %s, title: %s", workspaceID, req.AssignedTo, userID, req.Title)

	_, err := lib.DB.Exec(`
		INSERT INTO tasks (id, workspace_id, title, description, status, assigned_to, created_by, due_date, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`, taskID, workspaceID, req.Title, req.Description, req.Status, req.AssignedTo, userID, req.DueDate, now, now)
	if err != nil {
		log.Printf("[ERROR] Failed to create task: %v", err)
		http.Error(w, "Failed to create task", http.StatusInternalServerError)
		return
	}

	// After inserting the task, fetch the creator's name and avatar
	var creatorName, creatorAvatar *string
	err = lib.DB.QueryRow(`SELECT name, profile_picture FROM users WHERE id = $1`, userID).Scan(&creatorName, &creatorAvatar)
	if err != nil {
		creatorName = nil
		creatorAvatar = nil
	}

	task := models.Task{
		ID:          taskID,
		WorkspaceID: workspaceID,
		Title:       req.Title,
		Description: req.Description,
		Status:      req.Status,
		AssignedTo:  req.AssignedTo,
		CreatedBy:   userID,
		DueDate:     req.DueDate,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	taskWithCreator := struct {
		models.Task
		CreatorName   *string `json:"creator_name"`
		CreatorAvatar *string `json:"creator_avatar"`
	}{
		Task:          task,
		CreatorName:   creatorName,
		CreatorAvatar: creatorAvatar,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(taskWithCreator)

	msg, _ := json.Marshal(map[string]interface{}{
		"type": "task_created",
		"task": taskWithCreator,
	})
	hub.broadcast(workspaceID, websocket.TextMessage, msg)
}

// ListTasks lists all tasks for a workspace
func ListTasks(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	workspaceID := vars["workspaceId"]

	type TaskWithCreator struct {
		models.Task
		CreatorName         *string `json:"creator_name"`
		CreatorAvatar       *string `json:"creator_avatar"`
		LastUpdatedByName   *string `json:"last_updated_by_name"`
		LastUpdatedByAvatar *string `json:"last_updated_by_avatar"`
		AssigneeName        *string `json:"assignee_name"`
		AssigneeAvatar      *string `json:"assignee_avatar"`
	}

	rows, err := lib.DB.Query(`
		SELECT t.id, t.workspace_id, t.title, t.description, t.status, t.assigned_to, t.created_by, t.last_updated_by, t.due_date, t.created_at, t.updated_at,
			   u.name as creator_name, u.profile_picture as creator_avatar,
			   lu.name as last_updated_by_name, lu.profile_picture as last_updated_by_avatar,
			   au.name as assignee_name, au.profile_picture as assignee_avatar
		FROM tasks t
		LEFT JOIN users u ON t.created_by = u.id
		LEFT JOIN users lu ON t.last_updated_by = lu.id
		LEFT JOIN users au ON t.assigned_to = au.id
		WHERE t.workspace_id = $1 ORDER BY t.created_at DESC
	`, workspaceID)

	log.Printf("[DEBUG] Fetching tasks for workspace %s", workspaceID)
	if err != nil {
		http.Error(w, "Failed to fetch tasks", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	tasks := []TaskWithCreator{}
	for rows.Next() {
		var t models.Task
		var creatorName *string
		var creatorAvatar *string
		var lastUpdatedByName *string
		var lastUpdatedByAvatar *string
		var assigneeName *string
		var assigneeAvatar *string
		err := rows.Scan(
			&t.ID, &t.WorkspaceID, &t.Title, &t.Description, &t.Status, &t.AssignedTo, &t.CreatedBy, &t.LastUpdatedBy, &t.DueDate, &t.CreatedAt, &t.UpdatedAt,
			&creatorName, &creatorAvatar,
			&lastUpdatedByName, &lastUpdatedByAvatar,
			&assigneeName, &assigneeAvatar,
		)
		if err != nil {
			continue
		}

		log.Printf("[DEBUG] Task %s: creator_name=%s, last_updated_by=%s, last_updated_by_name=%s",
			t.ID,
			func() string {
				if creatorName != nil {
					return *creatorName
				}
				return "nil"
			}(),
			func() string {
				if t.LastUpdatedBy != nil {
					return *t.LastUpdatedBy
				}
				return "nil"
			}(),
			func() string {
				if lastUpdatedByName != nil {
					return *lastUpdatedByName
				}
				return "nil"
			}())

		tasks = append(tasks, TaskWithCreator{
			Task:                t,
			CreatorName:         creatorName,
			CreatorAvatar:       creatorAvatar,
			LastUpdatedByName:   lastUpdatedByName,
			LastUpdatedByAvatar: lastUpdatedByAvatar,
			AssigneeName:        assigneeName,
			AssigneeAvatar:      assigneeAvatar,
		})
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tasks)
}

// UpdateTask updates a task by ID
func UpdateTask(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	vars := mux.Vars(r)
	workspaceID := vars["workspaceId"]
	taskID := vars["taskId"]

	log.Printf("[DEBUG] UpdateTask called with userID: %s", userID)

	// Check if user has permission to update tasks
	// Accept either explicit task:update or legacy post:update for backward compatibility
	hasPermission, err := middleware.CheckUserPermission(userID, workspaceID, "task:update")
	if err != nil {
		http.Error(w, "Failed to verify permissions", http.StatusInternalServerError)
		return
	}
	if !hasPermission {
		// Fallback to post:update if task permissions are not populated
		if ok2, err2 := middleware.CheckUserPermission(userID, workspaceID, models.PermPostUpdate); err2 == nil && ok2 {
			// allowed via post:update
		} else {
			http.Error(w, "You don't have permission to update tasks", http.StatusForbidden)
			return
		}
	}

	var reqBody []byte
	reqBody, _ = io.ReadAll(r.Body)
	r.Body = io.NopCloser(strings.NewReader(string(reqBody)))

	var req struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
		Status      *string `json:"status"`
		AssignedTo  *string `json:"assigned_to"`
		DueDate     *string `json:"due_date"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[DEBUG] UpdateTask decode error: %v; body=%s", err, string(reqBody))
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Only allow updating fields that are present
	setClauses := []string{}
	args := []interface{}{}
	argIdx := 1
	if req.Title != nil {
		setClauses = append(setClauses, "title = $"+itoa(argIdx))
		title := strings.TrimSpace(*req.Title)
		args = append(args, title)
		argIdx++
	}
	if req.Description != nil {
		setClauses = append(setClauses, "description = $"+itoa(argIdx))
		desc := strings.TrimSpace(*req.Description)
		if desc == "" {
			args = append(args, nil)
		} else {
			// Parse mentions from description
			mentionedTags := utils.ExtractMentionedMedia(desc)
			log.Printf("[DEBUG] Task update tag mentions: %v", mentionedTags)
			args = append(args, desc)
		}
		argIdx++
	}
	if req.Status != nil {
		setClauses = append(setClauses, "status = $"+itoa(argIdx))
		args = append(args, *req.Status)
		argIdx++
	}
	if req.AssignedTo != nil {
		setClauses = append(setClauses, "assigned_to = $"+itoa(argIdx))
		if strings.TrimSpace(*req.AssignedTo) == "" {
			args = append(args, nil)
		} else {
			args = append(args, *req.AssignedTo)
		}
		argIdx++
	}
	if req.DueDate != nil {
		parsed, perr := time.Parse(time.RFC3339, *req.DueDate)
		if perr != nil {
			// Try date-only format
			if d, perr2 := time.Parse("2006-01-02", *req.DueDate); perr2 == nil {
				parsed = d
			} else {
				log.Printf("[DEBUG] due_date parse failed: %v; value=%s", perr, *req.DueDate)
			}
		}
		setClauses = append(setClauses, "due_date = $"+itoa(argIdx))
		if parsed.IsZero() {
			args = append(args, nil)
		} else {
			args = append(args, parsed)
		}
		argIdx++
	}
	setClauses = append(setClauses, "updated_at = $"+itoa(argIdx))
	args = append(args, time.Now())
	argIdx++
	setClauses = append(setClauses, "last_updated_by = $"+itoa(argIdx))
	args = append(args, userID)
	argIdx++

	log.Printf("[DEBUG] Updating task %s with last_updated_by = %s", taskID, userID)

	// Get the user's name for debugging
	var userName string
	userNameErr := lib.DB.QueryRow("SELECT name FROM users WHERE id = $1", userID).Scan(&userName)
	if userNameErr != nil {
		log.Printf("[DEBUG] Could not fetch user name for ID %s: %v", userID, userNameErr)
	} else {
		log.Printf("[DEBUG] User ID %s corresponds to name: %s", userID, userName)
	}

	// Also check what the current task creator is
	var currentCreatorID, currentCreatorName string
	creatorErr := lib.DB.QueryRow("SELECT created_by FROM tasks WHERE id = $1", taskID).Scan(&currentCreatorID)
	if creatorErr != nil {
		log.Printf("[DEBUG] Could not fetch task creator: %v", creatorErr)
	} else {
		lib.DB.QueryRow("SELECT name FROM users WHERE id = $1", currentCreatorID).Scan(&currentCreatorName)
		log.Printf("[DEBUG] Task creator ID: %s, name: %s", currentCreatorID, currentCreatorName)
	}
	if len(setClauses) == 0 {
		http.Error(w, "No fields to update", http.StatusBadRequest)
		return
	}
	args = append(args, taskID)
	query := "UPDATE tasks SET " + joinClauses(setClauses, ", ") + " WHERE id = $" + itoa(argIdx)
	_, dbErr := lib.DB.Exec(query, args...)
	if dbErr != nil {
		http.Error(w, "Failed to update task", http.StatusInternalServerError)
		return
	}

	// Fetch the updated task with related display fields to broadcast full payload
	type TaskWithCreator struct {
		models.Task
		CreatorName         *string `json:"creator_name"`
		CreatorAvatar       *string `json:"creator_avatar"`
		LastUpdatedByName   *string `json:"last_updated_by_name"`
		LastUpdatedByAvatar *string `json:"last_updated_by_avatar"`
		AssigneeName        *string `json:"assignee_name"`
		AssigneeAvatar      *string `json:"assignee_avatar"`
	}

	var updated TaskWithCreator
	// NOTE: LEFT JOIN on users to enrich payload
	q := `
		SELECT t.id, t.workspace_id, t.title, t.description, t.status, t.assigned_to, t.created_by, t.last_updated_by, t.due_date, t.created_at, t.updated_at,
			   u.name as creator_name, u.profile_picture as creator_avatar,
			   lu.name as last_updated_by_name, lu.profile_picture as last_updated_by_avatar,
			   au.name as assignee_name, au.profile_picture as assignee_avatar
		FROM tasks t
		LEFT JOIN users u  ON t.created_by      = u.id
		LEFT JOIN users lu ON t.last_updated_by = lu.id
		LEFT JOIN users au ON t.assigned_to     = au.id
		WHERE t.id = $1`
	var creatorName, creatorAvatar, lastUpdatedByName, lastUpdatedByAvatar, assigneeName, assigneeAvatar *string
	scanErr := lib.DB.QueryRow(q, taskID).Scan(
		&updated.ID, &updated.WorkspaceID, &updated.Title, &updated.Description, &updated.Status, &updated.AssignedTo, &updated.CreatedBy, &updated.LastUpdatedBy, &updated.DueDate, &updated.CreatedAt, &updated.UpdatedAt,
		&creatorName, &creatorAvatar,
		&lastUpdatedByName, &lastUpdatedByAvatar,
		&assigneeName, &assigneeAvatar,
	)
	if scanErr == nil {
		updated.CreatorName = creatorName
		updated.CreatorAvatar = creatorAvatar
		updated.LastUpdatedByName = lastUpdatedByName
		updated.LastUpdatedByAvatar = lastUpdatedByAvatar
		updated.AssigneeName = assigneeName
		updated.AssigneeAvatar = assigneeAvatar
	}

	payload := map[string]interface{}{
		"type":    "task_updated",
		"task_id": taskID,
	}
	// Include task only if we successfully scanned it
	if scanErr == nil {
		payload["task"] = updated
	}
	msg, _ := json.Marshal(payload)
	hub.broadcast(workspaceID, websocket.TextMessage, msg)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Task updated successfully"})
}

// DeleteTask deletes a task by ID
func DeleteTask(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	vars := mux.Vars(r)
	workspaceID := vars["workspaceId"]
	taskID := vars["taskId"]

	// Permission: allow explicit task:delete or fallback to post:delete for editors
	if ok, err := middleware.CheckUserPermission(userID, workspaceID, "task:delete"); err != nil {
		http.Error(w, "Failed to verify permissions", http.StatusInternalServerError)
		return
	} else if !ok {
		if ok2, err2 := middleware.CheckUserPermission(userID, workspaceID, models.PermPostDelete); err2 != nil || !ok2 {
			http.Error(w, "You don't have permission to delete tasks", http.StatusForbidden)
			return
		}
	}

	_, err := lib.DB.Exec(`DELETE FROM tasks WHERE id = $1`, taskID)
	if err != nil {
		http.Error(w, "Failed to delete task", http.StatusInternalServerError)
		return
	}

	msg, _ := json.Marshal(map[string]interface{}{
		"type":    "task_deleted",
		"task_id": taskID,
	})
	hub.broadcast(workspaceID, websocket.TextMessage, msg)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Task deleted successfully"})
}

// Helper functions for dynamic SQL
func itoa(i int) string {
	return strconv.Itoa(i)
}

func joinClauses(clauses []string, sep string) string {
	result := ""
	for i, c := range clauses {
		if i > 0 {
			result += sep
		}
		result += c
	}
	return result
}
