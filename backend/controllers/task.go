package controllers

import (
	"encoding/json"
	"log"
	"net/http"
	"social-sync-backend/lib"
	"social-sync-backend/middleware"
	"social-sync-backend/models"
	"strconv"
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
		CreatorName   *string `json:"creator_name"`
		CreatorAvatar *string `json:"creator_avatar"`
	}

	rows, err := lib.DB.Query(`
		SELECT t.id, t.workspace_id, t.title, t.description, t.status, t.assigned_to, t.created_by, t.due_date, t.created_at, t.updated_at,
		       u.name as creator_name, u.profile_picture as creator_avatar
		FROM tasks t
		LEFT JOIN users u ON t.created_by = u.id
		WHERE t.workspace_id = $1 ORDER BY t.created_at DESC
	`, workspaceID)
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
		err := rows.Scan(&t.ID, &t.WorkspaceID, &t.Title, &t.Description, &t.Status, &t.AssignedTo, &t.CreatedBy, &t.DueDate, &t.CreatedAt, &t.UpdatedAt, &creatorName, &creatorAvatar)
		if err != nil {
			continue
		}
		tasks = append(tasks, TaskWithCreator{
			Task:          t,
			CreatorName:   creatorName,
			CreatorAvatar: creatorAvatar,
		})
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tasks)
}

// UpdateTask updates a task by ID
func UpdateTask(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	workspaceID := vars["workspaceId"]
	taskID := vars["taskId"]

	var req struct {
		Title       *string    `json:"title"`
		Description *string    `json:"description"`
		Status      *string    `json:"status"`
		AssignedTo  *string    `json:"assigned_to"`
		DueDate     *time.Time `json:"due_date"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Only allow updating fields that are present
	setClauses := []string{}
	args := []interface{}{}
	argIdx := 1
	if req.Title != nil {
		setClauses = append(setClauses, "title = $"+itoa(argIdx))
		args = append(args, *req.Title)
		argIdx++
	}
	if req.Description != nil {
		setClauses = append(setClauses, "description = $"+itoa(argIdx))
		args = append(args, *req.Description)
		argIdx++
	}
	if req.Status != nil {
		setClauses = append(setClauses, "status = $"+itoa(argIdx))
		args = append(args, *req.Status)
		argIdx++
	}
	if req.AssignedTo != nil {
		setClauses = append(setClauses, "assigned_to = $"+itoa(argIdx))
		args = append(args, *req.AssignedTo)
		argIdx++
	}
	if req.DueDate != nil {
		setClauses = append(setClauses, "due_date = $"+itoa(argIdx))
		args = append(args, *req.DueDate)
		argIdx++
	}
	setClauses = append(setClauses, "updated_at = $"+itoa(argIdx))
	args = append(args, time.Now())
	argIdx++
	if len(setClauses) == 0 {
		http.Error(w, "No fields to update", http.StatusBadRequest)
		return
	}
	args = append(args, taskID)
	query := "UPDATE tasks SET " + joinClauses(setClauses, ", ") + " WHERE id = $" + itoa(argIdx)
	_, err := lib.DB.Exec(query, args...)
	if err != nil {
		http.Error(w, "Failed to update task", http.StatusInternalServerError)
		return
	}

	msg, _ := json.Marshal(map[string]interface{}{
		"type":    "task_updated",
		"task_id": taskID,
	})
	hub.broadcast(workspaceID, websocket.TextMessage, msg)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Task updated successfully"})
}

// DeleteTask deletes a task by ID
func DeleteTask(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	workspaceID := vars["workspaceId"]
	taskID := vars["taskId"]

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
