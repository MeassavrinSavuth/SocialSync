//go:build ignore
// +build ignore

package main

import (
	"fmt"
	"io/ioutil"
	"log"
	"social-sync-backend/lib"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	_ = godotenv.Load()
	lib.ConnectDB()
	defer lib.DB.Close()

	sqlBytes, err := ioutil.ReadFile("migrations/007_add_targets_to_scheduled_posts.sql")
	if err != nil {
		log.Fatalf("❌ Failed to read migration 007: %v", err)
	}
	if _, err := lib.DB.Exec(string(sqlBytes)); err != nil {
		log.Fatalf("❌ Failed to execute migration 007: %v", err)
	}
	fmt.Println("✅ Migration 007_add_targets_to_scheduled_posts.sql executed successfully!")
}
