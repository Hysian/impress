package repository

import (
	"context"
	"errors"

	"blotting-consultancy/internal/model"

	"gorm.io/gorm"
)

// GormMediaRepository implements MediaRepository using GORM
type GormMediaRepository struct {
	db *gorm.DB
}

// NewGormMediaRepository creates a new GormMediaRepository
func NewGormMediaRepository(db *gorm.DB) MediaRepository {
	return &GormMediaRepository{db: db}
}

// Create creates a new media record
func (r *GormMediaRepository) Create(ctx context.Context, media *model.Media) error {
	if err := media.Validate(); err != nil {
		return err
	}
	return r.db.WithContext(ctx).Create(media).Error
}

// FindByID finds a media record by ID
func (r *GormMediaRepository) FindByID(ctx context.Context, id uint) (*model.Media, error) {
	var media model.Media
	err := r.db.WithContext(ctx).First(&media, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("media not found")
		}
		return nil, err
	}
	return &media, nil
}

// List returns a paginated list of media records ordered by creation time (newest first)
func (r *GormMediaRepository) List(ctx context.Context, offset, limit int) ([]*model.Media, int64, error) {
	var items []*model.Media
	var total int64

	if err := r.db.WithContext(ctx).Model(&model.Media{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := r.db.WithContext(ctx).
		Offset(offset).
		Limit(limit).
		Order("created_at DESC").
		Find(&items).Error; err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

// Delete deletes a media record by ID
func (r *GormMediaRepository) Delete(ctx context.Context, id uint) error {
	result := r.db.WithContext(ctx).Delete(&model.Media{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("media not found")
	}
	return nil
}
