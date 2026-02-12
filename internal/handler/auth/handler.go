package auth

import (
	"blotting-consultancy/internal/repository"
	"blotting-consultancy/pkg/config"
)

// Handler handles auth-related HTTP requests
type Handler struct {
	userRepo         repository.UserRepository
	refreshTokenRepo repository.RefreshTokenRepository
	config           *config.Config
}

// NewHandler creates a new auth handler
func NewHandler(
	userRepo repository.UserRepository,
	refreshTokenRepo repository.RefreshTokenRepository,
	config *config.Config,
) *Handler {
	return &Handler{
		userRepo:         userRepo,
		refreshTokenRepo: refreshTokenRepo,
		config:           config,
	}
}
