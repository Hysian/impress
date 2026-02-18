package repository

import (
	"context"

	"blotting-consultancy/internal/model"
)

// MediaRepository defines the interface for media data access
type MediaRepository interface {
	// Create creates a new media record
	Create(ctx context.Context, media *model.Media) error

	// FindByID finds a media record by ID
	FindByID(ctx context.Context, id uint) (*model.Media, error)

	// List returns a paginated list of media records
	List(ctx context.Context, offset, limit int) ([]*model.Media, int64, error)

	// Delete deletes a media record by ID
	Delete(ctx context.Context, id uint) error
}
