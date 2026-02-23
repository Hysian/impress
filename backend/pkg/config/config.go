package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

// Config holds all configuration values for the application
type Config struct {
	Port               int
	DBDSN              string
	JWTSecret          string
	JWTRefreshSecret   string
	Env                string
	CORSAllowedOrigins []string
	UploadDir          string
	BaseURL            string
}

const defaultSQLiteDSN = "file:./data/blotting.db?cache=shared&mode=rwc"

// Load reads configuration from environment variables with validation and defaults
func Load() (*Config, error) {
	cfg := &Config{}
	var missingVars []string

	// PORT (optional, default 8088)
	portStr := os.Getenv("PORT")
	if portStr == "" {
		cfg.Port = 8088
	} else {
		port, err := strconv.Atoi(portStr)
		if err != nil {
			return nil, fmt.Errorf("PORT must be a valid integer: %w", err)
		}
		cfg.Port = port
	}

	// DB_DSN (optional, default SQLite file for local development)
	cfg.DBDSN = os.Getenv("DB_DSN")
	if cfg.DBDSN == "" {
		cfg.DBDSN = defaultSQLiteDSN
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

	// CORS_ALLOWED_ORIGINS (optional, comma-separated)
	// Default in development supports local frontend dev servers.
	corsAllowedOrigins := strings.TrimSpace(os.Getenv("CORS_ALLOWED_ORIGINS"))
	if corsAllowedOrigins != "" {
		cfg.CORSAllowedOrigins = splitAndTrim(corsAllowedOrigins)
	} else if cfg.Env == "development" {
		cfg.CORSAllowedOrigins = []string{
			"http://localhost:3000",
			"http://localhost:3001",
			"http://127.0.0.1:3000",
			"http://127.0.0.1:3001",
		}
	}

	// UPLOAD_DIR (optional, default "./uploads")
	cfg.UploadDir = os.Getenv("UPLOAD_DIR")
	if cfg.UploadDir == "" {
		cfg.UploadDir = "./uploads"
	}

	// BASE_URL (optional, default "https://www.example.com")
	cfg.BaseURL = os.Getenv("BASE_URL")
	if cfg.BaseURL == "" {
		cfg.BaseURL = "https://www.example.com"
	}

	// Return validation error if required variables are missing
	if len(missingVars) > 0 {
		return nil, fmt.Errorf("missing required environment variables: %v", missingVars)
	}

	return cfg, nil
}

func splitAndTrim(csv string) []string {
	items := strings.Split(csv, ",")
	result := make([]string, 0, len(items))
	for _, item := range items {
		trimmed := strings.TrimSpace(item)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}
