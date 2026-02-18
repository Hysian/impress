package content

import (
	"context"

	"blotting-consultancy/internal/model"
	"blotting-consultancy/internal/repository"
	"blotting-consultancy/internal/service"
	"blotting-consultancy/pkg/audit"
	"gorm.io/gorm"
)

// ValidationService interface defines validation operations
type ValidationService interface {
	ValidateConfig(pageKey model.PageKey, config model.JSONMap) *service.ValidationResult
	CanPublish(result *service.ValidationResult) bool
}

// ContentService interface defines content publishing operations
type ContentService interface {
	Publish(ctx context.Context, pageKey model.PageKey, expectedDraftVersion int, createdBy uint) (*service.PublishResult, error)
	Rollback(ctx context.Context, pageKey model.PageKey, sourceVersion int, createdBy uint) (*service.RollbackResult, error)
}

// Handler handles admin content-related HTTP requests
type Handler struct {
	db            *gorm.DB
	docRepo       repository.ContentDocumentRepository
	versionRepo   repository.ContentVersionRepository
	validationSvc ValidationService
	contentSvc    ContentService
	auditLog      *audit.Logger
}

// NewHandler creates a new content handler
func NewHandler(
	db *gorm.DB,
	docRepo repository.ContentDocumentRepository,
	versionRepo repository.ContentVersionRepository,
	validationSvc ValidationService,
	contentSvc ContentService,
	auditLog *audit.Logger,
) *Handler {
	return &Handler{
		db:            db,
		docRepo:       docRepo,
		versionRepo:   versionRepo,
		validationSvc: validationSvc,
		contentSvc:    contentSvc,
		auditLog:      auditLog,
	}
}
