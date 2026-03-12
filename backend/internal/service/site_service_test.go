package service

import (
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// siteRow is a minimal table to test SiteScope
type siteRow struct {
	ID     uint `gorm:"primaryKey"`
	SiteID uint `gorm:"index"`
	Name   string
}

func (siteRow) TableName() string { return "site_rows" }

func TestSiteScope(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("failed to open in-memory db: %v", err)
	}

	if err := db.AutoMigrate(&siteRow{}); err != nil {
		t.Fatalf("AutoMigrate: %v", err)
	}

	// Seed data for two sites
	rows := []siteRow{
		{SiteID: 1, Name: "alpha"},
		{SiteID: 1, Name: "beta"},
		{SiteID: 2, Name: "gamma"},
	}
	for i := range rows {
		if err := db.Create(&rows[i]).Error; err != nil {
			t.Fatalf("Create: %v", err)
		}
	}

	// Scope to site 1 — expect 2 rows
	var result []siteRow
	if err := db.Scopes(SiteScope(1)).Find(&result).Error; err != nil {
		t.Fatalf("Scopes(SiteScope(1)): %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 rows for site 1, got %d", len(result))
	}

	// Scope to site 2 — expect 1 row
	var result2 []siteRow
	if err := db.Scopes(SiteScope(2)).Find(&result2).Error; err != nil {
		t.Fatalf("Scopes(SiteScope(2)): %v", err)
	}
	if len(result2) != 1 {
		t.Errorf("expected 1 row for site 2, got %d", len(result2))
	}

	// Scope to non-existent site — expect 0 rows
	var result3 []siteRow
	if err := db.Scopes(SiteScope(99)).Find(&result3).Error; err != nil {
		t.Fatalf("Scopes(SiteScope(99)): %v", err)
	}
	if len(result3) != 0 {
		t.Errorf("expected 0 rows for site 99, got %d", len(result3))
	}
}
