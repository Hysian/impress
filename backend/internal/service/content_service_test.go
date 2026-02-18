package service

import (
	"context"
	"testing"
	"time"

	"blotting-consultancy/internal/db"
	"blotting-consultancy/internal/model"
	"blotting-consultancy/internal/repository"
	"gorm.io/gorm/logger"
)

func setupContentServiceTest(t *testing.T) (*ContentService, *db.DB, func()) {
	t.Helper()

	// Initialize in-memory database
	database, err := db.Init(db.InitOptions{
		DSN:      ":memory:",
		LogLevel: logger.Silent,
	})
	if err != nil {
		t.Fatalf("Failed to initialize test database: %v", err)
	}

	// Run migrations
	if err := database.AutoMigrate(
		&model.User{},
		&model.RefreshToken{},
		&model.ContentDocument{},
		&model.ContentVersion{},
	); err != nil {
		t.Fatalf("Failed to run migrations: %v", err)
	}

	// Create repositories
	docRepo := repository.NewGormContentDocumentRepository(database.DB)
	versionRepo := repository.NewGormContentVersionRepository(database.DB)
	validationSvc := NewValidationService()

	// Create service
	svc := NewContentService(database.DB, docRepo, versionRepo, validationSvc)

	cleanup := func() {
		database.Close()
	}

	return svc, database, cleanup
}

func TestContentService_Publish_Success(t *testing.T) {
	svc, _, cleanup := setupContentServiceTest(t)
	defer cleanup()

	ctx := context.Background()

	// Create initial document with minimal valid config
	doc := &model.ContentDocument{
		PageKey:          model.PageKeyHome,
		DraftVersion:     1,
		PublishedVersion: 0,
		DraftConfig: model.JSONMap{
			"hero": map[string]interface{}{
				"title": map[string]interface{}{
					"zh": "欢迎",
					"en": "Welcome",
				},
				"subtitle": map[string]interface{}{
					"zh": "副标题",
					"en": "Subtitle",
				},
				"backgroundImage": map[string]interface{}{
					"url": "/hero.jpg",
					"alt": map[string]interface{}{
						"zh": "背景",
						"en": "Background",
					},
				},
			},
			"about": map[string]interface{}{
				"title": map[string]interface{}{
					"zh": "关于",
					"en": "About",
				},
				"image": map[string]interface{}{
					"url": "/about.jpg",
					"alt": map[string]interface{}{
						"zh": "关于图片",
						"en": "About image",
					},
				},
				"cta": map[string]interface{}{
					"label": map[string]interface{}{
						"zh": "了解更多",
						"en": "Learn more",
					},
					"href": "/about",
				},
				"descriptions": []interface{}{
					map[string]interface{}{
						"zh": "描述1",
						"en": "Description 1",
					},
				},
			},
			"advantages": map[string]interface{}{
				"title": map[string]interface{}{
					"zh": "优势",
					"en": "Advantages",
				},
				"cards": []interface{}{
					map[string]interface{}{
						"title": map[string]interface{}{
							"zh": "优势1",
							"en": "Advantage 1",
						},
						"titleEn": map[string]interface{}{
							"zh": "优势1英文",
							"en": "Advantage 1 EN",
						},
						"description": map[string]interface{}{
							"zh": "描述1",
							"en": "Description 1",
						},
						"image": map[string]interface{}{
							"url": "/adv1.jpg",
							"alt": map[string]interface{}{
								"zh": "优势1图片",
								"en": "Advantage 1 image",
							},
						},
					},
				},
			},
			"coreServices": map[string]interface{}{
				"title": map[string]interface{}{
					"zh": "核心服务",
					"en": "Core Services",
				},
				"items": []interface{}{
					map[string]interface{}{
						"title": map[string]interface{}{
							"zh": "服务1",
							"en": "Service 1",
						},
						"description": map[string]interface{}{
							"zh": "描述1",
							"en": "Description 1",
						},
						"image": map[string]interface{}{
							"url": "/svc1.jpg",
							"alt": map[string]interface{}{
								"zh": "服务1图片",
								"en": "Service 1 image",
							},
						},
						"cta": map[string]interface{}{
							"label": map[string]interface{}{
								"zh": "了解更多",
								"en": "Learn more",
							},
							"href": "/service1",
						},
					},
				},
			},
		},
		PublishedConfig: model.JSONMap{},
	}

	if err := svc.docRepo.Create(ctx, doc); err != nil {
		t.Fatalf("Failed to create test document: %v", err)
	}

	// Publish
	result, err := svc.Publish(ctx, model.PageKeyHome, 1, 1) // createdBy = 1
	if err != nil {
		t.Fatalf("Publish failed: %v", err)
	}

	// Verify result
	if result.PageKey != model.PageKeyHome {
		t.Errorf("Expected pageKey %s, got %s", model.PageKeyHome, result.PageKey)
	}
	if result.PublishedVersion != 1 {
		t.Errorf("Expected published version 1, got %d", result.PublishedVersion)
	}
	if result.PublishedAt.IsZero() {
		t.Error("Expected non-zero publishedAt")
	}

	// Verify version snapshot was created
	version, err := svc.versionRepo.FindByPageKeyAndVersion(ctx, model.PageKeyHome, 1)
	if err != nil {
		t.Fatalf("Failed to fetch version snapshot: %v", err)
	}
	if version.CreatedBy != 1 {
		t.Errorf("Expected createdBy 1, got %d", version.CreatedBy)
	}
	if version.PublishedAt.IsZero() {
		t.Error("Expected non-zero publishedAt in version")
	}

	// Verify published config was updated
	updatedDoc, err := svc.docRepo.FindByPageKey(ctx, model.PageKeyHome)
	if err != nil {
		t.Fatalf("Failed to fetch updated document: %v", err)
	}
	if updatedDoc.PublishedVersion != 1 {
		t.Errorf("Expected published version 1, got %d", updatedDoc.PublishedVersion)
	}
	if len(updatedDoc.PublishedConfig) == 0 {
		t.Error("Expected non-empty published config")
	}
}

