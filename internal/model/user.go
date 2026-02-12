package model

import (
	"errors"
	"time"
)

// Role represents user role enum
type Role string

const (
	RoleAdmin  Role = "admin"
	RoleEditor Role = "editor"
)

// ValidRoles contains all valid role values
var ValidRoles = []Role{RoleAdmin, RoleEditor}

// IsValid checks if a role value is valid
func (r Role) IsValid() bool {
	for _, valid := range ValidRoles {
		if r == valid {
			return true
		}
	}
	return false
}

// String returns the string representation of the role
func (r Role) String() string {
	return string(r)
}

// User represents a user in the system
type User struct {
	ID           uint      `gorm:"primaryKey"`
	Username     string    `gorm:"uniqueIndex;not null;size:100"`
	PasswordHash string    `gorm:"not null;size:255"`
	Role         Role      `gorm:"not null;size:20"`
	CreatedAt    time.Time `gorm:"autoCreateTime"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime"`
}

// TableName overrides the default table name
func (User) TableName() string {
	return "users"
}

// Validate validates the user model
func (u *User) Validate() error {
	if u.Username == "" {
		return errors.New("username is required")
	}
	if u.PasswordHash == "" {
		return errors.New("password hash is required")
	}
	if !u.Role.IsValid() {
		return errors.New("role must be 'admin' or 'editor'")
	}
	return nil
}
