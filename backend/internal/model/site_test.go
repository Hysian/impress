package model

import (
	"testing"
)

func TestSiteValidate(t *testing.T) {
	tests := []struct {
		name    string
		site    Site
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid subdomain site",
			site: Site{
				Domain: "example.com",
				Name:   "Example",
				Locale: "zh",
				Mode:   SiteModeSubdomain,
				Status: SiteStatusActive,
			},
			wantErr: false,
		},
		{
			name: "valid subpath site",
			site: Site{
				Domain:  "example.com",
				SubPath: "/blog",
				Name:    "Blog",
				Locale:  "en",
				Mode:    SiteModeSubpath,
				Status:  SiteStatusActive,
			},
			wantErr: false,
		},
		{
			name: "missing domain",
			site: Site{
				Name:   "Example",
				Locale: "zh",
				Mode:   SiteModeSubdomain,
				Status: SiteStatusActive,
			},
			wantErr: true,
			errMsg:  "domain is required",
		},
		{
			name: "missing name",
			site: Site{
				Domain: "example.com",
				Locale: "zh",
				Mode:   SiteModeSubdomain,
				Status: SiteStatusActive,
			},
			wantErr: true,
			errMsg:  "name is required",
		},
		{
			name: "missing locale",
			site: Site{
				Domain: "example.com",
				Name:   "Example",
				Mode:   SiteModeSubdomain,
				Status: SiteStatusActive,
			},
			wantErr: true,
			errMsg:  "locale is required",
		},
		{
			name: "invalid mode",
			site: Site{
				Domain: "example.com",
				Name:   "Example",
				Locale: "zh",
				Mode:   SiteMode("invalid"),
				Status: SiteStatusActive,
			},
			wantErr: true,
			errMsg:  "mode must be",
		},
		{
			name: "invalid status",
			site: Site{
				Domain: "example.com",
				Name:   "Example",
				Locale: "zh",
				Mode:   SiteModeSubdomain,
				Status: SiteStatus("unknown"),
			},
			wantErr: true,
			errMsg:  "status must be",
		},
		{
			name: "subpath mode without subpath",
			site: Site{
				Domain: "example.com",
				Name:   "Example",
				Locale: "zh",
				Mode:   SiteModeSubpath,
				Status: SiteStatusActive,
			},
			wantErr: true,
			errMsg:  "subPath is required",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := tc.site.Validate()
			if tc.wantErr {
				if err == nil {
					t.Errorf("expected error but got nil")
					return
				}
				if tc.errMsg != "" && !containsString(err.Error(), tc.errMsg) {
					t.Errorf("expected error containing %q but got %q", tc.errMsg, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("expected no error but got: %v", err)
				}
			}
		})
	}
}

func TestSiteSettingsScanValue(t *testing.T) {
	s := SiteSettings{"key": "value", "num": float64(42)}

	// Value
	v, err := s.Value()
	if err != nil {
		t.Fatalf("Value() error: %v", err)
	}
	if v == nil {
		t.Fatal("Value() returned nil")
	}

	// Scan back
	var s2 SiteSettings
	if err := s2.Scan(v); err != nil {
		t.Fatalf("Scan() error: %v", err)
	}
	if s2["key"] != "value" {
		t.Errorf("expected key=value, got %v", s2["key"])
	}
}

func TestSiteSettingsScanNil(t *testing.T) {
	var s SiteSettings
	if err := s.Scan(nil); err != nil {
		t.Fatalf("Scan(nil) error: %v", err)
	}
	if s == nil {
		t.Error("expected non-nil map after Scan(nil)")
	}
}

// containsString is a simple substring check for test error messages
func containsString(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 ||
		func() bool {
			for i := 0; i <= len(s)-len(substr); i++ {
				if s[i:i+len(substr)] == substr {
					return true
				}
			}
			return false
		}())
}
