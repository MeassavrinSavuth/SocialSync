// +build ignore
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
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Printf("⚠️  .env file not found or failed to load: %v — continuing", err)
	}

	// Connect to database
	lib.ConnectDB()
	defer lib.DB.Close()

	// Read migration file
	migrationSQL, err := ioutil.ReadFile("migrations/002_add_last_updated_by.sql")
	if err != nil {
		log.Fatalf("❌ Failed to read migration file: %v", err)
	}

	// Execute migration
	_, err = lib.DB.Exec(string(migrationSQL))
	if err != nil {
		log.Fatalf("❌ Failed to execute migration: %v", err)
	}

	fmt.Println("✅ Migration 002_add_last_updated_by.sql executed successfully!")
}
