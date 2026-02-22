package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm/logger"

	"blotting-consultancy/internal/backup"
	"blotting-consultancy/internal/db"
	analyticsHandler "blotting-consultancy/internal/handler/analytics"
	articleHandler "blotting-consultancy/internal/handler/article"
	auditlogHandler "blotting-consultancy/internal/handler/auditlog"
	authHandler "blotting-consultancy/internal/handler/auth"
	backupHandler "blotting-consultancy/internal/handler/backup"
	categoryHandler "blotting-consultancy/internal/handler/category"
	contentHandler "blotting-consultancy/internal/handler/content"
	mediaHandler "blotting-consultancy/internal/handler/media"
	pageHandler "blotting-consultancy/internal/handler/page"
	publicHandler "blotting-consultancy/internal/handler/public"
	sitemapHandler "blotting-consultancy/internal/handler/sitemap"
	tagHandler "blotting-consultancy/internal/handler/tag"
	themeHandler "blotting-consultancy/internal/handler/theme"
	"blotting-consultancy/internal/middleware"
	"blotting-consultancy/internal/model"
	"blotting-consultancy/internal/repository"
	"blotting-consultancy/internal/seed"
	"blotting-consultancy/internal/service"
	"blotting-consultancy/pkg/apierror"
	"blotting-consultancy/pkg/audit"
	"blotting-consultancy/pkg/config"
	appLogger "blotting-consultancy/pkg/logger"
	"blotting-consultancy/pkg/metrics"
)

