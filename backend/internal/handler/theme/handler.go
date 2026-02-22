package theme

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"blotting-consultancy/internal/model"
	"blotting-consultancy/internal/repository"
)

// Handler handles theme-related HTTP requests
type Handler struct {
	contentDocRepo repository.ContentDocumentRepository
}

// NewHandler creates a new theme handler
func NewHandler(contentDocRepo repository.ContentDocumentRepository) *Handler {
	return &Handler{contentDocRepo: contentDocRepo}
}

// defaultThemeConfig returns the default theme token values
func defaultThemeConfig() model.JSONMap {
	return model.JSONMap{
		"colors": map[string]interface{}{
			"primary":     "#1a5f8f",
			"primaryDark": "#26548b",
			"accent":      "#8bc34a",
			"accentHover": "#7cb342",
			"surface":     "#ffffff",
			"surfaceAlt":  "#f9fafb",
		},
		"fonts": map[string]interface{}{
			"sans":    "system-ui, -apple-system, sans-serif",
			"heading": "system-ui, -apple-system, sans-serif",
		},
		"layout": map[string]interface{}{
			"maxWidth":     "1344px",
			"borderRadius": "0.5rem",
		},
	}
}

// PublicGet returns the active (published) theme tokens
// GET /public/theme
func (h *Handler) PublicGet(c *gin.Context) {
	doc, err := h.contentDocRepo.FindByPageKey(c.Request.Context(), model.PageKeyTheme)
	if err != nil {
		// Return default theme if not configured
		c.JSON(http.StatusOK, defaultThemeConfig())
		return
	}

	// Return published config; fall back to default if empty
	config := doc.PublishedConfig
	if len(config) == 0 {
		config = defaultThemeConfig()
	}

	c.JSON(http.StatusOK, config)
}

// AdminGet returns the theme settings for editing (draft config)
// GET /admin/theme
func (h *Handler) AdminGet(c *gin.Context) {
	doc, err := h.contentDocRepo.FindByPageKey(c.Request.Context(), model.PageKeyTheme)
	if err != nil {
		// Return default with version info
		c.JSON(http.StatusOK, gin.H{
			"draftConfig":      defaultThemeConfig(),
			"draftVersion":     0,
			"publishedConfig":  defaultThemeConfig(),
			"publishedVersion": 0,
		})
		return
	}

	draftConfig := doc.DraftConfig
	if len(draftConfig) == 0 {
		draftConfig = defaultThemeConfig()
	}

	publishedConfig := doc.PublishedConfig
	if len(publishedConfig) == 0 {
		publishedConfig = defaultThemeConfig()
	}

	c.JSON(http.StatusOK, gin.H{
		"draftConfig":      draftConfig,
		"draftVersion":     doc.DraftVersion,
		"publishedConfig":  publishedConfig,
		"publishedVersion": doc.PublishedVersion,
	})
}

// updateInput is the JSON body for updating theme settings
type updateInput struct {
	Config       model.JSONMap `json:"config"`
	DraftVersion int           `json:"draftVersion"`
}

// AdminUpdate updates the theme settings
// PUT /admin/theme
func (h *Handler) AdminUpdate(c *gin.Context) {
	var input updateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "无效的请求数据"}})
		return
	}

	if input.Config == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "config is required"}})
		return
	}

	// Try to find existing theme document
	_, err := h.contentDocRepo.FindByPageKey(c.Request.Context(), model.PageKeyTheme)
	if err != nil {
		// Create new theme document if it doesn't exist
		doc := &model.ContentDocument{
			PageKey:          model.PageKeyTheme,
			DraftConfig:      input.Config,
			DraftVersion:     1,
			PublishedConfig:  defaultThemeConfig(),
			PublishedVersion: 0,
		}
		if createErr := h.contentDocRepo.Create(c.Request.Context(), doc); createErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "保存主题设置失败"}})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"draftConfig":  doc.DraftConfig,
			"draftVersion": doc.DraftVersion,
			"message":      "主题设置已创建",
		})
		return
	}

	// Update draft config with optimistic locking
	newVersion, err := h.contentDocRepo.UpdateDraft(c.Request.Context(), model.PageKeyTheme, input.DraftVersion, input.Config)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "版本冲突，请刷新后重试"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"draftConfig":  input.Config,
		"draftVersion": newVersion,
		"message":      "主题设置已更新",
	})
}
