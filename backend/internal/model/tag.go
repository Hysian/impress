package model

import "errors"

// Tag represents an article tag
type Tag struct {
	ID     uint   `gorm:"primaryKey" json:"id"`
	Slug   string `gorm:"uniqueIndex;not null;size:100" json:"slug"`
	ZhName string `gorm:"not null;size:100" json:"zhName"`
	EnName string `gorm:"size:100" json:"enName"`
}

// Validate validates the tag model
func (t *Tag) Validate() error {
	if t.Slug == "" {
		return errors.New("slug is required")
	}
	if t.ZhName == "" {
		return errors.New("zhName is required")
	}
	return nil
}