func TestContentService_Publish_VersionMismatch(t *testing.T) {
	svc, _, cleanup := setupContentServiceTest(t)
	defer cleanup()

	ctx := context.Background()

	// Create initial document
	doc := &model.ContentDocument{
		PageKey:          model.PageKeyHome,
		DraftVersion:     5,
		PublishedVersion: 3,
		DraftConfig: model.JSONMap{
			"hero": map[string]interface{}{
				"title": map[string]interface{}{"zh": "标题", "en": "Title"},
				"subtitle": map[string]interface{}{"zh": "副标题", "en": "Subtitle"},
				"backgroundImage": map[string]interface{}{
					"url": "/hero.jpg",
					"alt": map[string]interface{}{"zh": "背景", "en": "Background"},
				},
			},
			"about": map[string]interface{}{
				"title": map[string]interface{}{"zh": "关于", "en": "About"},
				"description": map[string]interface{}{"zh": "描述", "en": "Description"},
			},
			"advantages": []interface{}{},
			"coreServices": []interface{}{},
		},
		PublishedConfig: model.JSONMap{},
	}

	if err := svc.docRepo.Create(ctx, doc); err != nil {
		t.Fatalf("Failed to create test document: %v", err)
	}

	// Attempt publish with wrong expected version
	_, err := svc.Publish(ctx, model.PageKeyHome, 4, 1)
	if err != ErrVersionMismatch {
		t.Errorf("Expected ErrVersionMismatch, got %v", err)
	}

	// Verify no version snapshot was created
	_, err = svc.versionRepo.FindByPageKeyAndVersion(ctx, model.PageKeyHome, 4)
	if err == nil {
		t.Error("Expected error when fetching non-existent version, got nil")
	}

	// Verify published config was NOT updated
	updatedDoc, err := svc.docRepo.FindByPageKey(ctx, model.PageKeyHome)
	if err != nil {
		t.Fatalf("Failed to fetch document: %v", err)
	}
	if updatedDoc.PublishedVersion != 3 {
		t.Errorf("Expected published version 3 (unchanged), got %d", updatedDoc.PublishedVersion)
	}
}

func TestContentService_Publish_ValidationFailed(t *testing.T) {
	svc, _, cleanup := setupContentServiceTest(t)
	defer cleanup()

	ctx := context.Background()

	// Create document with invalid config (missing required fields)
	doc := &model.ContentDocument{
		PageKey:          model.PageKeyHome,
		DraftVersion:     1,
		PublishedVersion: 0,
		DraftConfig: model.JSONMap{
			// Missing hero, about, advantages, coreServices
		},
		PublishedConfig: model.JSONMap{},
	}

	if err := svc.docRepo.Create(ctx, doc); err != nil {
		t.Fatalf("Failed to create test document: %v", err)
	}

	// Attempt publish with invalid config
	_, err := svc.Publish(ctx, model.PageKeyHome, 1, 1)
	if err != ErrCannotPublish {
		t.Errorf("Expected ErrCannotPublish, got %v", err)
	}

	// Verify no version snapshot was created
	_, err = svc.versionRepo.FindByPageKeyAndVersion(ctx, model.PageKeyHome, 1)
	if err == nil {
		t.Error("Expected error when fetching non-existent version, got nil")
	}
}

