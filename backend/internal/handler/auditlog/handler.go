package auditlog

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"blotting-consultancy/internal/repository"
)

// Handler handles audit log HTTP requests
type Handler struct {
	auditEventRepo repository.AuditEventRepository
}

// NewHandler creates a new audit log handler
func NewHandler(auditEventRepo repository.AuditEventRepository) *Handler {
	return &Handler{auditEventRepo: auditEventRepo}
}

// List returns a paginated, filtered list of audit events
// GET /admin/audit-logs?page=1&pageSize=20&action=&actor=&from=&to=
func (h *Handler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	offset := (page - 1) * pageSize

	action := c.Query("action")
	actor := c.Query("actor")

	var from, to *time.Time
	if fromStr := c.Query("from"); fromStr != "" {
		if t, err := time.Parse(time.RFC3339, fromStr); err == nil {
			from = &t
		}
	}
	if toStr := c.Query("to"); toStr != "" {
		if t, err := time.Parse(time.RFC3339, toStr); err == nil {
			to = &t
		}
	}

	items, total, err := h.auditEventRepo.List(c.Request.Context(), offset, pageSize, action, actor, from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "查询审计日志失败"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items":    items,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}
