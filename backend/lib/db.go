package lib

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	// "github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

var DB *sql.DB

func ConnectDB() {
	dbURL := os.Getenv("DATABASE_URL")
	var err error

	DB, err = sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("Error connecting to DB:", err)
	}

	err = DB.Ping()
	if err != nil {
		log.Fatal("Error pinging DB:", err)
	}

	fmt.Println("✅ Connected to PostgreSQL DB")
}

func GetDB() *sql.DB {
	return DB
}