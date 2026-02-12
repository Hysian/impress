package config

import (
  "fmt"
  "os"
  "strconv"
)

// Config holds all configuration values for the application
type Config struct {
  Port               int
  DBDSN              string
  JWTSecret          string
  JWTRefreshSecret   string
  Env                string
}

// Load reads configuration from environment variables with validation and defaults
func Load() (*Config, error) {
  cfg := &Config{}
  var missingVars []string

  // PORT (optional, default 8080)
  portStr := os.Getenv("PORT")
  if portStr == "" {
    cfg.Port = 8080
  } else {
    port, err := strconv.Atoi(portStr)
    if err != nil {
      return nil, fmt.Errorf("PORT must be a valid integer: %w", err)
    }
    cfg.Port = port
  }

  // DB_DSN (required)
  cfg.DBDSN = os.Getenv("DB_DSN")
  if cfg.DBDSN == "" {
    missingVars = append(missingVars, "DB_DSN")
  }

  // JWT_SECRET (required)
  cfg.JWTSecret = os.Getenv("JWT_SECRET")
  if cfg.JWTSecret == "" {
    missingVars = append(missingVars, "JWT_SECRET")
  }

  // JWT_REFRESH_SECRET (required)
  cfg.JWTRefreshSecret = os.Getenv("JWT_REFRESH_SECRET")
  if cfg.JWTRefreshSecret == "" {
    missingVars = append(missingVars, "JWT_REFRESH_SECRET")
  }

  // ENV (optional, default "development")
  cfg.Env = os.Getenv("ENV")
  if cfg.Env == "" {
    cfg.Env = "development"
  }

  // Return validation error if required variables are missing
  if len(missingVars) > 0 {
    return nil, fmt.Errorf("missing required environment variables: %v", missingVars)
  }

  return cfg, nil
}
