package model

import "time"

// AuditEvent represents a persisted audit log entry
type AuditEvent struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Action    string    `gorm:"not null;size:50;index" json:"action"`
	Actor     string    `gorm:"not null;size:100;index" json:"actor"`
	Resource  string    `gorm:"not null;size:100" json:"resource"`
	Result    string    `gorm:"not null;size:20" json:"result"`
	Details   string    `gorm:"type:text" json:"details"` // JSON string
	CreatedAt time.Time `gorm:"autoCreateTime;index" json:"createdAt"`
}

// TableName overrides the default table name
func (AuditEvent) TableName() string {
	return "audit_events"
}
