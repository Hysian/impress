package installed_theme

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"blotting-consultancy/internal/model"
	"blotting-consultancy/internal/repository"
)

// Handler handles installed-theme-related HTTP requests
type Handler struct {
	themeRepo repository.InstalledThemeRepository
}

// NewHandler creates a new installed theme handler
func NewHandler(themeRepo repository.InstalledThemeRepository) *Handler {
	return &Handler{themeRepo: themeRepo}
}

// --- Public endpoints ---

// PublicGetActive returns the currently active theme
// GET /public/active-theme
func (h *Handler) PublicGetActive(c *gin.Context) {
	theme, err := h.themeRepo.FindActive(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "没有激活的主题"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"themeId":     theme.ThemeID,
		"source":      theme.Source,
		"externalUrl": theme.ExternalURL,
	})
}

// --- Admin endpoints ---

// AdminList returns all installed themes
// GET /admin/themes
func (h *Handler) AdminList(c *gin.Context) {
	themes, err := h.themeRepo.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "查询主题失败"}})
		return
	}

	c.JSON(http.StatusOK, themes)
}

// AdminGetByID returns a single installed theme by GORM ID
// GET /admin/themes/:id
func (h *Handler) AdminGetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "无效的 ID"}})
		return
	}

	// Use themeID lookup via list + filter since repo exposes FindByThemeID
	themes, err := h.themeRepo.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "查询主题失败"}})
		return
	}

	for _, t := range themes {
		if t.ID == uint(id) {
			c.JSON(http.StatusOK, t)
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "主题不存在"}})
}

// createInput is the JSON body for installing an external theme
type createInput struct {
	ThemeID     string        `json:"themeId"`
	Name        string        `json:"name"`
	NameZh      string        `json:"nameZh"`
	Description string        `json:"description"`
	Author      string        `json:"author"`
	Version     string        `json:"version"`
	Source      string        `json:"source"`
	ExternalURL string        `json:"externalUrl"`
	Preview     string        `json:"preview"`
	Config      model.JSONMap `json:"config"`
}

// AdminCreate installs a new external theme
// POST /admin/themes
func (h *Handler) AdminCreate(c *gin.Context) {
	var input createInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "无效的请求数据"}})
		return
	}

	if input.ThemeID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "themeId 不能为空"}})
		return
	}
	if input.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "name 不能为空"}})
		return
	}

	source := input.Source
	if source == "" {
		source = "external"
	}

	theme := &model.InstalledTheme{
		ThemeID:     input.ThemeID,
		Name:        input.Name,
		NameZh:      input.NameZh,
		Description: input.Description,
		Author:      input.Author,
		Version:     input.Version,
		Source:      source,
		ExternalURL: input.ExternalURL,
		Preview:     input.Preview,
		Config:      input.Config,
	}

	if err := h.themeRepo.Create(c.Request.Context(), theme); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": err.Error()}})
		return
	}

	c.JSON(http.StatusCreated, theme)
}

// updateInput is the JSON body for updating a theme's configuration
type updateInput struct {
	Name        string        `json:"name"`
	NameZh      string        `json:"nameZh"`
	Description string        `json:"description"`
	Author      string        `json:"author"`
	Version     string        `json:"version"`
	ExternalURL string        `json:"externalUrl"`
	Preview     string        `json:"preview"`
	Config      model.JSONMap `json:"config"`
}

// AdminUpdate updates an installed theme's configuration
// PUT /admin/themes/:id
func (h *Handler) AdminUpdate(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "无效的 ID"}})
		return
	}

	// Find existing theme by iterating over all themes
	themes, err := h.themeRepo.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "查询主题失败"}})
		return
	}

	var existing *model.InstalledTheme
	for _, t := range themes {
		if t.ID == uint(id) {
			existing = t
			break
		}
	}
	if existing == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "主题不存在"}})
		return
	}

	var input updateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "无效的请求数据"}})
		return
	}

	if input.Name != "" {
		existing.Name = input.Name
	}
	if input.NameZh != "" {
		existing.NameZh = input.NameZh
	}
	if input.Description != "" {
		existing.Description = input.Description
	}
	if input.Author != "" {
		existing.Author = input.Author
	}
	if input.Version != "" {
		existing.Version = input.Version
	}
	if input.ExternalURL != "" {
		existing.ExternalURL = input.ExternalURL
	}
	if input.Preview != "" {
		existing.Preview = input.Preview
	}
	if input.Config != nil {
		existing.Config = input.Config
	}

	if err := h.themeRepo.Update(c.Request.Context(), existing); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": err.Error()}})
		return
	}

	c.JSON(http.StatusOK, existing)
}

// AdminDelete uninstalls (soft-deletes) a theme
// DELETE /admin/themes/:id
func (h *Handler) AdminDelete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "无效的 ID"}})
		return
	}

	// Find existing theme to check constraints
	themes, err := h.themeRepo.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "查询主题失败"}})
		return
	}

	var existing *model.InstalledTheme
	for _, t := range themes {
		if t.ID == uint(id) {
			existing = t
			break
		}
	}
	if existing == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "主题不存在"}})
		return
	}

	// Cannot delete active theme
	if existing.IsActive {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "不能删除当前激活的主题"}})
		return
	}

	// Cannot delete built-in theme
	if existing.Source == "built-in" {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "不能删除内置主题"}})
		return
	}

	if err := h.themeRepo.Delete(c.Request.Context(), uint(id)); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "主题不存在"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "已删除"})
}

// AdminActivate activates a theme
// PUT /admin/themes/:id/activate
func (h *Handler) AdminActivate(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "无效的 ID"}})
		return
	}

	// Find the theme to get its themeID
	themes, err := h.themeRepo.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "查询主题失败"}})
		return
	}

	var target *model.InstalledTheme
	for _, t := range themes {
		if t.ID == uint(id) {
			target = t
			break
		}
	}
	if target == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "主题不存在"}})
		return
	}

	if err := h.themeRepo.SetActive(c.Request.Context(), target.ThemeID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "激活主题失败"}})
		return
	}

	// Return updated theme
	target.IsActive = true
	c.JSON(http.StatusOK, target)
}
