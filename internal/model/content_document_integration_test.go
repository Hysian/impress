package model

import (
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect to test database: %v", err)
	}

	// Run migrations
	if err := db.AutoMigrate(&ContentDocument{}); err != nil {
		t.Fatalf("failed to migrate ContentDocument: %v", err)
	}

	return db
}

func TestContentDocument_Migration(t *testing.T) {
	db := setupTestDB(t)

	// Verify table exists
	if !db.Migrator().HasTable(&ContentDocument{}) {
		t.Error("content_documents table was not created")
	}

	// Verify columns exist
	expectedColumns := []string{"page_key", "draft_config", "draft_version", "published_config", "published_version", "updated_at"}
	for _, col := range expectedColumns {
		if !db.Migrator().HasColumn(&ContentDocument{}, col) {
			t.Errorf("column %s does not exist", col)
		}
	}
}

func TestContentDocument_CRUD(t *testing.T) {
	db := setupTestDB(t)

	// Create
	doc := &ContentDocument{
		PageKey: PageKeyHome,
		DraftConfig: JSONMap{
			"title": map[string]interface{}{
				"zh": "首页标题",
				"en": "Home Title",
			},
		},
		DraftVersion:     1,
		PublishedConfig:  JSONMap{},
		PublishedVersion: 0,
	}

	result := db.Create(doc)
	if result.Error != nil {
		t.Fatalf("failed to create content document: %v", result.Error)
	}

	// Read
	var retrieved ContentDocument
	if err := db.First(&retrieved, "page_key = ?", PageKeyHome).Error; err != nil {
		t.Fatalf("failed to retrieve content document: %v", err)
	}

	if retrieved.PageKey != PageKeyHome {
		t.Errorf("expected PageKey %v, got %v", PageKeyHome, retrieved.PageKey)
	}
	if retrieved.DraftVersion != 1 {
		t.Errorf("expected DraftVersion 1, got %v", retrieved.DraftVersion)
	}

	// Update
	retrieved.DraftVersion = 2
	retrieved.DraftConfig = JSONMap{
		"title": map[string]interface{}{
			"zh": "更新后的标题",
			"en": "Updated Title",
		},
	}
	if err := db.Save(&retrieved).Error; err != nil {
		t.Fatalf("failed to update content document: %v", err)
	}

	// Verify update
	var updated ContentDocument
	if err := db.First(&updated, "page_key = ?", PageKeyHome).Error; err != nil {
		t.Fatalf("failed to retrieve updated content document: %v", err)
	}

	if updated.DraftVersion != 2 {
		t.Errorf("expected DraftVersion 2, got %v", updated.DraftVersion)
	}

	// Delete
	if err := db.Delete(&updated).Error; err != nil {
		t.Fatalf("failed to delete content document: %v", err)
	}

	// Verify deletion
	var deleted ContentDocument
	err := db.First(&deleted, "page_key = ?", PageKeyHome).Error
	if err != gorm.ErrRecordNotFound {
		t.Errorf("expected record not found error, got %v", err)
	}
}

func TestContentDocument_JSONBStorage(t *testing.T) {
	db := setupTestDB(t)

	// Create document with nested JSON structure
	doc := &ContentDocument{
		PageKey: PageKeyAbout,
		DraftConfig: JSONMap{
			"hero": map[string]interface{}{
				"title": map[string]interface{}{
					"zh": "关于我们",
					"en": "About Us",
				},
				"image": map[string]interface{}{
					"url": "/images/hero.jpg",
					"alt": map[string]interface{}{
						"zh": "英雄图片",
						"en": "Hero Image",
					},
				},
			},
			"blocks": []interface{}{
				map[string]interface{}{
					"title": map[string]interface{}{
						"zh": "我们的使命",
						"en": "Our Mission",
					},
					"description": map[string]interface{}{
						"zh": "我们的使命是提供卓越的服务",
						"en": "Our mission is to provide excellent service",
					},
				},
			},
		},
		DraftVersion: 1,
	}

	if err := db.Create(doc).Error; err != nil {
		t.Fatalf("failed to create document with complex JSON: %v", err)
	}

	// Retrieve and verify JSON structure
	var retrieved ContentDocument
	if err := db.First(&retrieved, "page_key = ?", PageKeyAbout).Error; err != nil {
		t.Fatalf("failed to retrieve document: %v", err)
	}

	// Verify nested structure
	hero, ok := retrieved.DraftConfig["hero"].(map[string]interface{})
	if !ok {
		t.Fatal("hero field is not a map")
	}

	title, ok := hero["title"].(map[string]interface{})
	if !ok {
		t.Fatal("title field is not a map")
	}

	if title["zh"] != "关于我们" {
		t.Errorf("expected zh title '关于我们', got %v", title["zh"])
	}
}

