package model

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

// ContentVersion represents a historical version of page content
type ContentVersion struct {
	ID          uint      `gorm:"primaryKey"`
	PageKey     PageKey   `gorm:"not null;size:50;index:idx_page_version,priority:1,unique"`
	Version     int       `gorm:"not null;index:idx_page_version,priority:2,unique"`
	Config      JSONMap   `gorm:"type:jsonb;not null"`
	PublishedAt time.Time `gorm:"not null"`
	CreatedBy   uint      `gorm:"not null;index"`
	CreatedAt   time.Time `gorm:"autoCreateTime"`
}

// TableName overrides the default table name
func (ContentVersion) TableName() string {
	return "content_versions"
}

// Validate validates the content version model
func (cv *ContentVersion) Validate() error {
	if !cv.PageKey.IsValid() {
		return errors.New("pageKey must be one of: home, about, advantages, core-services, cases, experts, contact, global")
	}
	if cv.Version <= 0 {
		return errors.New("version must be positive")
	}
	if cv.CreatedBy == 0 {
		return errors.New("createdBy is required")
	}
	if cv.PublishedAt.IsZero() {
		return errors.New("publishedAt is required")
	}
	return nil
}

// BeforeSave hook to ensure Config is initialized
func (cv *ContentVersion) BeforeSave(tx *gorm.DB) error {
	if cv.Config == nil {
		cv.Config = make(JSONMap)
	}
	return nil
}
