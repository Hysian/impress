package model

import (
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestUser_GORMMigration(t *testing.T) {
	// Setup in-memory SQLite database
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect to database: %v", err)
	}

	// Run migration
	err = db.AutoMigrate(&User{})
	if err != nil {
		t.Fatalf("failed to migrate User model: %v", err)
	}

	// Verify table exists
	if !db.Migrator().HasTable(&User{}) {
		t.Error("users table was not created")
	}

	// Verify columns exist
	columns := []string{"id", "username", "password_hash", "role", "created_at", "updated_at"}
	for _, col := range columns {
		if !db.Migrator().HasColumn(&User{}, col) {
			t.Errorf("column %s does not exist", col)
		}
	}
}

func TestUser_CRUD(t *testing.T) {
	// Setup in-memory SQLite database
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect to database: %v", err)
	}

	// Run migration
	err = db.AutoMigrate(&User{})
	if err != nil {
		t.Fatalf("failed to migrate User model: %v", err)
	}

	// Test Create
	user := &User{
		Username:     "admin",
		PasswordHash: "$2a$10$hashedpassword",
		Role:         RoleAdmin,
	}

	result := db.Create(user)
	if result.Error != nil {
		t.Fatalf("failed to create user: %v", result.Error)
	}
	if user.ID == 0 {
		t.Error("user ID was not set after create")
	}
	if user.CreatedAt.IsZero() {
		t.Error("CreatedAt was not set after create")
	}
	if user.UpdatedAt.IsZero() {
		t.Error("UpdatedAt was not set after create")
	}

	// Test Read
	var found User
	result = db.First(&found, user.ID)
	if result.Error != nil {
		t.Fatalf("failed to find user: %v", result.Error)
	}
	if found.Username != "admin" {
		t.Errorf("Username = %v, want %v", found.Username, "admin")
	}
	if found.Role != RoleAdmin {
		t.Errorf("Role = %v, want %v", found.Role, RoleAdmin)
	}

	// Test Update
	time.Sleep(time.Millisecond) // Ensure UpdatedAt changes
	oldUpdatedAt := found.UpdatedAt
	found.Role = RoleEditor
	result = db.Save(&found)
	if result.Error != nil {
		t.Fatalf("failed to update user: %v", result.Error)
	}
	if found.Role != RoleEditor {
		t.Error("Role was not updated")
	}
	if !found.UpdatedAt.After(oldUpdatedAt) {
		t.Error("UpdatedAt was not updated")
	}

	// Test Delete
	result = db.Delete(&found)
	if result.Error != nil {
		t.Fatalf("failed to delete user: %v", result.Error)
	}
	result = db.First(&User{}, user.ID)
	if result.Error != gorm.ErrRecordNotFound {
		t.Error("user was not deleted")
	}
}

func TestUser_UniqueUsername(t *testing.T) {
	// Setup in-memory SQLite database
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect to database: %v", err)
	}

	// Run migration
	err = db.AutoMigrate(&User{})
	if err != nil {
		t.Fatalf("failed to migrate User model: %v", err)
	}

	// Create first user
	user1 := &User{
		Username:     "testuser",
		PasswordHash: "hash1",
		Role:         RoleAdmin,
	}
	result := db.Create(user1)
	if result.Error != nil {
		t.Fatalf("failed to create first user: %v", result.Error)
	}

	// Try to create second user with same username
	user2 := &User{
		Username:     "testuser",
		PasswordHash: "hash2",
		Role:         RoleEditor,
	}
	result = db.Create(user2)
	if result.Error == nil {
		t.Error("expected error when creating user with duplicate username, got nil")
	}
}

func TestUser_RoleValidation(t *testing.T) {
	// Setup in-memory SQLite database
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect to database: %v", err)
	}

	// Run migration
	err = db.AutoMigrate(&User{})
	if err != nil {
		t.Fatalf("failed to migrate User model: %v", err)
	}

	// Create user with invalid role
	user := &User{
		Username:     "testuser",
		PasswordHash: "hash",
		Role:         Role("invalid"),
	}

	// GORM will allow invalid role values at database level
	// But our Validate() method should catch it
	err = user.Validate()
	if err == nil {
		t.Error("expected validation error for invalid role, got nil")
	}
}
