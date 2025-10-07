package controllers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
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
	accountIds := r.URL.Query()["account_id"]
	startDateStr := r.URL.Query().Get("start_date")
	endDateStr := r.URL.Query().Get("end_date")
	limitStr := r.URL.Query().Get("limit")

	// Analytics request received

	// Set default date range (last 30 days)
	startDate := time.Now().AddDate(0, 0, -30)
	endDate := time.Now()

	// Debug: Log the account IDs being processed
	// Processing analytics request

	// If specific accounts are requested, we need to handle account-specific analytics
	// Since post_analytics stores platform-level data, we'll need to either:
	// 1. Store account-specific analytics, or
	// 2. Filter the existing platform data based on account selection
	// For now, we'll implement option 2 by showing only platforms that have the selected accounts
	var filteredPlatforms []string
	var selectedAccountInfo []struct {
		ID       string
		Platform string
		Name     string
	}

	if len(accountIds) > 0 {
		// Get detailed account information for the selected accounts
		accountQuery := `
			SELECT id, platform, display_name, profile_name
			FROM social_accounts 
			WHERE user_id = $1 AND id = ANY($2)
		`
		accountUUIDs := make([]string, len(accountIds))
		for i, id := range accountIds {
			accountUUIDs[i] = id
		}

		rows, err := lib.DB.Query(accountQuery, userUUID, accountUUIDs)
		if err != nil {
			// Error querying account details
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		for rows.Next() {
			var account struct {
				ID       string
				Platform string
				Name     string
			}
			var displayName, profileName sql.NullString
			err := rows.Scan(&account.ID, &account.Platform, &displayName, &profileName)
			if err != nil {
				// Error scanning account details
				continue
			}

			// Use display_name or profile_name as fallback
			if displayName.Valid {
				account.Name = displayName.String
			} else if profileName.Valid {
				account.Name = profileName.String
			} else {
				account.Name = "Unknown Account"
			}

			selectedAccountInfo = append(selectedAccountInfo, account)
			filteredPlatforms = append(filteredPlatforms, account.Platform)
		}

		// Selected accounts and filtered platforms

		// If no accounts found, return empty data
		if len(selectedAccountInfo) == 0 {
			// No accounts found for selected IDs
			overview := models.AnalyticsOverview{
				UserID:          userUUID,
				TotalPosts:      0,
				TotalEngagement: 0,
				PlatformStats:   []models.PlatformStats{},
				TopPosts:        []models.TopPost{},
				EngagementTrend: []models.EngagementDataPoint{},
				DateRange: models.DateRange{
					StartDate: startDate,
					EndDate:   endDate,
				},
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(overview)
			return
		}
	}

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

	// Build query - if specific accounts are selected, we need to handle this differently
	// since post_analytics stores platform-level data, not account-specific data
	var query string
	var args []interface{}

	if len(accountIds) > 0 {
		// For account-specific filtering, get data for the selected accounts only
		query = `
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
			WHERE user_id = $1 AND snapshot_at BETWEEN $2 AND $3 AND account_id = ANY($4)
			GROUP BY platform ORDER BY total_engagement DESC
		`
		// Convert account IDs to UUIDs for the query
		accountUUIDs := make([]uuid.UUID, len(accountIds))
		for i, accountID := range accountIds {
			accountUUID, err := uuid.Parse(accountID)
			if err != nil {
				// Error parsing account ID
				continue
			}
			accountUUIDs[i] = accountUUID
		}

		args = []interface{}{userUUID, startDate, endDate, accountUUIDs}

		// Using account-specific analytics query
	} else {
		// Original query for all platforms
		query = `
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
			GROUP BY platform ORDER BY total_engagement DESC
		`
		args = []interface{}{userUUID, startDate, endDate}
		argIndex := 4

		// Use filtered platforms if account filtering is applied, otherwise use original platforms
		platformsToUse := platforms
		if len(filteredPlatforms) > 0 {
			platformsToUse = filteredPlatforms
		}

		if len(platformsToUse) > 0 {
			query += " AND platform = ANY($" + strconv.Itoa(argIndex) + ")"
			args = append(args, platformsToUse)
			argIndex++
		}
	}

	// Executing analytics query

	// Use direct query to avoid prepared statement conflicts
	rows, err := lib.DB.Query(query, args...)
	if err != nil {
		// Error querying analytics
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
			// Error scanning platform stats
			continue
		}

		if avgEngagement.Valid {
			ps.AvgEngagement = avgEngagement.Float64
		}

		// Show real data from database (no scaling, no estimation)
		// Showing analytics data

		// Final data calculated

		platformStats = append(platformStats, ps)
		totalPosts += ps.TotalPosts
		totalEngagement += ps.TotalEngagement
	}

	// Check if we have any data
	if len(platformStats) == 0 {
		// No analytics data found
		// Return empty analytics instead of error
		overview := models.AnalyticsOverview{
			UserID:          userUUID,
			TotalPosts:      0,
			TotalEngagement: 0,
			PlatformStats:   []models.PlatformStats{},
			TopPosts:        []models.TopPost{},
			EngagementTrend: []models.EngagementDataPoint{},
			DateRange: models.DateRange{
				StartDate: startDate,
				EndDate:   endDate,
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(overview)
		return
	}

	// Determine which platforms to use for top posts and engagement trend
	var platformsToUse []string
	if len(filteredPlatforms) > 0 {
		platformsToUse = filteredPlatforms
	} else {
		platformsToUse = platforms
	}

	// Get top posts
	topPosts, err := getTopPosts(userUUID, platformsToUse, limit, accountIds)
	if err != nil {
		// Error getting top posts
		topPosts = []models.TopPost{} // Initialize empty slice
	}

	// Get engagement trend
	engagementTrend, err := getEngagementTrend(userUUID, platformsToUse, startDate, endDate, accountIds)
	if err != nil {
		// Error getting engagement trend
		engagementTrend = []models.EngagementDataPoint{} // Initialize empty slice
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

	// Analytics response prepared

	// Debug: Log detailed platform stats
	// Platform stats calculated

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
		// Error syncing analytics
		http.Error(w, "Failed to sync analytics", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Analytics sync completed successfully"})
}

// getTopPosts retrieves top posts from the most recent snapshot
func getTopPosts(userID uuid.UUID, platforms []string, limit int, accountIds []string) ([]models.TopPost, error) {
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

	// If specific accounts are requested, filter posts by account
	if len(accountIds) > 0 {
		// For now, return all posts since we don't have account-specific filtering
		// This would need to be enhanced based on how posts are stored
		// Account filtering not yet implemented
	}

	// Limit results
	if len(topPosts) > limit {
		topPosts = topPosts[:limit]
	}

	return topPosts, nil
}

// getEngagementTrend retrieves daily engagement data
func getEngagementTrend(userID uuid.UUID, platforms []string, startDate, endDate time.Time, accountIds []string) ([]models.EngagementDataPoint, error) {
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
		// Error querying platform comparison
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
			// Error scanning platform comparison
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
