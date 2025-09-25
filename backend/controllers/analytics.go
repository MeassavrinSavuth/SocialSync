package controllers

import (
	"database/sql"
	"encoding/json"

	// "fmt"
	"log"
	"net/http"

	// "os"
	"strconv"
	"time"

	"social-sync-backend/lib"
	"social-sync-backend/middleware"
	"social-sync-backend/models"
	"social-sync-backend/utils"

	"github.com/google/uuid"
)

// GetAnalyticsOverview returns aggregated analytics data for a user
func GetAnalyticsOverview(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserIDFromContext(r)
	if err != nil {
		log.Println("Unauthorized:", err)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		http.Error(w, "Invalid user ID format", http.StatusBadRequest)
		return
	}

	// Parse query parameters
	platforms := r.URL.Query()["platform"]
	startDateStr := r.URL.Query().Get("start_date")
	endDateStr := r.URL.Query().Get("end_date")
	limitStr := r.URL.Query().Get("limit")

	// Set default date range (last 30 days)
	startDate := time.Now().AddDate(0, 0, -30)
	endDate := time.Now()

	if startDateStr != "" {
		if parsed, err := time.Parse("2006-01-02", startDateStr); err == nil {
			startDate = parsed
		}
	}
	if endDateStr != "" {
		if parsed, err := time.Parse("2006-01-02", endDateStr); err == nil {
			endDate = parsed
		}
	}

	limit := 10
	if limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	// Build query
	query := `
		SELECT 
			platform,
			SUM(total_posts) as total_posts,
			SUM(total_likes) as total_likes,
			SUM(total_comments) as total_comments,
			SUM(total_shares) as total_shares,
			SUM(total_views) as total_views,
			SUM(engagement) as total_engagement,
			AVG(engagement) as avg_engagement
		FROM post_analytics 
		WHERE user_id = $1 AND snapshot_at BETWEEN $2 AND $3
	`

	args := []interface{}{userUUID, startDate, endDate}
	argIndex := 4

	if len(platforms) > 0 {
		query += " AND platform = ANY($" + strconv.Itoa(argIndex) + ")"
		args = append(args, platforms)
		argIndex++
	}

	query += " GROUP BY platform ORDER BY total_engagement DESC"

	rows, err := lib.DB.Query(query, args...)
	if err != nil {
		log.Printf("Error querying analytics: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var platformStats []models.PlatformStats
	var totalPosts, totalEngagement int

	for rows.Next() {
		var ps models.PlatformStats
		var avgEngagement sql.NullFloat64
		err := rows.Scan(
			&ps.Platform,
			&ps.TotalPosts,
			&ps.TotalLikes,
			&ps.TotalComments,
			&ps.TotalShares,
			&ps.TotalViews,
			&ps.TotalEngagement,
			&avgEngagement,
		)
		if err != nil {
			log.Printf("Error scanning platform stats: %v", err)
			continue
		}

		if avgEngagement.Valid {
			ps.AvgEngagement = avgEngagement.Float64
		}

		platformStats = append(platformStats, ps)
		totalPosts += ps.TotalPosts
		totalEngagement += ps.TotalEngagement
	}

	// Get top posts
	topPosts, err := getTopPosts(userUUID, platforms, limit)
	if err != nil {
		log.Printf("Error getting top posts: %v", err)
	}

	// Get engagement trend
	engagementTrend, err := getEngagementTrend(userUUID, platforms, startDate, endDate)
	if err != nil {
		log.Printf("Error getting engagement trend: %v", err)
	}

	overview := models.AnalyticsOverview{
		UserID:          userUUID,
		TotalPosts:      totalPosts,
		TotalEngagement: totalEngagement,
		PlatformStats:   platformStats,
		TopPosts:        topPosts,
		EngagementTrend: engagementTrend,
		DateRange: models.DateRange{
			StartDate: startDate,
			EndDate:   endDate,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(overview)
}

// SyncAnalytics manually triggers analytics sync for the current user
func SyncAnalytics(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserIDFromContext(r)
	if err != nil {
		log.Println("Unauthorized:", err)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		http.Error(w, "Invalid user ID format", http.StatusBadRequest)
		return
	}

	// Trigger manual sync
	err = utils.SyncAllUserAnalytics(userUUID)
	if err != nil {
		log.Printf("Error syncing analytics: %v", err)
		http.Error(w, "Failed to sync analytics", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Analytics sync completed successfully"})
}

// getTopPosts retrieves top posts from the most recent snapshot
func getTopPosts(userID uuid.UUID, platforms []string, limit int) ([]models.TopPost, error) {
	query := `
		SELECT top_posts 
		FROM post_analytics 
		WHERE user_id = $1 
		ORDER BY snapshot_at DESC 
		LIMIT 1
	`

	var topPostsJSON sql.NullString
	err := lib.DB.QueryRow(query, userID).Scan(&topPostsJSON)
	if err != nil {
		if err == sql.ErrNoRows {
			return []models.TopPost{}, nil
		}
		return nil, err
	}

	if !topPostsJSON.Valid {
		return []models.TopPost{}, nil
	}

	var topPosts []models.TopPost
	err = json.Unmarshal([]byte(topPostsJSON.String), &topPosts)
	if err != nil {
		return nil, err
	}

	// Limit results
	if len(topPosts) > limit {
		topPosts = topPosts[:limit]
	}

	return topPosts, nil
}

// getEngagementTrend retrieves daily engagement data
func getEngagementTrend(userID uuid.UUID, platforms []string, startDate, endDate time.Time) ([]models.EngagementDataPoint, error) {
	query := `
		SELECT 
			DATE(snapshot_at) as date,
			SUM(total_likes) as likes,
			SUM(total_comments) as comments,
			SUM(total_shares) as shares,
			SUM(total_views) as views,
			SUM(engagement) as engagement
		FROM post_analytics 
		WHERE user_id = $1 AND snapshot_at BETWEEN $2 AND $3
	`

	args := []interface{}{userID, startDate, endDate}
	argIndex := 4

	if len(platforms) > 0 {
		query += " AND platform = ANY($" + strconv.Itoa(argIndex) + ")"
		args = append(args, platforms)
		argIndex++
	}

	query += " GROUP BY DATE(snapshot_at) ORDER BY date ASC"

	rows, err := lib.DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var trend []models.EngagementDataPoint
	for rows.Next() {
		var edp models.EngagementDataPoint
		err := rows.Scan(
			&edp.Date,
			&edp.Likes,
			&edp.Comments,
			&edp.Shares,
			&edp.Views,
			&edp.Engagement,
		)
		if err != nil {
			continue
		}
		trend = append(trend, edp)
	}

	return trend, nil
}

// GetPlatformComparison returns comparison data across platforms
func GetPlatformComparison(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserIDFromContext(r)
	if err != nil {
		log.Println("Unauthorized:", err)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		http.Error(w, "Invalid user ID format", http.StatusBadRequest)
		return
	}

	query := `
		SELECT 
			platform,
			SUM(total_posts) as total_posts,
			SUM(total_likes) as total_likes,
			SUM(total_comments) as total_comments,
			SUM(total_shares) as total_shares,
			SUM(total_views) as total_views,
			SUM(engagement) as total_engagement,
			AVG(engagement) as avg_engagement
		FROM post_analytics 
		WHERE user_id = $1 
		GROUP BY platform 
		ORDER BY total_engagement DESC
	`

	rows, err := lib.DB.Query(query, userUUID)
	if err != nil {
		log.Printf("Error querying platform comparison: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var platformStats []models.PlatformStats
	for rows.Next() {
		var ps models.PlatformStats
		var avgEngagement sql.NullFloat64
		err := rows.Scan(
			&ps.Platform,
			&ps.TotalPosts,
			&ps.TotalLikes,
			&ps.TotalComments,
			&ps.TotalShares,
			&ps.TotalViews,
			&ps.TotalEngagement,
			&avgEngagement,
		)
		if err != nil {
			log.Printf("Error scanning platform comparison: %v", err)
			continue
		}

		if avgEngagement.Valid {
			ps.AvgEngagement = avgEngagement.Float64
		}

		platformStats = append(platformStats, ps)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(platformStats)
}
