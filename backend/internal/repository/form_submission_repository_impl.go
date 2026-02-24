package repository

import (
	"context"
	"errors"

	"blotting-consultancy/internal/model"

	"gorm.io/gorm"
)

// GormFormSubmissionRepository implements FormSubmissionRepository using GORM
type GormFormSubmissionRepository struct {
	db *gorm.DB
}

// NewGormFormSubmissionRepository creates a new GormFormSubmissionRepository
func NewGormFormSubmissionRepository(db *gorm.DB) FormSubmissionRepository {
	return &GormFormSubmissionRepository{db: db}
}

// Create creates a new form submission
func (r *GormFormSubmissionRepository) Create(ctx context.Context, submission *model.FormSubmission) error {
	if err := submission.Validate(); err != nil {
		return err
	}
	return r.db.WithContext(ctx).Create(submission).Error
}

// FindByID finds a form submission by ID
func (r *GormFormSubmissionRepository) FindByID(ctx context.Context, id uint) (*model.FormSubmission, error) {
	var submission model.FormSubmission
	err := r.db.WithContext(ctx).First(&submission, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("submission not found")
		}
		return nil, err
	}
	return &submission, nil
}

// List returns form submissions with optional filters, ordered by created_at DESC
func (r *GormFormSubmissionRepository) List(ctx context.Context, offset, limit int, formType string, status string) ([]*model.FormSubmission, int64, error) {
	var submissions []*model.FormSubmission
	var total int64

	query := r.db.WithContext(ctx).Model(&model.FormSubmission{})

	if formType != "" {
		query = query.Where("form_type = ?", formType)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&submissions).Error; err != nil {
		return nil, 0, err
	}

	return submissions, total, nil
}

// Update updates an existing form submission
func (r *GormFormSubmissionRepository) Update(ctx context.Context, submission *model.FormSubmission) error {
	if err := submission.Validate(); err != nil {
		return err
	}
	return r.db.WithContext(ctx).Save(submission).Error
}

// Delete soft-deletes a form submission by ID
func (r *GormFormSubmissionRepository) Delete(ctx context.Context, id uint) error {
	result := r.db.WithContext(ctx).Delete(&model.FormSubmission{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("submission not found")
	}
	return nil
}

// BulkUpdateStatus updates the status of multiple form submissions
func (r *GormFormSubmissionRepository) BulkUpdateStatus(ctx context.Context, ids []uint, status model.SubmissionStatus) error {
	if status != model.SubmissionStatusUnread && status != model.SubmissionStatusRead && status != model.SubmissionStatusArchived {
		return errors.New("status must be unread, read, or archived")
	}
	return r.db.WithContext(ctx).
		Model(&model.FormSubmission{}).
		Where("id IN ?", ids).
		Update("status", status).Error
}

// CountByStatus returns a map of status to count, optionally filtered by formType
func (r *GormFormSubmissionRepository) CountByStatus(ctx context.Context, formType string) (map[string]int64, error) {
	type statusCount struct {
		Status string
		Count  int64
	}

	var results []statusCount

	query := r.db.WithContext(ctx).
		Model(&model.FormSubmission{}).
		Select("status, COUNT(*) as count")

	if formType != "" {
		query = query.Where("form_type = ?", formType)
	}

	if err := query.Group("status").Scan(&results).Error; err != nil {
		return nil, err
	}

	counts := make(map[string]int64)
	for _, r := range results {
		counts[r.Status] = r.Count
	}

	return counts, nil
}
