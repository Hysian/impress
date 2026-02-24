package model

import (
	"time"

	"gorm.io/gorm"
)

// InstalledTheme represents a theme plugin installed in the system
type InstalledTheme struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	ThemeID     string         `gorm:"uniqueIndex;size:100;not null" json:"themeId"`
	Name        string         `gorm:"size:200;not null" json:"name"`
	NameZh      string         `gorm:"size:200" json:"nameZh"`
	Description string         `gorm:"size:1000" json:"description"`
	Author      string         `gorm:"size:200" json:"author"`
	Version     string         `gorm:"size:50" json:"version"`
	Source      string         `gorm:"size:20;not null;default:'built-in'" json:"source"`
	ExternalURL string         `gorm:"size:500" json:"externalUrl,omitempty"`
	IsActive    bool           `gorm:"default:false;index" json:"isActive"`
	Preview     string         `gorm:"size:500" json:"preview"`
	Config      JSONMap        `gorm:"type:jsonb" json:"config"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName overrides the default table name
func (InstalledTheme) TableName() string {
	return "installed_themes"
}
