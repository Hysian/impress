package model

import "time"

// SiteUser represents the many-to-many relationship between sites and users,
// with a site-scoped role assignment. A user can have different roles on
// different sites.
type SiteUser struct {
	SiteID    uint      `gorm:"primaryKey" json:"siteId"`
	UserID    uint      `gorm:"primaryKey" json:"userId"`
	RoleID    uint      `gorm:"not null;index" json:"roleId"`
	Site      *Site     `gorm:"foreignKey:SiteID" json:"site,omitempty"`
	User      *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Role      *RBACRole `gorm:"foreignKey:RoleID" json:"role,omitempty"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

// TableName overrides the default table name
func (SiteUser) TableName() string {
	return "site_users"
}
