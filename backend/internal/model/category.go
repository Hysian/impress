package model

import "errors"

// Category represents an article category
type Category struct {
	ID     uint   `gorm:"primaryKey" json:"id"`
	Slug   string `gorm:"uniqueIndex;not null;size:100" json:"slug"`
	ZhName string `gorm:"not null;size:100" json:"zhName"`
	EnName string `gorm:"size:100" json:"enName"`
}

// Validate validates the category model
func (c *Category) Validate() error {
	if c.Slug == "" {
		return errors.New("slug is required")
	}
	if c.ZhName == "" {
		return errors.New("zhName is required")
	}
	return nil
}