func TestContentService_Publish_MissingTranslation(t *testing.T) {
	svc, _, cleanup := setupContentServiceTest(t)
	defer cleanup()

	ctx := context.Background()

	// Create document with missing English translation
	doc := &model.ContentDocument{
		PageKey:          model.PageKeyHome,
		DraftVersion:     1,
		PublishedVersion: 0,
		DraftConfig: model.JSONMap{
			"hero": map[string]interface{}{
				"title": map[string]interface{}{
					"zh": "欢迎",
					"en": "", // Missing translation
				},
				"subtitle": map[string]interface{}{
					"zh": "副标题",
					"en": "Subtitle",
				},
				"backgroundImage": map[string]interface{}{
					"url": "/hero.jpg",
					"alt": map[string]interface{}{
						"zh": "背景",
						"en": "Background",
					},
				},
			},
			"about": map[string]interface{}{
				"title": map[string]interface{}{
					"zh": "关于",
					"en": "About",
				},
				"description": map[string]interface{}{
					"zh": "描述",
					"en": "Description",
				},
			},
			"advantages": []interface{}{},
			"coreServices": []interface{}{},
		},
		PublishedConfig: model.JSONMap{},
	}

	if err := svc.docRepo.Create(ctx, doc); err != nil {
		t.Fatalf("Failed to create test document: %v", err)
	}

	// Attempt publish with missing translation
	_, err := svc.Publish(ctx, model.PageKeyHome, 1, 1)
	if err != ErrCannotPublish {
		t.Errorf("Expected ErrCannotPublish, got %v", err)
	}
}

func TestContentService_Publish_DocumentNotFound(t *testing.T) {
	svc, _, cleanup := setupContentServiceTest(t)
	defer cleanup()

	ctx := context.Background()

	// Attempt publish on non-existent document
	_, err := svc.Publish(ctx, model.PageKeyHome, 1, 1)
	if err != ErrDocumentNotFound {
		t.Errorf("Expected ErrDocumentNotFound, got %v", err)
	}
}

func TestContentService_Rollback_Success(t *testing.T) {
	svc, _, cleanup := setupContentServiceTest(t)
	defer cleanup()

	ctx := context.Background()

	// Create initial document
	doc := &model.ContentDocument{
		PageKey:          model.PageKeyHome,
		DraftVersion:     3,
		PublishedVersion: 2,
		DraftConfig:      model.JSONMap{"current": "v3"},
		PublishedConfig:  model.JSONMap{"current": "v2"},
	}

	if err := svc.docRepo.Create(ctx, doc); err != nil {
		t.Fatalf("Failed to create test document: %v", err)
	}

	// Create historical version snapshots
	publishedAt1 := time.Now().UTC().Add(-2 * time.Hour)
	version1 := &model.ContentVersion{
		PageKey:     model.PageKeyHome,
		Version:     1,
		Config:      model.JSONMap{"current": "v1"},
		PublishedAt: publishedAt1,
		CreatedBy:   1,
	}
	if err := svc.versionRepo.Create(ctx, version1); err != nil {
		t.Fatalf("Failed to create version 1: %v", err)
	}

	publishedAt2 := time.Now().UTC().Add(-1 * time.Hour)
	version2 := &model.ContentVersion{
		PageKey:     model.PageKeyHome,
		Version:     2,
		Config:      model.JSONMap{"current": "v2"},
		PublishedAt: publishedAt2,
		CreatedBy:   1,
	}
	if err := svc.versionRepo.Create(ctx, version2); err != nil {
		t.Fatalf("Failed to create version 2: %v", err)
	}

	// Rollback to version 1
	result, err := svc.Rollback(ctx, model.PageKeyHome, 1, 1)
	if err != nil {
		t.Fatalf("Rollback failed: %v", err)
	}

	// Verify result
	if result.PageKey != model.PageKeyHome {
		t.Errorf("Expected pageKey %s, got %s", model.PageKeyHome, result.PageKey)
	}
	if result.PublishedVersion != 3 {
		t.Errorf("Expected new published version 3, got %d", result.PublishedVersion)
	}
	if result.SourceVersion != 1 {
		t.Errorf("Expected source version 1, got %d", result.SourceVersion)
	}
	if result.PublishedAt.IsZero() {
		t.Error("Expected non-zero publishedAt")
	}

	// Verify new version snapshot was created
	version3, err := svc.versionRepo.FindByPageKeyAndVersion(ctx, model.PageKeyHome, 3)
	if err != nil {
		t.Fatalf("Failed to fetch version 3: %v", err)
	}
	if version3.CreatedBy != 1 {
		t.Errorf("Expected createdBy 1, got %d", version3.CreatedBy)
	}
	if version3.Config["current"] != "v1" {
		t.Errorf("Expected config from v1, got %v", version3.Config)
	}

	// Verify published config was updated
	updatedDoc, err := svc.docRepo.FindByPageKey(ctx, model.PageKeyHome)
	if err != nil {
		t.Fatalf("Failed to fetch updated document: %v", err)
	}
	if updatedDoc.PublishedVersion != 3 {
		t.Errorf("Expected published version 3, got %d", updatedDoc.PublishedVersion)
	}
	if updatedDoc.PublishedConfig["current"] != "v1" {
		t.Errorf("Expected published config from v1, got %v", updatedDoc.PublishedConfig)
	}

	// Verify original versions were NOT mutated
	originalV1, err := svc.versionRepo.FindByPageKeyAndVersion(ctx, model.PageKeyHome, 1)
	if err != nil {
		t.Fatalf("Failed to fetch original version 1: %v", err)
	}
	if originalV1.Config["current"] != "v1" {
		t.Error("Original version 1 was mutated")
	}

	originalV2, err := svc.versionRepo.FindByPageKeyAndVersion(ctx, model.PageKeyHome, 2)
	if err != nil {
		t.Fatalf("Failed to fetch original version 2: %v", err)
	}
	if originalV2.Config["current"] != "v2" {
		t.Error("Original version 2 was mutated")
	}
}

