package model

import (
	"errors"
	"time"
)

// ArticleStatus represents the publication status of an article
type ArticleStatus string

const (
	ArticleStatusDraft     ArticleStatus = "draft"
	ArticleStatusPublished ArticleStatus = "published"
)

// Article represents a bilingual article
type Article struct {
	ID                uint          `gorm:"primaryKey" json:"id"`
	Slug              string        `gorm:"uniqueIndex;not null;size:200" json:"slug"`
	Status            ArticleStatus `gorm:"not null;size:20;default:draft;index" json:"status"`
	ZhTitle           string        `gorm:"not null;size:500" json:"zhTitle"`
	EnTitle           string        `gorm:"size:500" json:"enTitle"`
	ZhBody            string        `gorm:"type:text" json:"zhBody"`
	EnBody            string        `gorm:"type:text" json:"enBody"`
	CoverImage        string        `gorm:"size:500" json:"coverImage"`
	ZhSeoTitle        string        `gorm:"size:200" json:"zhSeoTitle"`
	EnSeoTitle        string        `gorm:"size:200" json:"enSeoTitle"`
	ZhMetaDescription string        `gorm:"size:500" json:"zhMetaDescription"`
	EnMetaDescription string        `gorm:"size:500" json:"enMetaDescription"`
	OgImage           string        `gorm:"size:500" json:"ogImage"`
	CategoryID        *uint         `gorm:"index" json:"categoryId"`
	Category          *Category     `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	Tags              []Tag         `gorm:"many2many:article_tags" json:"tags,omitempty"`
	PublishedAt       *time.Time    `json:"publishedAt"`
	CreatedAt         time.Time     `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt         time.Time     `gorm:"autoUpdateTime" json:"updatedAt"`
}

// Validate validates the article model
func (a *Article) Validate() error {
	if a.Slug == "" {
		return errors.New("slug is required")
	}
	if a.ZhTitle == "" {
		return errors.New("zhTitle is required")
	}
	if a.Status != ArticleStatusDraft && a.Status != ArticleStatusPublished {
		return errors.New("status must be draft or published")
	}
	return nil
}
