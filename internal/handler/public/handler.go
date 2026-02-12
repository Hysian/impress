package public

import (
	"blotting-consultancy/internal/model"
	"blotting-consultancy/internal/repository"
	"blotting-consultancy/pkg/apierror"

	"github.com/gin-gonic/gin"
)

// Handler handles public content-related HTTP requests
type Handler struct {
	docRepo repository.ContentDocumentRepository
}

// NewHandler creates a new public content handler
func NewHandler(docRepo repository.ContentDocumentRepository) *Handler {
	return &Handler{
		docRepo: docRepo,
	}
}

// GetPublicContent handles GET /public/content/{pageKey}?locale=zh|en
// Returns published-only content with locale support
func (h *Handler) GetPublicContent(c *gin.Context) {
	// Parse page key
	pageKeyStr := c.Param("pageKey")
	pageKey := model.PageKey(pageKeyStr)

	if !pageKey.IsValid() {
		c.JSON(400, apierror.BadRequest("invalid pageKey"))
		return
	}

	// Parse locale parameter (default to zh)
	locale := c.DefaultQuery("locale", "zh")
	if locale != "zh" && locale != "en" {
		c.JSON(400, apierror.BadRequest("locale must be zh or en"))
		return
	}

	// Fetch published content document
	doc, err := h.docRepo.FindByPageKey(c.Request.Context(), pageKey)
	if err != nil {
		c.JSON(404, apierror.NotFound("page not found"))
		return
	}

	// Return published-only data (never expose draft fields)
	c.JSON(200, gin.H{
		"pageKey": doc.PageKey.String(),
		"version": doc.PublishedVersion,
		"locale":  locale,
		"config":  doc.PublishedConfig,
	})
}
