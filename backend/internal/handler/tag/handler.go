package tag

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"blotting-consultancy/internal/model"
	"blotting-consultancy/internal/repository"
)

// Handler handles tag-related HTTP requests
type Handler struct {
	tagRepo repository.TagRepository
}

// NewHandler creates a new tag handler
func NewHandler(tagRepo repository.TagRepository) *Handler {
	return &Handler{tagRepo: tagRepo}
}

// List returns all tags
// GET /admin/tags
func (h *Handler) List(c *gin.Context) {
	items, err := h.tagRepo.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "查询标签失败"}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

// Create creates a new tag
// POST /admin/tags
func (h *Handler) Create(c *gin.Context) {
	var input model.Tag
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "无效的请求数据"}})
		return
	}

	if err := h.tagRepo.Create(c.Request.Context(), &input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": err.Error()}})
		return
	}

	c.JSON(http.StatusCreated, input)
}

// Delete deletes a tag
// DELETE /admin/tags/:id
func (h *Handler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "无效的 ID"}})
		return
	}

	if err := h.tagRepo.Delete(c.Request.Context(), uint(id)); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "标签不存在"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "已删除"})
}
