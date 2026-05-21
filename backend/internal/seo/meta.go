package seo

import "html/template"

// PageMeta holds all meta tag values for server-side injection into index.html.
type PageMeta struct {
	Title        string
	Description  string
	Keywords     string
	CanonicalURL string
	Locale       string

	// Open Graph
	OgTitle       string
	OgDescription string
	OgImage       string
	OgURL         string
	OgType        string

	// Twitter Card
	TwitterCard string

	// JSON-LD script content (not escaped by template engine)
	JSONLD template.HTML
}

// DefaultPageMeta returns sensible defaults. Caller is expected to overlay
// values from the published global config (identity.name / seo.* / brand.ogImage)
// via PageMeta.ApplyGlobal.
func DefaultPageMeta() PageMeta {
	return PageMeta{
		Title:         "Site",
		Description:   "",
		Locale:        "zh",
		OgType:        "website",
		OgTitle:       "Site",
		OgDescription: "",
		TwitterCard:   "summary_large_image",
	}
}

// ApplyGlobal overlays defaults from a "global" content_document published config.
// Pass the JSONMap of doc.PublishedConfig directly.
func (pm *PageMeta) ApplyGlobal(global map[string]any, locale string) {
	if global == nil {
		return
	}
	identity, _ := global["identity"].(map[string]any)
	seo, _ := global["seo"].(map[string]any)
	brand, _ := global["brand"].(map[string]any)

	pickLocalized := func(m map[string]any, key, loc string) string {
		if m == nil {
			return ""
		}
		v, _ := m[key].(map[string]any)
		if v == nil {
			return ""
		}
		if s, ok := v[loc].(string); ok && s != "" {
			return s
		}
		if s, ok := v["zh"].(string); ok && s != "" {
			return s
		}
		if s, ok := v["en"].(string); ok && s != "" {
			return s
		}
		return ""
	}

	siteName := pickLocalized(identity, "name", locale)
	if seoTitle := pickLocalized(seo, "defaultTitle", locale); seoTitle != "" {
		pm.Title = seoTitle
		pm.OgTitle = seoTitle
	} else if siteName != "" {
		pm.Title = siteName
		pm.OgTitle = siteName
	}
	if desc := pickLocalized(seo, "defaultDescription", locale); desc != "" {
		pm.Description = desc
		pm.OgDescription = desc
	}
	if brand != nil {
		if og, ok := brand["ogImage"].(string); ok && og != "" {
			pm.OgImage = og
		}
	}
	if identity != nil {
		if mode, ok := identity["localeMode"].(string); ok {
			if mode == "mono-zh" {
				pm.Locale = "zh"
			}
			if mode == "mono-en" {
				pm.Locale = "en"
			}
		}
	}
}
