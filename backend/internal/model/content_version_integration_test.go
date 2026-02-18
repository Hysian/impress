package model

import (
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestContentVersion_Migration(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}

	// Run migration
	if err := db.AutoMigrate(&ContentVersion{}, &ContentDocument{}, &User{}); err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}

	// Verify table exists
	if !db.Migrator().HasTable(&ContentVersion{}) {
		t.Error("content_versions table was not created")
	}

	// Verify columns exist
	columns := []string{"id", "page_key", "version", "config", "published_at", "created_by", "created_at"}
	for _, col := range columns {
		if !db.Migrator().HasColumn(&ContentVersion{}, col) {
			t.Errorf("Column %s does not exist", col)
		}
	}

	// Verify composite unique index exists
	indexes, err := db.Migrator().GetIndexes(&ContentVersion{})
	if err != nil {
		t.Fatalf("Failed to get indexes: %v", err)
	}

	foundCompositeIndex := false
	for _, idx := range indexes {
		if idx.Name() == "idx_page_version" {
			foundCompositeIndex = true
			break
		}
	}

	if !foundCompositeIndex {
		t.Error("Composite unique index idx_page_version not found")
	}
}

func TestContentVersion_CRUD(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(&ContentVersion{}, &ContentDocument{}, &User{}); err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}

	// Create a user for foreign key
	user := &User{
		Username:     "testuser",
		PasswordHash: "hash",
		Role:         RoleAdmin,
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	// Create a content document
	doc := &ContentDocument{
		PageKey: PageKeyHome,
	}
	if err := db.Create(doc).Error; err != nil {
		t.Fatalf("Failed to create content document: %v", err)
	}

	// Create version
	now := time.Now()
	version := &ContentVersion{
		PageKey:     PageKeyHome,
		Version:     1,
		Config:      JSONMap{"title": map[string]string{"zh": "首页", "en": "Home"}},
		PublishedAt: now,
		CreatedBy:   user.ID,
	}

	if err := db.Create(version).Error; err != nil {
		t.Fatalf("Failed to create version: %v", err)
	}

	if version.ID == 0 {
		t.Error("Version ID was not set after creation")
	}

	// Read version
	var retrieved ContentVersion
	if err := db.First(&retrieved, version.ID).Error; err != nil {
		t.Fatalf("Failed to retrieve version: %v", err)
	}

	if retrieved.PageKey != PageKeyHome {
		t.Errorf("PageKey = %v, want %v", retrieved.PageKey, PageKeyHome)
	}
	if retrieved.Version != 1 {
		t.Errorf("Version = %v, want %v", retrieved.Version, 1)
	}
	if retrieved.CreatedBy != user.ID {
		t.Errorf("CreatedBy = %v, want %v", retrieved.CreatedBy, user.ID)
	}

	// Verify config was stored correctly
	title, ok := retrieved.Config["title"].(map[string]interface{})
	if !ok {
		t.Fatalf("Config title is not a map: %T", retrieved.Config["title"])
	}
	if title["zh"] != "首页" {
		t.Errorf("Config zh title = %v, want %v", title["zh"], "首页")
	}

	// Update version (note: version number should not be updated in practice)
	retrieved.Config = JSONMap{"title": map[string]string{"zh": "首页更新", "en": "Home Updated"}}
	if err := db.Save(&retrieved).Error; err != nil {
		t.Fatalf("Failed to update version: %v", err)
	}

	// Delete version
	if err := db.Delete(&retrieved).Error; err != nil {
		t.Fatalf("Failed to delete version: %v", err)
	}

	// Verify deletion
	var count int64
	db.Model(&ContentVersion{}).Where("id = ?", version.ID).Count(&count)
	if count != 0 {
		t.Errorf("Version still exists after deletion, count = %v", count)
	}
}

func TestContentVersion_CompositeUniqueConstraint(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(&ContentVersion{}, &ContentDocument{}, &User{}); err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}

	// Create a user
	user := &User{
		Username:     "testuser",
		PasswordHash: "hash",
		Role:         RoleAdmin,
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	// Create first version
	now := time.Now()
	version1 := &ContentVersion{
		PageKey:     PageKeyHome,
		Version:     1,
		Config:      JSONMap{"v": "1"},
		PublishedAt: now,
		CreatedBy:   user.ID,
	}
	if err := db.Create(version1).Error; err != nil {
		t.Fatalf("Failed to create first version: %v", err)
	}

	// Try to create duplicate (same PageKey and Version)
	version2 := &ContentVersion{
		PageKey:     PageKeyHome,
		Version:     1,
		Config:      JSONMap{"v": "2"},
		PublishedAt: now,
		CreatedBy:   user.ID,
	}
	err = db.Create(version2).Error
	if err == nil {
		t.Error("Expected error when creating duplicate (PageKey, Version), got nil")
	}

	// Create version with same PageKey but different Version (should succeed)
	version3 := &ContentVersion{
		PageKey:     PageKeyHome,
		Version:     2,
		Config:      JSONMap{"v": "3"},
		PublishedAt: now,
		CreatedBy:   user.ID,
	}
	if err := db.Create(version3).Error; err != nil {
		t.Errorf("Failed to create version with different Version: %v", err)
	}

	// Create version with different PageKey but same Version (should succeed)
	version4 := &ContentVersion{
		PageKey:     PageKeyAbout,
		Version:     1,
		Config:      JSONMap{"v": "4"},
		PublishedAt: now,
		CreatedBy:   user.ID,
	}
	if err := db.Create(version4).Error; err != nil {
		t.Errorf("Failed to create version with different PageKey: %v", err)
	}
}

