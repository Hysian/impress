package sitemap

import (
	"encoding/xml"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"blotting-consultancy/internal/model"
	"blotting-consultancy/internal/repository"
)

// Handler handles sitemap generation
type Handler struct {
	contentDocRepo repository.ContentDocumentRepository
	baseURL        string
}

// NewHandler creates a new sitemap handler
func NewHandler(contentDocRepo repository.ContentDocumentRepository, baseURL string) *Handler {
	return &Handler{
		contentDocRepo: contentDocRepo,
		baseURL:        baseURL,
	}
}

// urlset is the root element of a sitemap XML
type urlset struct {
	XMLName xml.Name  `xml:"urlset"`
	XMLNS   string    `xml:"xmlns,attr"`
	XHTMLns string    `xml:"xmlns:xhtml,attr"`
	URLs    []siteURL `xml:"url"`
}

type siteURL struct {
	Loc     string     `xml:"loc"`
	LastMod string     `xml:"lastmod,omitempty"`
	Links   []xhtmlLink `xml:"xhtml:link"`
}

type xhtmlLink struct {
	Rel      string `xml:"rel,attr"`
	Hreflang string `xml:"hreflang,attr"`
	Href     string `xml:"href,attr"`
}

// pageKeyToPath maps page keys to URL paths
var pageKeyToPath = map[model.PageKey]string{
	model.PageKeyHome:         "/",
	model.PageKeyAbout:        "/about",
	model.PageKeyAdvantages:   "/advantages",
	model.PageKeyCoreServices: "/core-services",
	model.PageKeyCases:        "/cases",
	model.PageKeyExperts:      "/experts",
	model.PageKeyContact:      "/contact",
}

// GetSitemap generates and returns an XML sitemap
// GET /sitemap.xml
func (h *Handler) GetSitemap(c *gin.Context) {
	docs, err := h.contentDocRepo.List(c.Request.Context())
	if err != nil {
		c.String(http.StatusInternalServerError, "Failed to generate sitemap")
		return
	}

	set := urlset{
		XMLNS:   "http://www.sitemaps.org/schemas/sitemap/0.9",
		XHTMLns: "http://www.w3.org/1999/xhtml",
	}

	for _, doc := range docs {
		// Only include pages that have been published
		if doc.PublishedVersion == 0 {
			continue
		}

		path, ok := pageKeyToPath[doc.PageKey]
		if !ok {
			// Skip non-page documents (e.g., "global" config)
			continue
		}

		loc := h.baseURL + path

		u := siteURL{
			Loc:     loc,
			LastMod: doc.UpdatedAt.Format(time.RFC3339),
			Links: []xhtmlLink{
				{
					Rel:      "alternate",
					Hreflang: "zh",
					Href:     h.baseURL + path + "?locale=zh",
				},
				{
					Rel:      "alternate",
					Hreflang: "en",
					Href:     h.baseURL + path + "?locale=en",
				},
			},
		}

		set.URLs = append(set.URLs, u)
	}

	c.Header("Content-Type", "application/xml; charset=utf-8")
	c.Writer.WriteString(xml.Header)
	enc := xml.NewEncoder(c.Writer)
	enc.Indent("", "  ")
	if err := enc.Encode(set); err != nil {
		// Headers already sent, just log
		return
	}
}
