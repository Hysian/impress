package repository

import (
	"context"
	"errors"

	"blotting-consultancy/internal/model"

	"gorm.io/gorm"
)

// GormCategoryRepository implements CategoryRepository using GORM
type GormCategoryRepository struct {
	db *gorm.DB
}

// NewGormCategoryRepository creates a new GormCategoryRepository
func NewGormCategoryRepository(db *gorm.DB) CategoryRepository {
	return &GormCategoryRepository{db: db}
}

// Create creates a new category
func (r *GormCategoryRepository) Create(ctx context.Context, category *model.Category) error {
	if err := category.Validate(); err != nil {
		return err
	}
	return r.db.WithContext(ctx).Create(category).Error
}

// FindByID finds a category by ID
func (r *GormCategoryRepository) FindByID(ctx context.Context, id uint) (*model.Category, error) {
	var category model.Category
	err := r.db.WithContext(ctx).First(&category, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("category not found")
		}
		return nil, err
	}
	return &category, nil
}

// Update updates a category
func (r *GormCategoryRepository) Update(ctx context.Context, category *model.Category) error {
	if err := category.Validate(); err != nil {
		return err
	}
	result := r.db.WithContext(ctx).Save(category)
	return result.Error
}

// Delete deletes a category by ID
func (r *GormCategoryRepository) Delete(ctx context.Context, id uint) error {
	result := r.db.WithContext(ctx).Delete(&model.Category{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("category not found")
	}
	return nil
}

// List returns all categories
func (r *GormCategoryRepository) List(ctx context.Context) ([]*model.Category, error) {
	var items []*model.Category
	if err := r.db.WithContext(ctx).Order("id ASC").Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}
