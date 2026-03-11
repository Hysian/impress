package seo_test

import (
	"testing"

	"blotting-consultancy/internal/seo"
)

func TestDefaultPageMeta(t *testing.T) {
	meta := seo.DefaultPageMeta()
	if meta.Title == "" {
		t.Error("default title should not be empty")
	}
	if meta.OgType != "website" {
		t.Errorf("expected og:type 'website', got %q", meta.OgType)
	}
	if meta.Locale != "zh" {
		t.Errorf("expected default locale 'zh', got %q", meta.Locale)
	}
}

func TestPageMetaWithOverrides(t *testing.T) {
	meta := seo.DefaultPageMeta()
	meta.Title = "Custom Title"
	meta.Description = "Custom Desc"
	meta.OgImage = "https://example.com/img.png"
	meta.CanonicalURL = "https://example.com/about"

	if meta.Title != "Custom Title" {
		t.Errorf("expected custom title, got %q", meta.Title)
	}
}
