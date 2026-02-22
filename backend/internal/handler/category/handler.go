package category

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"blotting-consultancy/internal/model"
	"blotting-consultancy/internal/repository"
)

// Handler handles category-related HTTP requests
type Handler struct {
	categoryRepo repository.CategoryRepository
}

// NewHandler creates a new category handler
func NewHandler(categoryRepo repository.CategoryRepository) *Handler {
	return &Handler{categoryRepo: categoryRepo}
}

// List returns all categories
// GET /admin/categories
func (h *Handler) List(c *gin.Context) {
	items, err := h.categoryRepo.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "查询分类失败"}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

// Create creates a new category
// POST /admin/categories
func (h *Handler) Create(c *gin.Context) {
	var input model.Category
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "无效的请求数据"}})
		return
	}

	if err := h.categoryRepo.Create(c.Request.Context(), &input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": err.Error()}})
		return
	}

	c.JSON(http.StatusCreated, input)
}

// Update updates a category
// PUT /admin/categories/:id
func (h *Handler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "无效的 ID"}})
		return
	}

	existing, err := h.categoryRepo.FindByID(c.Request.Context(), uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "分类不存在"}})
		return
	}

	var input model.Category
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "无效的请求数据"}})
		return
	}

	existing.Slug = input.Slug
	existing.ZhName = input.ZhName
	existing.EnName = input.EnName

	if err := h.categoryRepo.Update(c.Request.Context(), existing); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": err.Error()}})
		return
	}

	c.JSON(http.StatusOK, existing)
}

// Delete deletes a category
// DELETE /admin/categories/:id
func (h *Handler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "无效的 ID"}})
		return
	}

	if err := h.categoryRepo.Delete(c.Request.Context(), uint(id)); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "分类不存在"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "已删除"})
}
