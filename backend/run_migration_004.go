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
	if err := godotenv.Load(); err != nil {
		log.Printf("⚠️  .env not found: %v — continuing", err)
	}
	lib.ConnectDB()
	defer lib.DB.Close()

	sqlBytes, err := ioutil.ReadFile("migrations/004_add_last_updated_by_to_draft_posts.sql")
	if err != nil {
		log.Fatalf("❌ Failed to read migration 004: %v", err)
	}
	if _, err := lib.DB.Exec(string(sqlBytes)); err != nil {
		log.Fatalf("❌ Failed to execute migration 004: %v", err)
	}
	fmt.Println("✅ Migration 004_add_last_updated_by_to_draft_posts.sql executed successfully!")
}
