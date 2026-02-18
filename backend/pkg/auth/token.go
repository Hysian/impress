package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	// AccessTokenExpiry is the expiration duration for access tokens (15 minutes)
	AccessTokenExpiry = 15 * time.Minute

	// RefreshTokenExpiry is the expiration duration for refresh tokens (7 days)
	RefreshTokenExpiry = 7 * 24 * time.Hour
)

// Claims represents the JWT claims structure
type Claims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

// TokenPair represents an access and refresh token pair
type TokenPair struct {
	AccessToken  string
	RefreshToken string
}

// GenerateAccessToken generates a JWT access token with user claims
func GenerateAccessToken(userID uint, username, role, secret string) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:   userID,
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(AccessTokenExpiry)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// GenerateRefreshToken generates a JWT refresh token with user claims
func GenerateRefreshToken(userID uint, username, role, secret string) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:   userID,
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(RefreshTokenExpiry)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// GenerateTokenPair generates both access and refresh tokens
func GenerateTokenPair(userID uint, username, role, accessSecret, refreshSecret string) (*TokenPair, error) {
	accessToken, err := GenerateAccessToken(userID, username, role, accessSecret)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	refreshToken, err := GenerateRefreshToken(userID, username, role, refreshSecret)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

// ParseToken parses and validates a JWT token string
func ParseToken(tokenString, secret string) (*Claims, error) {
	// Parse with validation disabled to extract claims first
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Verify signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	}, jwt.WithoutClaimsValidation())

	if err != nil {
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*Claims)
	if !ok {
		return nil, ErrInvalidToken
	}

	// Validate required claims
	if err := claims.Validate(); err != nil {
		return nil, err
	}

	return claims, nil
}

// Validate checks if the claims contain all required fields
func (c *Claims) Validate() error {
	if c.UserID == 0 {
		return ErrInvalidClaims
	}
	if c.Username == "" {
		return ErrInvalidClaims
	}
	if c.Role == "" {
		return ErrInvalidClaims
	}

	// Check expiration
	now := time.Now()
	if c.ExpiresAt != nil && c.ExpiresAt.Before(now) {
		return ErrExpiredToken
	}

	// Check not before
	if c.NotBefore != nil && c.NotBefore.After(now) {
		return ErrInvalidToken
	}

	return nil
}
