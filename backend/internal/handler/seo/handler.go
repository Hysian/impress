package seo

import (
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	mu        sync.RWMutex
	robotsTxt string
}

func NewHandler() *Handler {
	return &Handler{
		robotsTxt: defaultRobotsTxt(),
	}
}

func defaultRobotsTxt() string {
	return "User-agent: *\nAllow: /\n\nSitemap: /sitemap.xml\n"
}

func (h *Handler) GetRobotsTxt(c *gin.Context) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	c.Data(http.StatusOK, "text/plain; charset=utf-8", []byte(h.robotsTxt))
}

func (h *Handler) AdminGetRobotsTxt(c *gin.Context) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	c.JSON(http.StatusOK, gin.H{"content": h.robotsTxt})
}

func (h *Handler) AdminUpdateRobotsTxt(c *gin.Context) {
	var input struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "content is required"})
		return
	}
	h.mu.Lock()
	h.robotsTxt = input.Content
	h.mu.Unlock()
	c.JSON(http.StatusOK, gin.H{"content": input.Content})
}

func (h *Handler) RegisterRoutes(public, admin *gin.RouterGroup) {
	public.GET("/robots.txt", h.GetRobotsTxt)
	admin.GET("/seo/robots", h.AdminGetRobotsTxt)
	admin.PUT("/seo/robots", h.AdminUpdateRobotsTxt)
}
