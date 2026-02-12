package model

import (
	"errors"
	"time"
)

// RefreshToken represents a refresh token in the system
type RefreshToken struct {
	ID        uint      `gorm:"primaryKey"`
	UserID    uint      `gorm:"not null;index:idx_refresh_token_user_id"`
	Token     string    `gorm:"uniqueIndex;not null;size:500"`
	ExpiresAt time.Time `gorm:"not null"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
	User      User      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
}

// TableName overrides the default table name
func (RefreshToken) TableName() string {
	return "refresh_tokens"
}

// Validate validates the refresh token model
func (rt *RefreshToken) Validate() error {
	if rt.UserID == 0 {
		return errors.New("user_id is required")
	}
	if rt.Token == "" {
		return errors.New("token is required")
	}
	if rt.ExpiresAt.IsZero() {
		return errors.New("expires_at is required")
	}
	return nil
}

// IsExpired checks if the token has expired
func (rt *RefreshToken) IsExpired() bool {
	return time.Now().After(rt.ExpiresAt)
}
