package model

import (
	"testing"
	"time"
)

func TestContentVersion_Validate(t *testing.T) {
	tests := []struct {
		name    string
		version ContentVersion
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid content version",
			version: ContentVersion{
				PageKey:     PageKeyHome,
				Version:     1,
				Config:      JSONMap{"title": "Home"},
				PublishedAt: time.Now(),
				CreatedBy:   1,
			},
			wantErr: false,
		},
		{
			name: "invalid page key",
			version: ContentVersion{
				PageKey:     "invalid",
				Version:     1,
				Config:      JSONMap{},
				PublishedAt: time.Now(),
				CreatedBy:   1,
			},
			wantErr: true,
			errMsg:  "pageKey must be one of",
		},
		{
			name: "zero version",
			version: ContentVersion{
				PageKey:     PageKeyHome,
				Version:     0,
				Config:      JSONMap{},
				PublishedAt: time.Now(),
				CreatedBy:   1,
			},
			wantErr: true,
			errMsg:  "version must be positive",
		},
		{
			name: "negative version",
			version: ContentVersion{
				PageKey:     PageKeyHome,
				Version:     -1,
				Config:      JSONMap{},
				PublishedAt: time.Now(),
				CreatedBy:   1,
			},
			wantErr: true,
			errMsg:  "version must be positive",
		},
		{
			name: "missing createdBy",
			version: ContentVersion{
				PageKey:     PageKeyHome,
				Version:     1,
				Config:      JSONMap{},
				PublishedAt: time.Now(),
				CreatedBy:   0,
			},
			wantErr: true,
			errMsg:  "createdBy is required",
		},
		{
			name: "missing publishedAt",
			version: ContentVersion{
				PageKey:   PageKeyHome,
				Version:   1,
				Config:    JSONMap{},
				CreatedBy: 1,
			},
			wantErr: true,
			errMsg:  "publishedAt is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.version.Validate()
			if tt.wantErr {
				if err == nil {
					t.Errorf("Validate() expected error containing %q, got nil", tt.errMsg)
					return
				}
				if tt.errMsg != "" && !contains(err.Error(), tt.errMsg) {
					t.Errorf("Validate() error = %v, want error containing %q", err, tt.errMsg)
				}
			} else {
				if err != nil {
					t.Errorf("Validate() unexpected error = %v", err)
				}
			}
		})
	}
}

func TestContentVersion_TableName(t *testing.T) {
	cv := ContentVersion{}
	expected := "content_versions"
	if got := cv.TableName(); got != expected {
		t.Errorf("TableName() = %v, want %v", got, expected)
	}
}

func TestContentVersion_BeforeSave(t *testing.T) {
	cv := &ContentVersion{
		PageKey:     PageKeyHome,
		Version:     1,
		PublishedAt: time.Now(),
		CreatedBy:   1,
	}

	if err := cv.BeforeSave(nil); err != nil {
		t.Errorf("BeforeSave() unexpected error = %v", err)
	}

	if cv.Config == nil {
		t.Error("BeforeSave() should initialize Config")
	}

	if len(cv.Config) != 0 {
		t.Errorf("BeforeSave() Config should be empty map, got %v", cv.Config)
	}
}
