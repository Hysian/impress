package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"blotting-consultancy/internal/model"
	"blotting-consultancy/internal/repository"
	"gorm.io/gorm"
)

var (
	// ErrVersionMismatch is returned when expected draft version does not match
	ErrVersionMismatch = errors.New("draft version mismatch")
	// ErrCannotPublish is returned when validation fails or translation state blocks publish
	ErrCannotPublish = errors.New("cannot publish: validation failed or required translations missing/stale")
	// ErrVersionNotFound is returned when requested version does not exist
	ErrVersionNotFound = errors.New("version not found")
	// ErrDocumentNotFound is returned when content document does not exist
	ErrDocumentNotFound = errors.New("content document not found")
)

// ContentService provides transactional publish/rollback operations
type ContentService struct {
	db              *gorm.DB
	docRepo         repository.ContentDocumentRepository
	versionRepo     repository.ContentVersionRepository
	validationSvc   *ValidationService
}

// NewContentService creates a new content service
func NewContentService(
	db *gorm.DB,
	docRepo repository.ContentDocumentRepository,
	versionRepo repository.ContentVersionRepository,
	validationSvc *ValidationService,
) *ContentService {
	return &ContentService{
		db:            db,
		docRepo:       docRepo,
		versionRepo:   versionRepo,
		validationSvc: validationSvc,
	}
}

// PublishResult represents the result of a publish operation
type PublishResult struct {
	PageKey          model.PageKey
	PublishedVersion int
	PublishedAt      time.Time
}

// RollbackResult represents the result of a rollback operation
type RollbackResult struct {
	PageKey          model.PageKey
	PublishedVersion int
	SourceVersion    int
	PublishedAt      time.Time
}

// Publish atomically publishes a draft configuration with validation
// It validates the expected draft version before committing, creates a version snapshot,
// and updates the published config in a single transaction
func (cs *ContentService) Publish(
	ctx context.Context,
	pageKey model.PageKey,
	expectedDraftVersion int,
	createdBy uint,
) (*PublishResult, error) {
	var result *PublishResult

	// Execute in transaction
	err := cs.db.Transaction(func(tx *gorm.DB) error {
		// Create transaction-scoped repositories
		txDocRepo := repository.NewGormContentDocumentRepository(tx)
		txVersionRepo := repository.NewGormContentVersionRepository(tx)

		// 1. Fetch current document to validate version and config
		doc, err := txDocRepo.FindByPageKey(ctx, pageKey)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) || err.Error() == "content document not found" {
				return ErrDocumentNotFound
			}
			return fmt.Errorf("failed to fetch document: %w", err)
		}

		// 2. Validate expected draft version
		if doc.DraftVersion != expectedDraftVersion {
			return ErrVersionMismatch
		}

		// 3. Validate draft config and translation state
		validationResult := cs.validationSvc.ValidateConfig(pageKey, doc.DraftConfig)
		if !cs.validationSvc.CanPublish(validationResult) {
			return ErrCannotPublish
		}

		// 4. Create version snapshot
		newPublishedVersion := doc.PublishedVersion + 1
		publishedAt := time.Now().UTC()

		version := &model.ContentVersion{
			PageKey:     pageKey,
			Version:     newPublishedVersion,
			Config:      doc.DraftConfig,
			PublishedAt: publishedAt,
			CreatedBy:   createdBy,
		}

		if err := txVersionRepo.Create(ctx, version); err != nil {
			return fmt.Errorf("failed to create version snapshot: %w", err)
		}

		// 5. Update published config and version atomically
		if err := txDocRepo.UpdatePublished(ctx, pageKey, doc.DraftConfig, newPublishedVersion); err != nil {
			return fmt.Errorf("failed to update published config: %w", err)
		}

		result = &PublishResult{
			PageKey:          pageKey,
			PublishedVersion: newPublishedVersion,
			PublishedAt:      publishedAt,
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return result, nil
}

// Rollback creates a new published version from a historical snapshot
// It does NOT mutate old versions; instead, it creates a new published version
// with the config from the specified source version
func (cs *ContentService) Rollback(
	ctx context.Context,
	pageKey model.PageKey,
	sourceVersion int,
	createdBy uint,
) (*RollbackResult, error) {
	var result *RollbackResult

	// Execute in transaction
	err := cs.db.Transaction(func(tx *gorm.DB) error {
		// Create transaction-scoped repositories
		txDocRepo := repository.NewGormContentDocumentRepository(tx)
		txVersionRepo := repository.NewGormContentVersionRepository(tx)

		// 1. Fetch source version snapshot
		sourceVersionRecord, err := txVersionRepo.FindByPageKeyAndVersion(ctx, pageKey, sourceVersion)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) || err.Error() == "content version not found" {
				return ErrVersionNotFound
			}
			return fmt.Errorf("failed to fetch source version: %w", err)
		}

		// 2. Fetch current document
		doc, err := txDocRepo.FindByPageKey(ctx, pageKey)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) || err.Error() == "content document not found" {
				return ErrDocumentNotFound
			}
			return fmt.Errorf("failed to fetch document: %w", err)
		}

		// 3. Create new published version from historical snapshot
		newPublishedVersion := doc.PublishedVersion + 1
		publishedAt := time.Now().UTC()

		version := &model.ContentVersion{
			PageKey:     pageKey,
			Version:     newPublishedVersion,
			Config:      sourceVersionRecord.Config,
			PublishedAt: publishedAt,
			CreatedBy:   createdBy,
		}

		if err := txVersionRepo.Create(ctx, version); err != nil {
			return fmt.Errorf("failed to create rollback version: %w", err)
		}

		// 4. Update published config and version atomically
		if err := txDocRepo.UpdatePublished(ctx, pageKey, sourceVersionRecord.Config, newPublishedVersion); err != nil {
			return fmt.Errorf("failed to update published config: %w", err)
		}

		result = &RollbackResult{
			PageKey:          pageKey,
			PublishedVersion: newPublishedVersion,
			SourceVersion:    sourceVersion,
			PublishedAt:      publishedAt,
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return result, nil
}
