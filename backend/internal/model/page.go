package model

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

// PageStatus represents the publication status of a page
type PageStatus string

const (
	PageStatusDraft     PageStatus = "draft"
	PageStatusPublished PageStatus = "published"
)

// Page represents a dynamic page with bilingual support
type Page struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	Slug           string         `gorm:"uniqueIndex;size:255;not null" json:"slug"`
	ParentID       *uint          `gorm:"index" json:"parentId"`
	Parent         *Page          `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Title          JSONMap        `gorm:"type:jsonb" json:"title"`
	Template       string         `gorm:"size:50;default:'default'" json:"template"`
	Config         JSONMap        `gorm:"type:jsonb" json:"config"`
	Status         PageStatus     `gorm:"size:20;default:'draft';index" json:"status"`
	SortOrder      int            `gorm:"default:0" json:"sortOrder"`
	SeoTitle       JSONMap        `gorm:"type:jsonb" json:"seoTitle"`
	SeoDescription JSONMap        `gorm:"type:jsonb" json:"seoDescription"`
	CreatedAt      time.Time      `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt      time.Time      `gorm:"autoUpdateTime" json:"updatedAt"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName overrides the default table name
func (Page) TableName() string {
	return "pages"
}

// Validate validates the page model
func (p *Page) Validate() error {
	if p.Slug == "" {
		return errors.New("slug is required")
	}
	if p.Status != PageStatusDraft && p.Status != PageStatusPublished {
		return errors.New("status must be draft or published")
	}
	return nil
}

// BeforeSave hook to ensure JSON fields are initialized
func (p *Page) BeforeSave(tx *gorm.DB) error {
	if p.Title == nil {
		p.Title = make(JSONMap)
	}
	if p.Config == nil {
		p.Config = make(JSONMap)
	}
	if p.SeoTitle == nil {
		p.SeoTitle = make(JSONMap)
	}
	if p.SeoDescription == nil {
		p.SeoDescription = make(JSONMap)
	}
	if p.Template == "" {
		p.Template = "default"
	}
	if p.Status == "" {
		p.Status = PageStatusDraft
	}
	return nil
}
