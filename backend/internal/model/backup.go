package model

import "time"

// BackupRecord represents a database backup entry
type BackupRecord struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Filename  string    `gorm:"not null;size:255" json:"filename"`
	Size      int64     `json:"size"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

// TableName overrides the default table name
func (BackupRecord) TableName() string {
	return "backup_records"
}
