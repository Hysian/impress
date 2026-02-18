package model

import (
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDBForRefreshToken(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// Enable foreign key constraints for SQLite
	db.Exec("PRAGMA foreign_keys = ON")

	// Migrate both User and RefreshToken tables
	if err := db.AutoMigrate(&User{}, &RefreshToken{}); err != nil {
		t.Fatalf("Failed to migrate test database: %v", err)
	}

	return db
}

func TestRefreshToken_GORMMigration(t *testing.T) {
	db := setupTestDBForRefreshToken(t)

	// Check that refresh_tokens table exists
	if !db.Migrator().HasTable(&RefreshToken{}) {
		t.Error("refresh_tokens table was not created")
	}

	// Check that columns exist
	columns := []string{"id", "user_id", "token", "expires_at", "created_at"}
	for _, col := range columns {
		if !db.Migrator().HasColumn(&RefreshToken{}, col) {
			t.Errorf("Column %s was not created", col)
		}
	}

	// Check that unique index on token exists
	indexes, err := db.Migrator().GetIndexes(&RefreshToken{})
	if err != nil {
		t.Fatalf("Failed to get indexes: %v", err)
	}

	hasTokenIndex := false
	hasUserIDIndex := false
	for _, idx := range indexes {
		if idx.Name() == "idx_refresh_tokens_token" {
			hasTokenIndex = true
		}
		if idx.Name() == "idx_refresh_token_user_id" {
			hasUserIDIndex = true
		}
	}

	if !hasTokenIndex {
		t.Error("Unique index on token column was not created")
	}
	if !hasUserIDIndex {
		t.Error("Index on user_id column was not created")
	}
}

func TestRefreshToken_CRUD(t *testing.T) {
	db := setupTestDBForRefreshToken(t)

	// Create a test user first
	user := User{
		Username:     "testuser",
		PasswordHash: "hashedpassword",
		Role:         RoleAdmin,
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// Create a refresh token
	token := RefreshToken{
		UserID:    user.ID,
		Token:     "test_refresh_token_12345",
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}

	// Test Create
	if err := db.Create(&token).Error; err != nil {
		t.Fatalf("Failed to create refresh token: %v", err)
	}

	if token.ID == 0 {
		t.Error("Token ID should be set after creation")
	}

	// Test Read
	var retrieved RefreshToken
	if err := db.First(&retrieved, token.ID).Error; err != nil {
		t.Fatalf("Failed to retrieve token: %v", err)
	}

	if retrieved.Token != token.Token {
		t.Errorf("Expected token %s, got %s", token.Token, retrieved.Token)
	}
	if retrieved.UserID != user.ID {
		t.Errorf("Expected user_id %d, got %d", user.ID, retrieved.UserID)
	}

	// Test eager loading User
	var tokenWithUser RefreshToken
	if err := db.Preload("User").First(&tokenWithUser, token.ID).Error; err != nil {
		t.Fatalf("Failed to retrieve token with user: %v", err)
	}

	if tokenWithUser.User.ID != user.ID {
		t.Error("User association was not loaded correctly")
	}
	if tokenWithUser.User.Username != user.Username {
		t.Errorf("Expected username %s, got %s", user.Username, tokenWithUser.User.Username)
	}

	// Test Delete
	if err := db.Delete(&token).Error; err != nil {
		t.Fatalf("Failed to delete token: %v", err)
	}

	var deleted RefreshToken
	err := db.First(&deleted, token.ID).Error
	if err == nil {
		t.Error("Token should not exist after deletion")
	}
}

func TestRefreshToken_UniqueTokenConstraint(t *testing.T) {
	db := setupTestDBForRefreshToken(t)

	// Create a test user
	user := User{
		Username:     "testuser",
		PasswordHash: "hashedpassword",
		Role:         RoleAdmin,
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// Create first token
	token1 := RefreshToken{
		UserID:    user.ID,
		Token:     "duplicate_token",
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}
	if err := db.Create(&token1).Error; err != nil {
		t.Fatalf("Failed to create first token: %v", err)
	}

	// Attempt to create token with duplicate token string
	token2 := RefreshToken{
		UserID:    user.ID,
		Token:     "duplicate_token",
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}
	err := db.Create(&token2).Error
	if err == nil {
		t.Error("Should not allow duplicate token values")
	}
}

func TestRefreshToken_ForeignKeyConstraint(t *testing.T) {
	db := setupTestDBForRefreshToken(t)

	// Create a test user
	user := User{
		Username:     "testuser",
		PasswordHash: "hashedpassword",
		Role:         RoleAdmin,
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// Create a refresh token
	token := RefreshToken{
		UserID:    user.ID,
		Token:     "test_token",
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}
	if err := db.Create(&token).Error; err != nil {
		t.Fatalf("Failed to create refresh token: %v", err)
	}

	// Delete the user (cascade should delete tokens)
	if err := db.Delete(&user).Error; err != nil {
		t.Fatalf("Failed to delete user: %v", err)
	}

	// Verify token was deleted due to cascade
	var deleted RefreshToken
	err := db.First(&deleted, token.ID).Error
	if err == nil {
		t.Error("Token should be deleted when user is deleted (cascade)")
	}
}

func TestRefreshToken_FindByToken(t *testing.T) {
	db := setupTestDBForRefreshToken(t)

	// Create a test user
	user := User{
		Username:     "testuser",
		PasswordHash: "hashedpassword",
		Role:         RoleAdmin,
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// Create a refresh token
	token := RefreshToken{
		UserID:    user.ID,
		Token:     "unique_token_string",
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}
	if err := db.Create(&token).Error; err != nil {
		t.Fatalf("Failed to create refresh token: %v", err)
	}

	// Find by token string
	var found RefreshToken
	if err := db.Where("token = ?", "unique_token_string").First(&found).Error; err != nil {
		t.Fatalf("Failed to find token by token string: %v", err)
	}

	if found.ID != token.ID {
		t.Errorf("Expected token ID %d, got %d", token.ID, found.ID)
	}

	// Test not found
	var notFound RefreshToken
	err := db.Where("token = ?", "nonexistent_token").First(&notFound).Error
	if err == nil {
		t.Error("Should return error when token not found")
	}
}

func TestRefreshToken_TimestampHandling(t *testing.T) {
	db := setupTestDBForRefreshToken(t)

	// Create a test user
	user := User{
		Username:     "testuser",
		PasswordHash: "hashedpassword",
		Role:         RoleAdmin,
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	expiresAt := time.Now().Add(7 * 24 * time.Hour)
	token := RefreshToken{
		UserID:    user.ID,
		Token:     "test_token",
		ExpiresAt: expiresAt,
	}

	before := time.Now()
	if err := db.Create(&token).Error; err != nil {
		t.Fatalf("Failed to create token: %v", err)
	}
	after := time.Now()

	// Check CreatedAt is set automatically
	if token.CreatedAt.IsZero() {
		t.Error("CreatedAt should be set automatically")
	}
	if token.CreatedAt.Before(before) || token.CreatedAt.After(after) {
		t.Error("CreatedAt should be set to current time")
	}

	// Check ExpiresAt is preserved
	if token.ExpiresAt.Sub(expiresAt).Abs() > time.Second {
		t.Error("ExpiresAt should be preserved as specified")
	}
}
