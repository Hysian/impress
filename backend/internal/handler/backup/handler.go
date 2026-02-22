package backup

import (
	"net/http"

	"github.com/gin-gonic/gin"

	backupService "blotting-consultancy/internal/backup"
)

// Handler handles backup-related HTTP requests
type Handler struct {
	service *backupService.Service
}

// NewHandler creates a new backup handler
func NewHandler(service *backupService.Service) *Handler {
	return &Handler{service: service}
}

// List returns all backup records
// GET /admin/backups
func (h *Handler) List(c *gin.Context) {
	records, err := h.service.ListBackups(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "查询备份记录失败"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items": records,
	})
}

// Trigger manually triggers a database backup
// POST /admin/backups/trigger
func (h *Handler) Trigger(c *gin.Context) {
	record, err := h.service.RunBackup(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "备份失败: " + err.Error()}})
		return
	}

	c.JSON(http.StatusCreated, record)
}
