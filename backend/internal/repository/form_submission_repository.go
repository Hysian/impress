package repository

import (
	"context"

	"blotting-consultancy/internal/model"
)

type FormSubmissionRepository interface {
	Create(ctx context.Context, submission *model.FormSubmission) error
	FindByID(ctx context.Context, id uint) (*model.FormSubmission, error)
	List(ctx context.Context, offset, limit int, formType string, status string) ([]*model.FormSubmission, int64, error)
	Update(ctx context.Context, submission *model.FormSubmission) error
	Delete(ctx context.Context, id uint) error
	BulkUpdateStatus(ctx context.Context, ids []uint, status model.SubmissionStatus) error
	CountByStatus(ctx context.Context, formType string) (map[string]int64, error)
}
