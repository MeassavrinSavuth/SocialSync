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
	log.Println("Starting analytics scheduler...")

	// Start platform-specific tickers
	go as.startMastodonTicker()
	go as.startFacebookTicker()
	go as.startInstagramTicker()
	go as.startTwitterTicker()
	go as.startYouTubeTicker()

	// Start user-specific sync job
	go as.startUserSyncJob()

	log.Println("Analytics scheduler started successfully")
}

// Stop stops the analytics scheduler
func (as *AnalyticsScheduler) Stop() {
	log.Println("Stopping analytics scheduler...")
	close(as.stopChan)
}

// startMastodonTicker runs Mastodon analytics sync every 1 hour
func (as *AnalyticsScheduler) startMastodonTicker() {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	// Run immediately on start
	log.Println("Starting initial Mastodon analytics sync...")
	as.syncPlatformAnalytics("mastodon")

	for {
		select {
		case <-ticker.C:
			log.Println("Starting Mastodon analytics sync...")
			as.syncPlatformAnalytics("mastodon")
		case <-as.stopChan:
			return
		}
	}
}

// startFacebookTicker runs Facebook analytics sync every 1 hour
func (as *AnalyticsScheduler) startFacebookTicker() {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	// Run immediately on start
	log.Println("Starting initial Facebook analytics sync...")
	as.syncPlatformAnalytics("facebook")

	for {
		select {
		case <-ticker.C:
			log.Println("Starting Facebook analytics sync...")
			as.syncPlatformAnalytics("facebook")
		case <-as.stopChan:
			return
		}
	}
}

// startInstagramTicker runs Instagram analytics sync every 6 hours
func (as *AnalyticsScheduler) startInstagramTicker() {
	ticker := time.NewTicker(6 * time.Hour)
	defer ticker.Stop()

	// Run immediately on start
	log.Println("Starting initial Instagram analytics sync...")
	as.syncPlatformAnalytics("instagram")

	for {
		select {
		case <-ticker.C:
			log.Println("Starting Instagram analytics sync...")
			as.syncPlatformAnalytics("instagram")
		case <-as.stopChan:
			return
		}
	}
}

// startTwitterTicker runs Twitter analytics sync every 6 hours
func (as *AnalyticsScheduler) startTwitterTicker() {
	ticker := time.NewTicker(6 * time.Hour)
	defer ticker.Stop()

	// Run immediately on start
	log.Println("Starting initial Twitter analytics sync...")
	as.syncPlatformAnalytics("twitter")

	for {
		select {
		case <-ticker.C:
			log.Println("Starting Twitter analytics sync...")
			as.syncPlatformAnalytics("twitter")
		case <-as.stopChan:
			return
		}
	}
}

// startYouTubeTicker runs YouTube analytics sync every 12 hours
func (as *AnalyticsScheduler) startYouTubeTicker() {
	ticker := time.NewTicker(12 * time.Hour)
	defer ticker.Stop()

	// Run immediately on start
	log.Println("Starting initial YouTube analytics sync...")
	as.syncPlatformAnalytics("youtube")

	for {
		select {
		case <-ticker.C:
			log.Println("Starting YouTube analytics sync...")
			as.syncPlatformAnalytics("youtube")
		case <-as.stopChan:
			return
		}
	}
}

// startUserSyncJob runs a general user sync job every hour
func (as *AnalyticsScheduler) startUserSyncJob() {
	ticker := time.NewTicker(1 * time.Hour)
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
	log.Printf("Starting %s analytics sync...", platform)

	// Get all users with this platform connected
	query := `SELECT DISTINCT user_id FROM social_accounts WHERE platform = $1`
	rows, err := lib.DB.Query(query, platform)
	if err != nil {
		log.Printf("Error fetching users for %s: %v", platform, err)
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
			log.Printf("Error syncing %s analytics for user %s: %v", platform, userID, err)
		}
	}

	log.Printf("Completed %s analytics sync for %d users", platform, len(userIDs))
}

// syncAllUsers syncs analytics for all users across all platforms
func (as *AnalyticsScheduler) syncAllUsers() {
	log.Println("Starting full user analytics sync...")

	// Get all users with connected social accounts
	query := `SELECT DISTINCT user_id FROM social_accounts`
	rows, err := lib.DB.Query(query)
	if err != nil {
		log.Printf("Error fetching users: %v", err)
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

	log.Printf("Completed full analytics sync for %d users", len(userIDs))
}

// TriggerManualSync manually triggers analytics sync for a specific user
func TriggerManualSync(userID uuid.UUID) error {
	log.Printf("Manual analytics sync triggered for user %s", userID)
	return SyncAllUserAnalytics(userID)
}

// TriggerPlatformSync manually triggers analytics sync for a specific platform
func TriggerPlatformSync(platform string) error {
	log.Printf("Manual %s analytics sync triggered", platform)

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
			log.Printf("Error syncing %s analytics for user %s: %v", platform, userID, err)
		}
	}

	return nil
}
