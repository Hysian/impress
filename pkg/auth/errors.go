package auth

import "errors"

var (
	// ErrInvalidToken indicates the token is malformed or invalid
	ErrInvalidToken = errors.New("invalid token")

	// ErrExpiredToken indicates the token has expired
	ErrExpiredToken = errors.New("token has expired")

	// ErrInvalidClaims indicates the token claims are invalid or missing required fields
	ErrInvalidClaims = errors.New("invalid token claims")
)