func TestContentVersion_AllValidPageKeys(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(&ContentVersion{}, &ContentDocument{}, &User{}); err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}

	// Create a user
	user := &User{
		Username:     "testuser",
		PasswordHash: "hash",
		Role:         RoleAdmin,
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	// Create versions for all valid page keys
	now := time.Now()
	for i, pageKey := range ValidPageKeys {
		version := &ContentVersion{
			PageKey:     pageKey,
			Version:     1,
			Config:      JSONMap{"page": pageKey.String()},
			PublishedAt: now,
			CreatedBy:   user.ID,
		}
		if err := db.Create(version).Error; err != nil {
			t.Errorf("Failed to create version for %s: %v", pageKey, err)
		}

		// Verify it was created
		var count int64
		db.Model(&ContentVersion{}).Where("page_key = ?", pageKey).Count(&count)
		if count != 1 {
			t.Errorf("Expected 1 version for %s, got %v", pageKey, count)
		}

		// Verify the version exists
		var retrieved ContentVersion
		if err := db.Where("page_key = ? AND version = ?", pageKey, 1).First(&retrieved).Error; err != nil {
			t.Errorf("Failed to retrieve version for %s: %v", pageKey, err)
		}

		if retrieved.PageKey != pageKey {
			t.Errorf("Retrieved PageKey = %v, want %v (iteration %d)", retrieved.PageKey, pageKey, i)
		}
	}

	// Verify total count
	var totalCount int64
	db.Model(&ContentVersion{}).Count(&totalCount)
	if totalCount != int64(len(ValidPageKeys)) {
		t.Errorf("Total version count = %v, want %v", totalCount, len(ValidPageKeys))
	}
}

func TestContentVersion_Timestamps(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(&ContentVersion{}, &ContentDocument{}, &User{}); err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}

	// Create a user
	user := &User{
		Username:     "testuser",
		PasswordHash: "hash",
		Role:         RoleAdmin,
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	now := time.Now()
	version := &ContentVersion{
		PageKey:     PageKeyHome,
		Version:     1,
		Config:      JSONMap{},
		PublishedAt: now,
		CreatedBy:   user.ID,
	}

	if err := db.Create(version).Error; err != nil {
		t.Fatalf("Failed to create version: %v", err)
	}

	// CreatedAt should be set automatically
	if version.CreatedAt.IsZero() {
		t.Error("CreatedAt was not set automatically")
	}

	// PublishedAt should be preserved
	if !version.PublishedAt.Equal(now) {
		t.Errorf("PublishedAt = %v, want %v", version.PublishedAt, now)
	}
}

func TestContentVersion_QueryByPageKey(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(&ContentVersion{}, &ContentDocument{}, &User{}); err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}

	// Create a user
	user := &User{
		Username:     "testuser",
		PasswordHash: "hash",
		Role:         RoleAdmin,
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	// Create multiple versions for home page
	now := time.Now()
	for i := 1; i <= 3; i++ {
		version := &ContentVersion{
			PageKey:     PageKeyHome,
			Version:     i,
			Config:      JSONMap{"v": i},
			PublishedAt: now.Add(time.Duration(i) * time.Hour),
			CreatedBy:   user.ID,
		}
		if err := db.Create(version).Error; err != nil {
			t.Fatalf("Failed to create version %d: %v", i, err)
		}
	}

	// Create versions for about page
	for i := 1; i <= 2; i++ {
		version := &ContentVersion{
			PageKey:     PageKeyAbout,
			Version:     i,
			Config:      JSONMap{"v": i},
			PublishedAt: now.Add(time.Duration(i) * time.Hour),
			CreatedBy:   user.ID,
		}
		if err := db.Create(version).Error; err != nil {
			t.Fatalf("Failed to create about version %d: %v", i, err)
		}
	}

	// Query versions by page key
	var homeVersions []ContentVersion
	if err := db.Where("page_key = ?", PageKeyHome).Order("version desc").Find(&homeVersions).Error; err != nil {
		t.Fatalf("Failed to query home versions: %v", err)
	}

	if len(homeVersions) != 3 {
		t.Errorf("Expected 3 home versions, got %d", len(homeVersions))
	}

	// Verify descending order
	for i, v := range homeVersions {
		expectedVersion := 3 - i
		if v.Version != expectedVersion {
			t.Errorf("Version[%d] = %d, want %d", i, v.Version, expectedVersion)
		}
	}
}

func TestContentVersion_GetByPageKeyAndVersion(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(&ContentVersion{}, &ContentDocument{}, &User{}); err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}

	// Create a user
	user := &User{
		Username:     "testuser",
		PasswordHash: "hash",
		Role:         RoleAdmin,
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	// Create version
	now := time.Now()
	version := &ContentVersion{
		PageKey:     PageKeyHome,
		Version:     5,
		Config:      JSONMap{"title": "Version 5"},
		PublishedAt: now,
		CreatedBy:   user.ID,
	}
	if err := db.Create(version).Error; err != nil {
		t.Fatalf("Failed to create version: %v", err)
	}

	// Query by PageKey and Version
	var retrieved ContentVersion
	if err := db.Where("page_key = ? AND version = ?", PageKeyHome, 5).First(&retrieved).Error; err != nil {
		t.Fatalf("Failed to get version: %v", err)
	}

	if retrieved.ID != version.ID {
		t.Errorf("Retrieved ID = %v, want %v", retrieved.ID, version.ID)
	}

	// Query non-existent version
	err = db.Where("page_key = ? AND version = ?", PageKeyHome, 999).First(&ContentVersion{}).Error
	if err == nil {
		t.Error("Expected error when querying non-existent version, got nil")
	}
	if err != gorm.ErrRecordNotFound {
		t.Errorf("Expected gorm.ErrRecordNotFound, got %v", err)
	}
}
