package content

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"blotting-consultancy/internal/middleware"
	"blotting-consultancy/internal/model"
	"blotting-consultancy/internal/service"
	"blotting-consultancy/pkg/apierror"
)

// RollbackRequest represents the request for POST /admin/content/{pageKey}/rollback/{version}
type RollbackRequest struct {
	ChangeNote string `json:"changeNote"`
}

// RollbackResponse represents the response for POST /admin/content/{pageKey}/rollback/{version}
type RollbackResponse struct {
	PageKey          string    `json:"pageKey"`
	PublishedVersion int       `json:"publishedVersion"`
	SourceVersion    int       `json:"sourceVersion"`
	PublishedAt      time.Time `json:"publishedAt"`
}

// Rollback handles POST /admin/content/{pageKey}/rollback/{version}
func (h *Handler) Rollback(c *gin.Context) {
	pageKeyStr := c.Param("pageKey")
	pageKey := model.PageKey(pageKeyStr)

	// Validate page key
	if !isValidPageKey(pageKey) {
		c.JSON(http.StatusBadRequest, apierror.BadRequest("Invalid page key"))
		return
	}

	// Parse source version parameter
	versionStr := c.Param("version")
	sourceVersion, err := strconv.Atoi(versionStr)
	if err != nil || sourceVersion <= 0 {
		c.JSON(http.StatusBadRequest, apierror.BadRequest("Invalid version parameter"))
		return
	}

	// Parse request body
	var req RollbackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, apierror.BadRequest("Invalid request body"))
		return
	}

	// Extract user context
	user := middleware.GetUserContext(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, apierror.Unauthorized("User context not found"))
		return
	}

	// Call rollback service
	result, err := h.contentSvc.Rollback(c.Request.Context(), pageKey, sourceVersion, user.UserID)
	if err != nil {
		if errors.Is(err, service.ErrVersionNotFound) {
			c.JSON(http.StatusNotFound, apierror.NotFound("Source version not found"))
			return
		}
		if errors.Is(err, service.ErrDocumentNotFound) {
			c.JSON(http.StatusNotFound, apierror.NotFound("Content document not found"))
			return
		}
		c.JSON(http.StatusInternalServerError, apierror.InternalServerError("Failed to rollback content"))
		return
	}

	// Return rollback result
	response := RollbackResponse{
		PageKey:          string(result.PageKey),
		PublishedVersion: result.PublishedVersion,
		SourceVersion:    result.SourceVersion,
		PublishedAt:      result.PublishedAt,
	}

	c.JSON(http.StatusOK, response)
}
