package utils

import (
	"log"
	"time"

	"social-sync-backend/lib"

	"github.com/google/uuid"
)

// AnalyticsScheduler manages background jobs for analytics syncing
type AnalyticsScheduler struct {
	stopChan chan bool
}

// NewAnalyticsScheduler creates a new analytics scheduler
func NewAnalyticsScheduler() *AnalyticsScheduler {
	return &AnalyticsScheduler{
		stopChan: make(chan bool),
	}
}

// Start begins the analytics scheduling process
func (as *AnalyticsScheduler) Start() {
	// Starting analytics scheduler

	// Start platform-specific tickers
	go as.startMastodonTicker()
	go as.startFacebookTicker()
	go as.startInstagramTicker()
	// go as.startTwitterTicker() // DISABLED for testing
	go as.startYouTubeTicker()

	// Start user-specific sync job
	go as.startUserSyncJob()

	// Analytics scheduler started
}

// Stop stops the analytics scheduler
func (as *AnalyticsScheduler) Stop() {
	// Stopping analytics scheduler
	close(as.stopChan)
}

// startMastodonTicker runs Mastodon analytics sync every 2 hours
func (as *AnalyticsScheduler) startMastodonTicker() {
	ticker := time.NewTicker(2 * time.Hour)
	defer ticker.Stop()

	// Run immediately on start
	// Starting initial Mastodon analytics sync
	as.syncPlatformAnalytics("mastodon")

	for {
		select {
		case <-ticker.C:
			// Starting Mastodon analytics sync
			as.syncPlatformAnalytics("mastodon")
		case <-as.stopChan:
			return
		}
	}
}

// startFacebookTicker runs Facebook analytics sync every 5 minutes (for testing)
func (as *AnalyticsScheduler) startFacebookTicker() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	// Run immediately on start
	// Starting initial Facebook analytics sync
	as.syncPlatformAnalytics("facebook")

	for {
		select {
		case <-ticker.C:
			// Starting Facebook analytics sync
			as.syncPlatformAnalytics("facebook")
		case <-as.stopChan:
			return
		}
	}
}

// startInstagramTicker runs Instagram analytics sync every 5 minutes (for testing)
func (as *AnalyticsScheduler) startInstagramTicker() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	// Run immediately on start
	// Starting initial Instagram analytics sync
	as.syncPlatformAnalytics("instagram")

	for {
		select {
		case <-ticker.C:
			// Starting Instagram analytics sync
			as.syncPlatformAnalytics("instagram")
		case <-as.stopChan:
			return
		}
	}
}

// startTwitterTicker runs Twitter analytics sync every 6 hours (DISABLED for testing)
func (as *AnalyticsScheduler) startTwitterTicker() {
	ticker := time.NewTicker(6 * time.Hour)
	defer ticker.Stop()

	// Run immediately on start
	// Starting initial Twitter analytics sync
	as.syncPlatformAnalytics("twitter")

	for {
		select {
		case <-ticker.C:
			// Starting Twitter analytics sync
			as.syncPlatformAnalytics("twitter")
		case <-as.stopChan:
			return
		}
	}
}

// startYouTubeTicker runs YouTube analytics sync every 2 hours
func (as *AnalyticsScheduler) startYouTubeTicker() {
	ticker := time.NewTicker(2 * time.Hour)
	defer ticker.Stop()

	// Run immediately on start
	// Starting initial YouTube analytics sync
	as.syncPlatformAnalytics("youtube")

	for {
		select {
		case <-ticker.C:
			// Starting YouTube analytics sync
			as.syncPlatformAnalytics("youtube")
		case <-as.stopChan:
			return
		}
	}
}

// startUserSyncJob runs a general user sync job every 5 minutes (for testing)
func (as *AnalyticsScheduler) startUserSyncJob() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			as.syncAllUsers()
		case <-as.stopChan:
			return
		}
	}
}

// syncPlatformAnalytics syncs analytics for all users on a specific platform
func (as *AnalyticsScheduler) syncPlatformAnalytics(platform string) {
	// Starting platform analytics sync

	// Get all users with this platform connected
	query := `SELECT DISTINCT user_id FROM social_accounts WHERE platform = $1`
	rows, err := lib.DB.Query(query, platform)
	if err != nil {
		// Error fetching users
		return
	}
	defer rows.Close()

	var userIDs []uuid.UUID
	for rows.Next() {
		var userIDStr string
		if err := rows.Scan(&userIDStr); err != nil {
			continue
		}
		if userID, err := uuid.Parse(userIDStr); err == nil {
			userIDs = append(userIDs, userID)
		}
	}

	// Sync analytics for each user
	for _, userID := range userIDs {
		syncer := NewAnalyticsSyncer(userID, platform)
		if err := syncer.SyncAnalytics(); err != nil {
			// Error syncing analytics
		}
	}

	// Completed platform analytics sync
}

// syncAllUsers syncs analytics for all users across all platforms
func (as *AnalyticsScheduler) syncAllUsers() {
	// Starting full user analytics sync

	// Get all users with connected social accounts
	query := `SELECT DISTINCT user_id FROM social_accounts`
	rows, err := lib.DB.Query(query)
	if err != nil {
		// Error fetching users
		return
	}
	defer rows.Close()

	var userIDs []uuid.UUID
	for rows.Next() {
		var userIDStr string
		if err := rows.Scan(&userIDStr); err != nil {
			continue
		}
		if userID, err := uuid.Parse(userIDStr); err == nil {
			userIDs = append(userIDs, userID)
		}
	}

	// Sync analytics for each user
	for _, userID := range userIDs {
		if err := SyncAllUserAnalytics(userID); err != nil {
			log.Printf("Error syncing analytics for user %s: %v", userID, err)
		}
	}

	// Completed full analytics sync
}

// TriggerManualSync manually triggers analytics sync for a specific user
func TriggerManualSync(userID uuid.UUID) error {
	// Manual analytics sync triggered
	return SyncAllUserAnalytics(userID)
}

// TriggerPlatformSync manually triggers analytics sync for a specific platform
func TriggerPlatformSync(platform string) error {
	// Manual platform analytics sync triggered

	// Get all users with this platform
	query := `SELECT DISTINCT user_id FROM social_accounts WHERE platform = $1`
	rows, err := lib.DB.Query(query, platform)
	if err != nil {
		return err
	}
	defer rows.Close()

	var userIDs []uuid.UUID
	for rows.Next() {
		var userIDStr string
		if err := rows.Scan(&userIDStr); err != nil {
			continue
		}
		if userID, err := uuid.Parse(userIDStr); err == nil {
			userIDs = append(userIDs, userID)
		}
	}

	// Sync for each user
	for _, userID := range userIDs {
		syncer := NewAnalyticsSyncer(userID, platform)
		if err := syncer.SyncAnalytics(); err != nil {
			// Error syncing analytics
		}
	}

	return nil
}
