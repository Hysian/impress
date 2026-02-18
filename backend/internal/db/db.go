package db

import (
  "context"
  "fmt"
  "strings"
  "time"

  "gorm.io/driver/postgres"
  "gorm.io/driver/sqlite"
  "gorm.io/gorm"
  "gorm.io/gorm/logger"
)

// DB wraps the GORM database connection
type DB struct {
  *gorm.DB
}

// InitOptions holds configuration for database initialization
type InitOptions struct {
  DSN         string
  MaxOpenConn int
  MaxIdleConn int
  MaxLifetime time.Duration
  LogLevel    logger.LogLevel
}

// Init initializes a GORM database connection based on the DSN
// Supports SQLite (file:*.db or :memory:) and PostgreSQL (postgres:// or libpq key=value)
func Init(opts InitOptions) (*DB, error) {
  var dialector gorm.Dialector

  dsn := strings.TrimSpace(opts.DSN)
  // PostgreSQL: "postgres://...", "postgresql://...", or libpq "host=... dbname=..."
  usePostgres := (len(dsn) >= 8 && (dsn[:8] == "postgres" || (len(dsn) >= 10 && dsn[:10] == "postgresql"))) ||
    strings.Contains(dsn, "host=") || strings.Contains(dsn, "dbname=")
  if usePostgres {
    dialector = postgres.Open(dsn)
  } else {
    // Default to SQLite for file paths or :memory:
    dialector = sqlite.Open(dsn)
  }

  // Configure GORM
  gormConfig := &gorm.Config{
    Logger: logger.Default.LogMode(opts.LogLevel),
  }

  db, err := gorm.Open(dialector, gormConfig)
  if err != nil {
    return nil, fmt.Errorf("failed to open database: %w", err)
  }

  // Get underlying SQL DB for connection pool configuration
  sqlDB, err := db.DB()
  if err != nil {
    return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
  }

  // Apply connection pool settings if provided
  if opts.MaxOpenConn > 0 {
    sqlDB.SetMaxOpenConns(opts.MaxOpenConn)
  }
  if opts.MaxIdleConn > 0 {
    sqlDB.SetMaxIdleConns(opts.MaxIdleConn)
  }
  if opts.MaxLifetime > 0 {
    sqlDB.SetConnMaxLifetime(opts.MaxLifetime)
  }

  return &DB{DB: db}, nil
}

// HealthCheck performs a health check query (SELECT 1) to verify connection
func (db *DB) HealthCheck(ctx context.Context) error {
  sqlDB, err := db.DB.DB()
  if err != nil {
    return fmt.Errorf("failed to get underlying sql.DB: %w", err)
  }

  if err := sqlDB.PingContext(ctx); err != nil {
    return fmt.Errorf("health check failed: %w", err)
  }

  return nil
}

// Close closes the database connection
func (db *DB) Close() error {
  sqlDB, err := db.DB.DB()
  if err != nil {
    return fmt.Errorf("failed to get underlying sql.DB: %w", err)
  }
  return sqlDB.Close()
}
