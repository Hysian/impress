package auth

import (
	"net/http"

	"blotting-consultancy/internal/middleware"
	"blotting-consultancy/pkg/apierror"

	"github.com/gin-gonic/gin"
)

// MeResponse represents the current user response payload
type MeResponse struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Role     string `json:"role"`
}

// Me handles GET /auth/me
// This endpoint requires authentication middleware to be applied
func (h *Handler) Me(c *gin.Context) {
	// Extract user context from middleware
	userCtx, exists := c.Get(string(middleware.UserContextKey))
	if !exists {
		c.JSON(http.StatusUnauthorized, apierror.Unauthorized("User context not found"))
		return
	}

	user, ok := userCtx.(*middleware.UserContext)
	if !ok {
		c.JSON(http.StatusInternalServerError, apierror.InternalServerError("Invalid user context"))
		return
	}

	// Return user information
	c.JSON(http.StatusOK, MeResponse{
		ID:       user.UserID,
		Username: user.Username,
		Role:     string(user.Role),
	})
}
