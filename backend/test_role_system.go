//go:build ignore
// +build ignore

package main

import (
	"fmt"
	"log"
	"social-sync-backend/lib"
	"social-sync-backend/middleware"
	"social-sync-backend/models"

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

	fmt.Println("🧪 Testing Role System...")

	// Test 1: Check if permission constants are accessible
	fmt.Println("\n1. Testing Permission Constants:")
	fmt.Printf("   - Post Create: %s\n", models.PermPostCreate)
	fmt.Printf("   - Workspace Read: %s\n", models.PermWorkspaceRead)
	fmt.Printf("   - Member Role Change: %s\n", models.PermMemberRoleChange)

	// Test 2: Check role definitions
	fmt.Println("\n2. Testing Role Definitions:")
	defaultPermissions := models.GetDefaultRolePermissions()
	for roleName, permissions := range defaultPermissions {
		fmt.Printf("   - %s: %d permissions\n", roleName, len(permissions))
	}

	// Test 3: Test legacy role mapping
	fmt.Println("\n3. Testing Legacy Role Compatibility:")
	testRoles := []string{"Admin", "Editor", "Viewer", "workspace_admin", "content_manager", "invalid_role"}

	for _, role := range testRoles {
		// This would normally be called from middleware, but we'll simulate it
		fmt.Printf("   - Role '%s': ", role)

		// Check if it's a valid role by trying to get permissions
		defaultPerms := models.GetDefaultRolePermissions()
		if perms, exists := defaultPerms[role]; exists {
			fmt.Printf("✅ New system role with %d permissions\n", len(perms))
		} else {
			// Would fall back to legacy mapping
			fmt.Printf("⚠️  Legacy/Unknown role (would use fallback)\n")
		}
	}

	// Test 4: Check database connectivity for role tables
	fmt.Println("\n4. Testing Database Schema:")

	// Check if workspace_members table exists
	var count int
	err := lib.DB.QueryRow("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'workspace_members'").Scan(&count)
	if err != nil {
		fmt.Printf("   - workspace_members table: ❌ Error: %v\n", err)
	} else if count > 0 {
		fmt.Printf("   - workspace_members table: ✅ Exists\n")
	} else {
		fmt.Printf("   - workspace_members table: ❌ Not found\n")
	}

	// Check if roles table exists (new system)
	err = lib.DB.QueryRow("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'roles'").Scan(&count)
	if err != nil {
		fmt.Printf("   - roles table: ❌ Error: %v\n", err)
	} else if count > 0 {
		fmt.Printf("   - roles table: ✅ Exists\n")

		// Count roles in table
		var roleCount int
		err = lib.DB.QueryRow("SELECT COUNT(*) FROM roles").Scan(&roleCount)
		if err != nil {
			fmt.Printf("   - roles data: ❌ Error: %v\n", err)
		} else {
			fmt.Printf("   - roles data: ✅ %d roles found\n", roleCount)
		}
	} else {
		fmt.Printf("   - roles table: ⚠️  Not found (will use legacy mode)\n")
	}

	// Check permissions table
	err = lib.DB.QueryRow("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'permissions'").Scan(&count)
	if err != nil {
		fmt.Printf("   - permissions table: ❌ Error: %v\n", err)
	} else if count > 0 {
		fmt.Printf("   - permissions table: ✅ Exists\n")

		var permCount int
		err = lib.DB.QueryRow("SELECT COUNT(*) FROM permissions").Scan(&permCount)
		if err != nil {
			fmt.Printf("   - permissions data: ❌ Error: %v\n", err)
		} else {
			fmt.Printf("   - permissions data: ✅ %d permissions found\n", permCount)
		}
	} else {
		fmt.Printf("   - permissions table: ⚠️  Not found (will use legacy mode)\n")
	}

	// Test 5: Test permission checking (if we have test data)
	fmt.Println("\n5. Testing Permission System:")

	// Check if we have any workspace members to test with
	var memberCount int
	err = lib.DB.QueryRow("SELECT COUNT(*) FROM workspace_members").Scan(&memberCount)
	if err != nil {
		fmt.Printf("   - No workspace members to test with: %v\n", err)
	} else if memberCount == 0 {
		fmt.Printf("   - No workspace members found for testing\n")
	} else {
		fmt.Printf("   - Found %d workspace members for potential testing\n", memberCount)

		// Get a sample member
		var userID, workspaceID, role string
		err = lib.DB.QueryRow("SELECT user_id, workspace_id, role FROM workspace_members LIMIT 1").Scan(&userID, &workspaceID, &role)
		if err != nil {
			fmt.Printf("   - Error getting sample member: %v\n", err)
		} else {
			fmt.Printf("   - Testing with sample member (role: %s)\n", role)

			// Test permission check
			hasPermission, err := middleware.CheckUserPermission(userID, workspaceID, models.PermWorkspaceRead)
			if err != nil {
				fmt.Printf("   - Permission check failed: %v\n", err)
			} else {
				fmt.Printf("   - Permission check result: %t\n", hasPermission)
			}
		}
	}

	fmt.Println("\n✅ Role System Test Complete!")
	fmt.Println("\nNext steps:")
	fmt.Println("1. Run the database migration if roles table doesn't exist")
	fmt.Println("2. Test with actual user data")
	fmt.Println("3. Test frontend integration")
}
