package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm/logger"

	"blotting-consultancy/internal/db"
	authHandler "blotting-consultancy/internal/handler/auth"
	contentHandler "blotting-consultancy/internal/handler/content"
	publicHandler "blotting-consultancy/internal/handler/public"
	"blotting-consultancy/internal/middleware"
	"blotting-consultancy/internal/model"
	"blotting-consultancy/internal/repository"
	"blotting-consultancy/internal/seed"
	"blotting-consultancy/internal/service"
	"blotting-consultancy/pkg/apierror"
	"blotting-consultancy/pkg/config"
	appLogger "blotting-consultancy/pkg/logger"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load config: %v\n", err)
		os.Exit(1)
	}

	// Initialize logger
	log := appLogger.New(cfg.Env, map[string]interface{}{
		"service": "blotting-consultancy-api",
	})
	log.Info("Starting server", "env", cfg.Env, "port", cfg.Port)

	// Initialize database
	logLevel := logger.Info
	if cfg.Env == "development" {
		logLevel = logger.Info
	} else if cfg.Env == "production" {
		logLevel = logger.Warn
	}

	database, err := db.Init(db.InitOptions{
		DSN:         cfg.DBDSN,
		MaxOpenConn: 25,
		MaxIdleConn: 5,
		MaxLifetime: 5 * time.Minute,
		LogLevel:    logLevel,
	})
	if err != nil {
		log.Error("Failed to initialize database", "error", err)
		os.Exit(1)
	}
	log.Info("Database connection established")

	// Run migrations
	migrator := db.NewMigrator(database)
	if err := migrator.AutoMigrate(
		&model.User{},
		&model.RefreshToken{},
		&model.ContentDocument{},
		&model.ContentVersion{},
	); err != nil {
		log.Error("Failed to run migrations", "error", err)
		os.Exit(1)
	}
	log.Info("Database migrations completed")

	// Health check
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := database.HealthCheck(ctx); err != nil {
		log.Error("Database health check failed", "error", err)
		os.Exit(1)
	}
	log.Info("Database health check passed")

	// Initialize repositories
	userRepo := repository.NewGormUserRepository(database.DB)
	refreshTokenRepo := repository.NewGormRefreshTokenRepository(database.DB)
	contentDocRepo := repository.NewGormContentDocumentRepository(database.DB)
	contentVersionRepo := repository.NewGormContentVersionRepository(database.DB)
	log.Info("Repositories initialized")

	// Run seed (idempotent)
	seeder := seed.NewSeeder(userRepo, contentDocRepo)
	seedCtx, seedCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer seedCancel()
	if err := seeder.SeedAll(seedCtx); err != nil {
		log.Error("Failed to seed initial data", "error", err)
		os.Exit(1)
	}
	log.Info("Seed data initialized")

	// Initialize services
	validationService := service.NewValidationService()
	contentService := service.NewContentService(
		database.DB,
		contentDocRepo,
		contentVersionRepo,
		validationService,
	)
	log.Info("Services initialized")

	// Initialize handlers
	authHandlerInst := authHandler.NewHandler(userRepo, refreshTokenRepo, cfg)
	contentHandlerInst := contentHandler.NewHandler(
		database.DB,
		contentDocRepo,
		contentVersionRepo,
		validationService,
		contentService,
	)
	publicHandlerInst := publicHandler.NewHandler(contentDocRepo)
	log.Info("Handlers initialized")

	// Setup Gin router
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	router := gin.New()

	// Global middleware (order matters!)
	router.Use(gin.Recovery())                  // Panic recovery
	router.Use(ginLogger(log))                  // Request logging
	router.Use(apierror.ErrorHandler())         // API error handling

	// Health endpoint (no auth required)
	router.GET("/health", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()

		// Check database connection
		if err := database.HealthCheck(ctx); err != nil {
			c.JSON(503, gin.H{
				"status": "unhealthy",
				"error":  "database connection failed",
			})
			return
		}

		c.JSON(200, gin.H{
			"status": "healthy",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
	})

	// Public routes (no auth required)
	publicGroup := router.Group("/public")
	{
		publicGroup.GET("/content/:pageKey", publicHandlerInst.GetPublicContent)
	}

	// Auth routes (no auth middleware, but handlers validate credentials)
	authGroup := router.Group("/auth")
	{
		authGroup.POST("/login", authHandlerInst.Login)
		authGroup.POST("/refresh", authHandlerInst.Refresh)
		authGroup.POST("/logout", authHandlerInst.Logout)

		// Protected auth routes
		authProtected := authGroup.Group("")
		authProtected.Use(middleware.Auth(cfg.JWTSecret))
		{
			authProtected.GET("/me", authHandlerInst.Me)
		}
	}

	// Admin routes (require authentication and authorization)
	adminGroup := router.Group("/admin")
	adminGroup.Use(middleware.Auth(cfg.JWTSecret))
	adminGroup.Use(middleware.RequireAdminOrEditor())
	{
		// Content draft management
		adminGroup.GET("/content/:pageKey/draft", contentHandlerInst.GetDraft)
		adminGroup.PUT("/content/:pageKey/draft", contentHandlerInst.UpdateDraft)
		adminGroup.POST("/content/:pageKey/validate", contentHandlerInst.Validate)

		// Publishing (admin only)
		adminPublish := adminGroup.Group("")
		adminPublish.Use(middleware.RequireAdmin())
		{
			adminPublish.POST("/content/:pageKey/publish", contentHandlerInst.Publish)
			adminPublish.POST("/content/:pageKey/rollback/:version", contentHandlerInst.Rollback)
		}

		// Version history
		adminGroup.GET("/content/:pageKey/versions", contentHandlerInst.GetVersions)
		adminGroup.GET("/content/:pageKey/versions/:version", contentHandlerInst.GetVersionDetail)
	}

	log.Info("Router configured with all routes")

	// Setup HTTP server
	addr := fmt.Sprintf(":%d", cfg.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Info("Server listening", "address", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Error("Server failed to start", "error", err)
			os.Exit(1)
		}
	}()

	// Graceful shutdown handling
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Server shutting down gracefully...")

	// Shutdown with timeout
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error("Server forced to shutdown", "error", err)
	}

	// Close database connection
	if err := database.Close(); err != nil {
		log.Error("Failed to close database connection", "error", err)
	}

	log.Info("Server stopped")
}

// ginLogger returns a Gin middleware that logs requests using the app logger
func ginLogger(log *appLogger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		c.Next()

		duration := time.Since(start)
		status := c.Writer.Status()

		log.Info("Request",
			"method", method,
			"path", path,
			"status", status,
			"duration", duration.String(),
			"ip", c.ClientIP(),
		)
	}
}
