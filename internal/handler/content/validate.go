package content

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"blotting-consultancy/internal/model"
	"blotting-consultancy/internal/service"
	"blotting-consultancy/pkg/apierror"
)

// ValidateRequest represents the request for POST /admin/content/{pageKey}/validate
type ValidateRequest struct {
	Config model.JSONMap `json:"config" binding:"required"`
}

// ValidateResponse represents the response for POST /admin/content/{pageKey}/validate
type ValidateResponse struct {
	Valid             bool                               `json:"valid"`
	Errors            []service.ValidationError          `json:"errors"`
	TranslationStatus map[string]service.TranslationState `json:"translationStatus"`
}

// Validate handles POST /admin/content/{pageKey}/validate
func (h *Handler) Validate(c *gin.Context) {
	pageKeyStr := c.Param("pageKey")
	pageKey := model.PageKey(pageKeyStr)

	// Validate page key
	if !isValidPageKey(pageKey) {
		c.JSON(http.StatusBadRequest, apierror.BadRequest("Invalid page key"))
		return
	}

	// Parse request body
	var req ValidateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, apierror.BadRequest("Invalid request body"))
		return
	}

	// Validate config
	result := h.validationSvc.ValidateConfig(pageKey, req.Config)

	// Return validation result
	response := ValidateResponse{
		Valid:             result.Valid,
		Errors:            result.Errors,
		TranslationStatus: result.TranslationStatus,
	}

	c.JSON(http.StatusOK, response)
}