// Build-time variables (set via ldflags)
var (
	Version   = "dev"
	BuildTime = "unknown"
	GitCommit = "unknown"
	GitBranch = "unknown"
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
		"version": Version,
	})
	log.Info("Starting server",
		"env", cfg.Env,
		"port", cfg.Port,
		"version", Version,
		"buildTime", BuildTime,
		"gitCommit", GitCommit,
		"gitBranch", GitBranch,
	)

	// Initialize database
	logLevel := logger.Info
	if cfg.Env == "development" {
		logLevel = logger.Info
	} else if cfg.Env == "production" {
		logLevel = logger.Warn
	}

	maxOpenConn := 25
	maxIdleConn := 5
	maxLifetime := 5 * time.Minute
	if !db.IsPostgresDSN(cfg.DBDSN) {
		// SQLite is file-based and works best with a small connection pool.
		maxOpenConn = 1
		maxIdleConn = 1
		maxLifetime = 0
	}

	database, err := db.Init(db.InitOptions{
		DSN:         cfg.DBDSN,
		MaxOpenConn: maxOpenConn,
		MaxIdleConn: maxIdleConn,
		MaxLifetime: maxLifetime,
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
		&model.Media{},
		&model.PageView{},
		&model.Category{},
		&model.Tag{},
		&model.Article{},
		&model.BackupRecord{},
		&model.AuditEvent{},
		&model.Page{},
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
	mediaRepo := repository.NewGormMediaRepository(database.DB)
	pageViewRepo := repository.NewGormPageViewRepository(database.DB)
	categoryRepo := repository.NewGormCategoryRepository(database.DB)
	tagRepo := repository.NewGormTagRepository(database.DB)
	articleRepo := repository.NewGormArticleRepository(database.DB)
	auditEventRepo := repository.NewGormAuditEventRepository(database.DB)
	pageRepo := repository.NewGormPageRepository(database.DB)
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

	// Initialize audit logger
	auditLog := audit.NewLogger(log)
	auditDbWriter := audit.NewDbWriter(auditEventRepo)
	_ = auditDbWriter // available for future use alongside auditLog

	// Initialize backup service
	backupSvc := backup.NewService(database.DB, "./backups", 10)
	log.Info("Audit logger and backup service initialized")

	// Initialize handlers
	authHandlerInst := authHandler.NewHandler(userRepo, refreshTokenRepo, cfg)
	contentHandlerInst := contentHandler.NewHandler(
		database.DB,
		contentDocRepo,
		contentVersionRepo,
		validationService,
		contentService,
		auditLog,
	)
	publicHandlerInst := publicHandler.NewHandler(contentDocRepo, pageViewRepo)
	mediaHandlerInst := mediaHandler.NewHandler(mediaRepo, cfg.UploadDir, "")
	analyticsHandlerInst := analyticsHandler.NewHandler(pageViewRepo)
	categoryHandlerInst := categoryHandler.NewHandler(categoryRepo)
	tagHandlerInst := tagHandler.NewHandler(tagRepo)
	articleHandlerInst := articleHandler.NewHandler(articleRepo, categoryRepo, tagRepo)
	backupHandlerInst := backupHandler.NewHandler(backupSvc)
	auditlogHandlerInst := auditlogHandler.NewHandler(auditEventRepo)
	sitemapHandlerInst := sitemapHandler.NewHandler(contentDocRepo, cfg.BaseURL)
	pageHandlerInst := pageHandler.NewHandler(pageRepo)
	themeHandlerInst := themeHandler.NewHandler(contentDocRepo)
	log.Info("Handlers initialized")

	// Setup Gin router
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	router := gin.New()

	// Global middleware (order matters!)
	router.Use(gin.Recovery()) // Panic recovery
	router.Use(ginLogger(log)) // Request logging

	corsConfig := cors.Config{
		AllowMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders: []string{"Origin", "Content-Type", "Authorization", "If-Match"},
		MaxAge:       10 * time.Minute,
	}
	if len(cfg.CORSAllowedOrigins) > 0 {
		corsConfig.AllowOrigins = cfg.CORSAllowedOrigins
	} else {
		corsConfig.AllowAllOrigins = true
		log.Warn("CORS allowed origins not configured; falling back to allow all origins")
	}
	router.Use(cors.New(corsConfig))
	router.Use(apierror.ErrorHandler()) // API error handling

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
			"status":    "healthy",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
			"version":   Version,
			"buildTime": BuildTime,
			"gitCommit": GitCommit,
		})
	})

	// Metrics endpoint (no auth required, for operations dashboards)
	router.GET("/metrics", func(c *gin.Context) {
		m := metrics.Global()
		publishTotal, publishSuccess, publishFailure := m.GetPublishMetrics()
		validationTotal, validationFailures := m.GetValidationMetrics()
		rollbackTotal, rollbackSuccess, rollbackFailure, rollbackP95 := m.GetRollbackMetrics()
		publicGetTotal, publicGetSuccess, publicGetFailure, publicGetP95 := m.GetPublicGetMetrics()

		c.JSON(200, gin.H{
			"publish": gin.H{
				"total":   publishTotal,
				"success": publishSuccess,
				"failure": publishFailure,
			},
			"validation": gin.H{
				"total":    validationTotal,
				"failures": validationFailures,
			},
			"rollback": gin.H{
				"total":       rollbackTotal,
				"success":     rollbackSuccess,
				"failure":     rollbackFailure,
				"latency_p95": rollbackP95.Milliseconds(),
			},
			"public_get": gin.H{
				"total":       publicGetTotal,
				"success":     publicGetSuccess,
				"failure":     publicGetFailure,
				"latency_p95": publicGetP95.Milliseconds(),
			},
		})
	})

	// Sitemap (no auth required)
	router.GET("/sitemap.xml", sitemapHandlerInst.GetSitemap)

	// Public routes (no auth required)
	publicGroup := router.Group("/public")
	publicGroup.Use(middleware.PublicRateLimit())
	{
		publicGroup.GET("/content/:pageKey", publicHandlerInst.GetPublicContent)

		// Public article routes
		publicGroup.GET("/articles", articleHandlerInst.PublicList)
		publicGroup.GET("/articles/:slug", articleHandlerInst.PublicGetBySlug)

		// Public page routes
		publicGroup.GET("/pages", pageHandlerInst.PublicList)
		publicGroup.GET("/pages/:slug", pageHandlerInst.PublicGetBySlug)

		// Public theme route
		publicGroup.GET("/theme", themeHandlerInst.PublicGet)
	}

	// Auth routes (no auth middleware, but handlers validate credentials)
	authGroup := router.Group("/auth")
	{
		authGroup.POST("/login", middleware.LoginRateLimit(), authHandlerInst.Login)
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

		// Media management
		adminGroup.POST("/media/upload", mediaHandlerInst.Upload)
		adminGroup.GET("/media", mediaHandlerInst.List)
		adminGroup.DELETE("/media/:id", mediaHandlerInst.Delete)

		// Analytics
		adminGroup.GET("/analytics/summary", analyticsHandlerInst.GetSummary)

		// Article management
		adminGroup.GET("/articles", articleHandlerInst.AdminList)
		adminGroup.GET("/articles/:id", articleHandlerInst.AdminGetByID)
		adminGroup.POST("/articles", articleHandlerInst.AdminCreate)
		adminGroup.PUT("/articles/:id", articleHandlerInst.AdminUpdate)
		adminGroup.DELETE("/articles/:id", articleHandlerInst.AdminDelete)

		// Category management
		adminGroup.GET("/categories", categoryHandlerInst.List)
		adminGroup.POST("/categories", categoryHandlerInst.Create)
		adminGroup.PUT("/categories/:id", categoryHandlerInst.Update)
		adminGroup.DELETE("/categories/:id", categoryHandlerInst.Delete)

		// Tag management
		adminGroup.GET("/tags", tagHandlerInst.List)
		adminGroup.POST("/tags", tagHandlerInst.Create)
		adminGroup.DELETE("/tags/:id", tagHandlerInst.Delete)

		// Backup management
		adminGroup.GET("/backups", backupHandlerInst.List)
		adminGroup.POST("/backups/trigger", backupHandlerInst.Trigger)

		// Audit logs
		adminGroup.GET("/audit-logs", auditlogHandlerInst.List)

		// Page management
		adminGroup.GET("/pages", pageHandlerInst.AdminList)
		adminGroup.GET("/pages/:id", pageHandlerInst.AdminGetByID)
		adminGroup.POST("/pages", pageHandlerInst.AdminCreate)
		adminGroup.PUT("/pages/:id", pageHandlerInst.AdminUpdate)
		adminGroup.DELETE("/pages/:id", pageHandlerInst.AdminDelete)
		adminGroup.PUT("/pages/:id/publish", pageHandlerInst.AdminPublish)
		adminGroup.PUT("/pages/:id/unpublish", pageHandlerInst.AdminUnpublish)

		// Theme management
		adminGroup.GET("/theme", themeHandlerInst.AdminGet)
		adminGroup.PUT("/theme", themeHandlerInst.AdminUpdate)
	}

	// Serve uploaded files statically
	router.Static("/uploads", cfg.UploadDir)

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