func TestContentService_Rollback_VersionNotFound(t *testing.T) {
	svc, _, cleanup := setupContentServiceTest(t)
	defer cleanup()

	ctx := context.Background()

	// Create document
	doc := &model.ContentDocument{
		PageKey:          model.PageKeyHome,
		DraftVersion:     2,
		PublishedVersion: 1,
		DraftConfig:      model.JSONMap{"current": "v2"},
		PublishedConfig:  model.JSONMap{"current": "v1"},
	}

	if err := svc.docRepo.Create(ctx, doc); err != nil {
		t.Fatalf("Failed to create test document: %v", err)
	}

	// Attempt rollback to non-existent version
	_, err := svc.Rollback(ctx, model.PageKeyHome, 99, 1)
	if err != ErrVersionNotFound {
		t.Errorf("Expected ErrVersionNotFound, got %v", err)
	}
}

func TestContentService_Rollback_DocumentNotFound(t *testing.T) {
	svc, _, cleanup := setupContentServiceTest(t)
	defer cleanup()

	ctx := context.Background()

	// Create a version but no document (simulate orphaned version)
	publishedAt := time.Now().UTC()
	version := &model.ContentVersion{
		PageKey:     model.PageKeyHome,
		Version:     1,
		Config:      model.JSONMap{"test": "data"},
		PublishedAt: publishedAt,
		CreatedBy:   1,
	}
	if err := svc.versionRepo.Create(ctx, version); err != nil {
		t.Fatalf("Failed to create test version: %v", err)
	}

	// Attempt rollback when document doesn't exist
	_, err := svc.Rollback(ctx, model.PageKeyHome, 1, 1)
	if err != ErrDocumentNotFound {
		t.Errorf("Expected ErrDocumentNotFound, got %v", err)
	}
}

