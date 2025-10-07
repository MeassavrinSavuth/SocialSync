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
		log.Printf("Warning: .env file not found: %v", err)
	}

	// Initialize database
	lib.ConnectDB()
	defer lib.DB.Close()

	fmt.Println("🚀 Running Role System Migration...")

	// Read the migration file
	migrationSQL, err := ioutil.ReadFile("migrations/001_create_roles_and_permissions.sql")
	if err != nil {
		log.Fatalf("Failed to read migration file: %v", err)
	}

	// Execute the migration
	_, err = lib.DB.Exec(string(migrationSQL))
	if err != nil {
		log.Fatalf("Failed to execute migration: %v", err)
	}

	fmt.Println("✅ Migration completed successfully!")

	// Verify the migration worked
	var count int
	err = lib.DB.QueryRow("SELECT COUNT(*) FROM roles").Scan(&count)
	if err != nil {
		fmt.Printf("❌ Error verifying roles table: %v\n", err)
	} else {
		fmt.Printf("✅ Created %d default roles\n", count)
	}

	err = lib.DB.QueryRow("SELECT COUNT(*) FROM permissions").Scan(&count)
	if err != nil {
		fmt.Printf("❌ Error verifying permissions table: %v\n", err)
	} else {
		fmt.Printf("✅ Created %d permissions\n", count)
	}

	fmt.Println("\n🎉 Role system is now ready to use!")
}
