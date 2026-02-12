package content

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"blotting-consultancy/internal/middleware"
	"blotting-consultancy/internal/model"
	"blotting-consultancy/internal/service"
	"blotting-consultancy/pkg/apierror"
)

// PublishRequest represents the request for POST /admin/content/{pageKey}/publish
type PublishRequest struct {
	ExpectedDraftVersion int    `json:"expectedDraftVersion" binding:"required"`
	ChangeNote           string `json:"changeNote"`
}

// PublishResponse represents the response for POST /admin/content/{pageKey}/publish
type PublishResponse struct {
	PageKey          string    `json:"pageKey"`
	PublishedVersion int       `json:"publishedVersion"`
	PublishedAt      time.Time `json:"publishedAt"`
}

// Publish handles POST /admin/content/{pageKey}/publish
func (h *Handler) Publish(c *gin.Context) {
	pageKeyStr := c.Param("pageKey")
	pageKey := model.PageKey(pageKeyStr)

	// Validate page key
	if !isValidPageKey(pageKey) {
		c.JSON(http.StatusBadRequest, apierror.BadRequest("Invalid page key"))
		return
	}

	// Parse request body
	var req PublishRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, apierror.BadRequest("Invalid request body"))
		return
	}

	// Extract user context
	userCtx, exists := c.Get(string(middleware.UserContextKey))
	if !exists {
		c.JSON(http.StatusUnauthorized, apierror.Unauthorized("User context not found"))
		return
	}

	user := userCtx.(middleware.UserContext)

	// Call publish service
	result, err := h.contentSvc.Publish(c.Request.Context(), pageKey, req.ExpectedDraftVersion, user.UserID)
	if err != nil {
		if errors.Is(err, service.ErrVersionMismatch) {
			c.JSON(http.StatusConflict, apierror.New(http.StatusConflict, "CONFLICT_VERSION", "Draft version mismatch"))
			return
		}
		if errors.Is(err, service.ErrCannotPublish) {
			c.JSON(http.StatusUnprocessableEntity, apierror.New(http.StatusUnprocessableEntity, "VALIDATION_FAILED", "Publish blocked by missing or stale translations"))
			return
		}
		if errors.Is(err, service.ErrDocumentNotFound) {
			c.JSON(http.StatusNotFound, apierror.NotFound("Content document not found"))
			return
		}
		c.JSON(http.StatusInternalServerError, apierror.InternalServerError("Failed to publish content"))
		return
	}

	// Return publish result
	response := PublishResponse{
		PageKey:          string(result.PageKey),
		PublishedVersion: result.PublishedVersion,
		PublishedAt:      result.PublishedAt,
	}

	c.JSON(http.StatusOK, response)
}
