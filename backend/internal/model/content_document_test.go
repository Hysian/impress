package model

import (
	"testing"
)

func TestPageKey_IsValid(t *testing.T) {
	tests := []struct {
		name     string
		pageKey  PageKey
		expected bool
	}{
		{"valid home", PageKeyHome, true},
		{"valid about", PageKeyAbout, true},
		{"valid advantages", PageKeyAdvantages, true},
		{"valid core-services", PageKeyCoreServices, true},
		{"valid cases", PageKeyCases, true},
		{"valid experts", PageKeyExperts, true},
		{"valid contact", PageKeyContact, true},
		{"valid global", PageKeyGlobal, true},
		{"invalid pageKey", PageKey("invalid"), false},
		{"empty pageKey", PageKey(""), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.pageKey.IsValid(); got != tt.expected {
				t.Errorf("PageKey.IsValid() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestPageKey_String(t *testing.T) {
	tests := []struct {
		name     string
		pageKey  PageKey
		expected string
	}{
		{"home", PageKeyHome, "home"},
		{"about", PageKeyAbout, "about"},
		{"advantages", PageKeyAdvantages, "advantages"},
		{"core-services", PageKeyCoreServices, "core-services"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.pageKey.String(); got != tt.expected {
				t.Errorf("PageKey.String() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestContentDocument_Validate(t *testing.T) {
	tests := []struct {
		name    string
		doc     *ContentDocument
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid content document",
			doc: &ContentDocument{
				PageKey:          PageKeyHome,
				DraftConfig:      JSONMap{"title": "Test"},
				DraftVersion:     1,
				PublishedConfig:  JSONMap{"title": "Published"},
				PublishedVersion: 1,
			},
			wantErr: false,
		},
		{
			name: "invalid pageKey",
			doc: &ContentDocument{
				PageKey:      PageKey("invalid"),
				DraftVersion: 1,
			},
			wantErr: true,
			errMsg:  "pageKey must be one of",
		},
		{
			name: "negative draftVersion",
			doc: &ContentDocument{
				PageKey:      PageKeyHome,
				DraftVersion: -1,
			},
			wantErr: true,
			errMsg:  "draftVersion cannot be negative",
		},
		{
			name: "negative publishedVersion",
			doc: &ContentDocument{
				PageKey:          PageKeyHome,
				DraftVersion:     1,
				PublishedVersion: -1,
			},
			wantErr: true,
			errMsg:  "publishedVersion cannot be negative",
		},
		{
			name: "zero versions are valid",
			doc: &ContentDocument{
				PageKey:          PageKeyAbout,
				DraftVersion:     0,
				PublishedVersion: 0,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.doc.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("ContentDocument.Validate() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr && err != nil && tt.errMsg != "" {
				if !contains(err.Error(), tt.errMsg) {
					t.Errorf("ContentDocument.Validate() error message = %v, want to contain %v", err.Error(), tt.errMsg)
				}
			}
		})
	}
}

func TestContentDocument_TableName(t *testing.T) {
	doc := ContentDocument{}
	if got := doc.TableName(); got != "content_documents" {
		t.Errorf("ContentDocument.TableName() = %v, want %v", got, "content_documents")
	}
}

// Helper function to check if a string contains a substring
func contains(str, substr string) bool {
	return len(str) >= len(substr) && (str == substr || len(substr) == 0 ||
		(len(str) > 0 && len(substr) > 0 && strContains(str, substr)))
}

func strContains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
