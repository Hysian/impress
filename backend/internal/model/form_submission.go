package model

import (
	"errors"
	"regexp"
	"time"

	"gorm.io/gorm"
)

type SubmissionStatus string

const (
	SubmissionStatusUnread   SubmissionStatus = "unread"
	SubmissionStatusRead     SubmissionStatus = "read"
	SubmissionStatusArchived SubmissionStatus = "archived"
)

type FormSubmission struct {
	ID        uint             `gorm:"primaryKey" json:"id"`
	FormType  string           `gorm:"not null;size:50;index" json:"formType"`
	Name      string           `gorm:"not null;size:200" json:"name"`
	Email     string           `gorm:"not null;size:200" json:"email"`
	Phone     string           `gorm:"size:50" json:"phone"`
	Company   string           `gorm:"size:200" json:"company"`
	Message   string           `gorm:"type:text" json:"message"`
	SourceURL string           `gorm:"size:500" json:"sourceUrl"`
	Locale    string           `gorm:"size:10" json:"locale"`
	IPAddress string           `gorm:"size:45" json:"ipAddress"`
	Status    SubmissionStatus `gorm:"not null;size:20;default:unread;index" json:"status"`
	Metadata  JSONMap          `gorm:"type:jsonb" json:"metadata"`
	CreatedAt time.Time        `gorm:"autoCreateTime;index" json:"createdAt"`
	UpdatedAt time.Time        `gorm:"autoUpdateTime" json:"updatedAt"`
	DeletedAt gorm.DeletedAt   `gorm:"index" json:"-"`
}

func (FormSubmission) TableName() string {
	return "form_submissions"
}

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

func (f *FormSubmission) Validate() error {
	if f.FormType == "" {
		return errors.New("formType is required")
	}
	if f.Name == "" {
		return errors.New("name is required")
	}
	if f.Email == "" {
		return errors.New("email is required")
	}
	if !emailRegex.MatchString(f.Email) {
		return errors.New("invalid email format")
	}
	if f.Status != "" && f.Status != SubmissionStatusUnread && f.Status != SubmissionStatusRead && f.Status != SubmissionStatusArchived {
		return errors.New("status must be unread, read, or archived")
	}
	return nil
}

func (f *FormSubmission) BeforeSave(tx *gorm.DB) error {
	if f.Metadata == nil {
		f.Metadata = make(JSONMap)
	}
	if f.Status == "" {
		f.Status = SubmissionStatusUnread
	}
	return nil
}