func TestContentService_MultiplePublishSequence(t *testing.T) {
	svc, _, cleanup := setupContentServiceTest(t)
	defer cleanup()

	ctx := context.Background()

	// Create initial document using simpler Contact page
	doc := &model.ContentDocument{
		PageKey:          model.PageKeyContact,
		DraftVersion:     1,
		PublishedVersion: 0,
		DraftConfig: model.JSONMap{
			"hero": map[string]interface{}{
				"title":    map[string]interface{}{"zh": "v1", "en": "v1"},
				"subtitle": map[string]interface{}{"zh": "副标题", "en": "Subtitle"},
			},
			"form": map[string]interface{}{
				"title":       map[string]interface{}{"zh": "表单", "en": "Form"},
				"subtitle":    map[string]interface{}{"zh": "副标题", "en": "Subtitle"},
				"submitLabel": map[string]interface{}{"zh": "提交", "en": "Submit"},
			},
			"contactInfo": map[string]interface{}{
				"phone":   map[string]interface{}{"zh": "电话", "en": "Phone"},
				"address": map[string]interface{}{"zh": "地址", "en": "Address"},
			},
		},
		PublishedConfig: model.JSONMap{},
	}

	if err := svc.docRepo.Create(ctx, doc); err != nil {
		t.Fatalf("Failed to create test document: %v", err)
	}

	// First publish
	result1, err := svc.Publish(ctx, model.PageKeyContact, 1, 1)
	if err != nil {
		t.Fatalf("First publish failed: %v", err)
	}
	if result1.PublishedVersion != 1 {
		t.Errorf("Expected published version 1, got %d", result1.PublishedVersion)
	}

	// Update draft
	_, err = svc.docRepo.UpdateDraft(ctx, model.PageKeyContact, 1, model.JSONMap{
		"hero": map[string]interface{}{
			"title":    map[string]interface{}{"zh": "v2", "en": "v2"},
			"subtitle": map[string]interface{}{"zh": "副标题", "en": "Subtitle"},
		},
		"form": map[string]interface{}{
			"title":       map[string]interface{}{"zh": "表单", "en": "Form"},
			"subtitle":    map[string]interface{}{"zh": "副标题", "en": "Subtitle"},
			"submitLabel": map[string]interface{}{"zh": "提交", "en": "Submit"},
		},
		"contactInfo": map[string]interface{}{
			"phone":   map[string]interface{}{"zh": "电话", "en": "Phone"},
			"address": map[string]interface{}{"zh": "地址", "en": "Address"},
		},
	})
	if err != nil {
		t.Fatalf("Failed to update draft: %v", err)
	}

	// Second publish
	result2, err := svc.Publish(ctx, model.PageKeyContact, 2, 1)
	if err != nil {
		t.Fatalf("Second publish failed: %v", err)
	}
	if result2.PublishedVersion != 2 {
		t.Errorf("Expected published version 2, got %d", result2.PublishedVersion)
	}

	// Verify both versions exist
	v1, err := svc.versionRepo.FindByPageKeyAndVersion(ctx, model.PageKeyContact, 1)
	if err != nil {
		t.Fatalf("Failed to fetch version 1: %v", err)
	}
	if v1.CreatedBy != 1 {
		t.Errorf("Expected createdBy 1, got %d", v1.CreatedBy)
	}

	v2, err := svc.versionRepo.FindByPageKeyAndVersion(ctx, model.PageKeyContact, 2)
	if err != nil {
		t.Fatalf("Failed to fetch version 2: %v", err)
	}
	if v2.CreatedBy != 1 {
		t.Errorf("Expected createdBy 1, got %d", v2.CreatedBy)
	}
}

func TestContentService_TransactionRollback(t *testing.T) {
	svc, _, cleanup := setupContentServiceTest(t)
	defer cleanup()

	ctx := context.Background()

	// Create document with valid config
	doc := &model.ContentDocument{
		PageKey:          model.PageKeyHome,
		DraftVersion:     1,
		PublishedVersion: 0,
		DraftConfig: model.JSONMap{
			"hero": map[string]interface{}{
				"title": map[string]interface{}{"zh": "标题", "en": "Title"},
				"subtitle": map[string]interface{}{"zh": "副标题", "en": "Subtitle"},
				"backgroundImage": map[string]interface{}{
					"url": "/hero.jpg",
					"alt": map[string]interface{}{"zh": "背景", "en": "Background"},
				},
			},
			"about": map[string]interface{}{
				"title": map[string]interface{}{"zh": "关于", "en": "About"},
				"description": map[string]interface{}{"zh": "描述", "en": "Description"},
			},
			"advantages": []interface{}{},
			"coreServices": []interface{}{},
		},
		PublishedConfig: model.JSONMap{},
	}

	if err := svc.docRepo.Create(ctx, doc); err != nil {
		t.Fatalf("Failed to create test document: %v", err)
	}

	// Attempt publish with wrong version (should fail)
	_, err := svc.Publish(ctx, model.PageKeyHome, 99, 1)
	if err != ErrVersionMismatch {
		t.Errorf("Expected ErrVersionMismatch, got %v", err)
	}

	// Verify transaction rollback: no version created
	versions, _, err := svc.versionRepo.ListByPageKey(ctx, model.PageKeyHome, 0, 10)
	if err != nil {
		t.Fatalf("Failed to list versions: %v", err)
	}
	if len(versions) != 0 {
		t.Errorf("Expected 0 versions after failed publish, got %d", len(versions))
	}

	// Verify transaction rollback: published config unchanged
	updatedDoc, err := svc.docRepo.FindByPageKey(ctx, model.PageKeyHome)
	if err != nil {
		t.Fatalf("Failed to fetch document: %v", err)
	}
	if updatedDoc.PublishedVersion != 0 {
		t.Errorf("Expected published version 0 (unchanged), got %d", updatedDoc.PublishedVersion)
	}
}
