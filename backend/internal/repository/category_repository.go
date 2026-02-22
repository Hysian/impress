package repository

import (
	"context"

	"blotting-consultancy/internal/model"
)

// CategoryRepository defines the interface for category data access
type CategoryRepository interface {
	// Create creates a new category
	Create(ctx context.Context, category *model.Category) error

	// FindByID finds a category by ID
	FindByID(ctx context.Context, id uint) (*model.Category, error)

	// Update updates a category
	Update(ctx context.Context, category *model.Category) error

	// Delete deletes a category by ID
	Delete(ctx context.Context, id uint) error

	// List returns all categories
	List(ctx context.Context) ([]*model.Category, error)
}