func TestContentDocument_PrimaryKeyConstraint(t *testing.T) {
	db := setupTestDB(t)

	// Create first document
	doc1 := &ContentDocument{
		PageKey:      PageKeyHome,
		DraftVersion: 1,
	}
	if err := db.Create(doc1).Error; err != nil {
		t.Fatalf("failed to create first document: %v", err)
	}

	// Try to create duplicate
	doc2 := &ContentDocument{
		PageKey:      PageKeyHome,
		DraftVersion: 2,
	}
	err := db.Create(doc2).Error
	if err == nil {
		t.Error("expected error when creating duplicate pageKey, got nil")
	}
}

func TestContentDocument_BeforeSaveHook(t *testing.T) {
	db := setupTestDB(t)

	// Create document without initializing JSON fields
	doc := &ContentDocument{
		PageKey:      PageKeyContact,
		DraftVersion: 0,
	}

	if err := db.Create(doc).Error; err != nil {
		t.Fatalf("failed to create document: %v", err)
	}

	// Retrieve and verify JSON fields are initialized
	var retrieved ContentDocument
	if err := db.First(&retrieved, "page_key = ?", PageKeyContact).Error; err != nil {
		t.Fatalf("failed to retrieve document: %v", err)
	}

	if retrieved.DraftConfig == nil {
		t.Error("DraftConfig should be initialized to empty map")
	}
	if retrieved.PublishedConfig == nil {
		t.Error("PublishedConfig should be initialized to empty map")
	}
}

func TestContentDocument_AllValidPageKeys(t *testing.T) {
	db := setupTestDB(t)

	// Create documents for all valid page keys
	for _, pageKey := range ValidPageKeys {
		doc := &ContentDocument{
			PageKey:      pageKey,
			DraftVersion: 0,
		}
		if err := db.Create(doc).Error; err != nil {
			t.Fatalf("failed to create document for pageKey %s: %v", pageKey, err)
		}
	}

	// Verify all documents were created
	var count int64
	db.Model(&ContentDocument{}).Count(&count)
	if count != int64(len(ValidPageKeys)) {
		t.Errorf("expected %d documents, got %d", len(ValidPageKeys), count)
	}
}

func TestContentDocument_UpdatedAtTimestamp(t *testing.T) {
	db := setupTestDB(t)

	// Create document
	doc := &ContentDocument{
		PageKey:      PageKeyExperts,
		DraftVersion: 1,
	}
	if err := db.Create(doc).Error; err != nil {
		t.Fatalf("failed to create document: %v", err)
	}

	firstUpdatedAt := doc.UpdatedAt
	if firstUpdatedAt.IsZero() {
		t.Error("UpdatedAt should be set on creation")
	}

	// Wait a bit to ensure timestamp changes
	time.Sleep(10 * time.Millisecond)

	// Update document
	doc.DraftVersion = 2
	if err := db.Save(doc).Error; err != nil {
		t.Fatalf("failed to update document: %v", err)
	}

	if !doc.UpdatedAt.After(firstUpdatedAt) {
		t.Error("UpdatedAt should be updated after save")
	}
}

func TestContentDocument_PublishWorkflow(t *testing.T) {
	db := setupTestDB(t)

	// Create initial draft
	doc := &ContentDocument{
		PageKey: PageKeyCases,
		DraftConfig: JSONMap{
			"title": map[string]interface{}{
				"zh": "案例",
				"en": "Cases",
			},
		},
		DraftVersion:     1,
		PublishedConfig:  JSONMap{},
		PublishedVersion: 0,
	}
	if err := db.Create(doc).Error; err != nil {
		t.Fatalf("failed to create document: %v", err)
	}

	// Simulate publish: copy draft to published
	doc.PublishedConfig = doc.DraftConfig
	doc.PublishedVersion = doc.DraftVersion
	if err := db.Save(doc).Error; err != nil {
		t.Fatalf("failed to publish: %v", err)
	}

	// Verify published state
	var retrieved ContentDocument
	if err := db.First(&retrieved, "page_key = ?", PageKeyCases).Error; err != nil {
		t.Fatalf("failed to retrieve published document: %v", err)
	}

	if retrieved.PublishedVersion != 1 {
		t.Errorf("expected PublishedVersion 1, got %v", retrieved.PublishedVersion)
	}

	publishedTitle, ok := retrieved.PublishedConfig["title"].(map[string]interface{})
	if !ok {
		t.Fatal("published title is not a map")
	}
	if publishedTitle["zh"] != "案例" {
		t.Errorf("expected published zh title '案例', got %v", publishedTitle["zh"])
	}
}
