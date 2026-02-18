package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	testSecret        = "test-secret-key"
	testRefreshSecret = "test-refresh-secret-key"
)

func TestGenerateAccessToken(t *testing.T) {
	userID := uint(123)
	username := "testuser"
	role := "admin"

	token, err := GenerateAccessToken(userID, username, role, testSecret)
	if err != nil {
		t.Fatalf("GenerateAccessToken() error = %v", err)
	}

	if token == "" {
		t.Error("GenerateAccessToken() returned empty token")
	}

	// Parse and verify the token
	claims, err := ParseToken(token, testSecret)
	if err != nil {
		t.Fatalf("Failed to parse generated token: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("UserID = %d, want %d", claims.UserID, userID)
	}
	if claims.Username != username {
		t.Errorf("Username = %s, want %s", claims.Username, username)
	}
	if claims.Role != role {
		t.Errorf("Role = %s, want %s", claims.Role, role)
	}
}

func TestGenerateRefreshToken(t *testing.T) {
	userID := uint(456)
	username := "testuser2"
	role := "editor"

	token, err := GenerateRefreshToken(userID, username, role, testRefreshSecret)
	if err != nil {
		t.Fatalf("GenerateRefreshToken() error = %v", err)
	}

	if token == "" {
		t.Error("GenerateRefreshToken() returned empty token")
	}

	// Parse and verify the token
	claims, err := ParseToken(token, testRefreshSecret)
	if err != nil {
		t.Fatalf("Failed to parse generated token: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("UserID = %d, want %d", claims.UserID, userID)
	}
	if claims.Username != username {
		t.Errorf("Username = %s, want %s", claims.Username, username)
	}
	if claims.Role != role {
		t.Errorf("Role = %s, want %s", claims.Role, role)
	}
}

func TestGenerateTokenPair(t *testing.T) {
	userID := uint(789)
	username := "testuser3"
	role := "admin"

	pair, err := GenerateTokenPair(userID, username, role, testSecret, testRefreshSecret)
	if err != nil {
		t.Fatalf("GenerateTokenPair() error = %v", err)
	}

	if pair.AccessToken == "" {
		t.Error("GenerateTokenPair() returned empty access token")
	}
	if pair.RefreshToken == "" {
		t.Error("GenerateTokenPair() returned empty refresh token")
	}

	// Verify access token
	accessClaims, err := ParseToken(pair.AccessToken, testSecret)
	if err != nil {
		t.Fatalf("Failed to parse access token: %v", err)
	}
	if accessClaims.UserID != userID {
		t.Errorf("Access token UserID = %d, want %d", accessClaims.UserID, userID)
	}

	// Verify refresh token
	refreshClaims, err := ParseToken(pair.RefreshToken, testRefreshSecret)
	if err != nil {
		t.Fatalf("Failed to parse refresh token: %v", err)
	}
	if refreshClaims.UserID != userID {
		t.Errorf("Refresh token UserID = %d, want %d", refreshClaims.UserID, userID)
	}
}

func TestParseToken_Valid(t *testing.T) {
	userID := uint(100)
	username := "validuser"
	role := "editor"

	token, err := GenerateAccessToken(userID, username, role, testSecret)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	claims, err := ParseToken(token, testSecret)
	if err != nil {
		t.Fatalf("ParseToken() error = %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("UserID = %d, want %d", claims.UserID, userID)
	}
	if claims.Username != username {
		t.Errorf("Username = %s, want %s", claims.Username, username)
	}
	if claims.Role != role {
		t.Errorf("Role = %s, want %s", claims.Role, role)
	}
}

func TestParseToken_InvalidToken(t *testing.T) {
	tests := []struct {
		name  string
		token string
	}{
		{
			name:  "malformed token",
			token: "invalid.token.format",
		},
		{
			name:  "empty token",
			token: "",
		},
		{
			name:  "random string",
			token: "randomstringnotjwt",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := ParseToken(tt.token, testSecret)
			if err != ErrInvalidToken {
				t.Errorf("ParseToken() error = %v, want %v", err, ErrInvalidToken)
			}
		})
	}
}

func TestParseToken_WrongSecret(t *testing.T) {
	userID := uint(200)
	username := "testuser"
	role := "admin"

	token, err := GenerateAccessToken(userID, username, role, testSecret)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	// Try to parse with wrong secret
	_, err = ParseToken(token, "wrong-secret")
	if err != ErrInvalidToken {
		t.Errorf("ParseToken() with wrong secret error = %v, want %v", err, ErrInvalidToken)
	}
}

func TestParseToken_ExpiredToken(t *testing.T) {
	userID := uint(300)
	username := "expireduser"
	role := "admin"

	// Create token with past expiration
	now := time.Now()
	claims := Claims{
		UserID:   userID,
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(-1 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now.Add(-2 * time.Hour)),
			NotBefore: jwt.NewNumericDate(now.Add(-2 * time.Hour)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(testSecret))
	if err != nil {
		t.Fatalf("Failed to create expired token: %v", err)
	}

	// Try to parse expired token
	_, err = ParseToken(tokenString, testSecret)
	if err != ErrExpiredToken {
		t.Errorf("ParseToken() error = %v, want %v", err, ErrExpiredToken)
	}
}

func TestParseToken_InvalidClaims(t *testing.T) {
	tests := []struct {
		name   string
		claims Claims
	}{
		{
			name: "missing user ID",
			claims: Claims{
				UserID:   0,
				Username: "testuser",
				Role:     "admin",
				RegisteredClaims: jwt.RegisteredClaims{
					ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
					IssuedAt:  jwt.NewNumericDate(time.Now()),
					NotBefore: jwt.NewNumericDate(time.Now()),
				},
			},
		},
		{
			name: "missing username",
			claims: Claims{
				UserID:   123,
				Username: "",
				Role:     "admin",
				RegisteredClaims: jwt.RegisteredClaims{
					ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
					IssuedAt:  jwt.NewNumericDate(time.Now()),
					NotBefore: jwt.NewNumericDate(time.Now()),
				},
			},
		},
		{
			name: "missing role",
			claims: Claims{
				UserID:   123,
				Username: "testuser",
				Role:     "",
				RegisteredClaims: jwt.RegisteredClaims{
					ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
					IssuedAt:  jwt.NewNumericDate(time.Now()),
					NotBefore: jwt.NewNumericDate(time.Now()),
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token := jwt.NewWithClaims(jwt.SigningMethodHS256, tt.claims)
			tokenString, err := token.SignedString([]byte(testSecret))
			if err != nil {
				t.Fatalf("Failed to create token: %v", err)
			}

			_, err = ParseToken(tokenString, testSecret)
			if err != ErrInvalidClaims {
				t.Errorf("ParseToken() error = %v, want %v", err, ErrInvalidClaims)
			}
		})
	}
}

func TestTokenExpiry(t *testing.T) {
	userID := uint(400)
	username := "testuser"
	role := "admin"

	// Generate access token
	accessToken, err := GenerateAccessToken(userID, username, role, testSecret)
	if err != nil {
		t.Fatalf("Failed to generate access token: %v", err)
	}

	// Parse and check expiry
	accessClaims, err := ParseToken(accessToken, testSecret)
	if err != nil {
		t.Fatalf("Failed to parse access token: %v", err)
	}

	// Verify expiry is approximately AccessTokenExpiry from now
	expectedExpiry := time.Now().Add(AccessTokenExpiry)
	actualExpiry := accessClaims.ExpiresAt.Time
	diff := actualExpiry.Sub(expectedExpiry)
	if diff < -1*time.Second || diff > 1*time.Second {
		t.Errorf("Access token expiry difference = %v, want within 1 second", diff)
	}

	// Generate refresh token
	refreshToken, err := GenerateRefreshToken(userID, username, role, testRefreshSecret)
	if err != nil {
		t.Fatalf("Failed to generate refresh token: %v", err)
	}

	// Parse and check expiry
	refreshClaims, err := ParseToken(refreshToken, testRefreshSecret)
	if err != nil {
		t.Fatalf("Failed to parse refresh token: %v", err)
	}

	// Verify expiry is approximately RefreshTokenExpiry from now
	expectedRefreshExpiry := time.Now().Add(RefreshTokenExpiry)
	actualRefreshExpiry := refreshClaims.ExpiresAt.Time
	refreshDiff := actualRefreshExpiry.Sub(expectedRefreshExpiry)
	if refreshDiff < -1*time.Second || refreshDiff > 1*time.Second {
		t.Errorf("Refresh token expiry difference = %v, want within 1 second", refreshDiff)
	}
}

func TestClaims_Validate(t *testing.T) {
	now := time.Now()

	tests := []struct {
		name    string
		claims  Claims
		wantErr error
	}{
		{
			name: "valid claims",
			claims: Claims{
				UserID:   123,
				Username: "testuser",
				Role:     "admin",
				RegisteredClaims: jwt.RegisteredClaims{
					ExpiresAt: jwt.NewNumericDate(now.Add(1 * time.Hour)),
					IssuedAt:  jwt.NewNumericDate(now),
					NotBefore: jwt.NewNumericDate(now),
				},
			},
			wantErr: nil,
		},
		{
			name: "missing user ID",
			claims: Claims{
				UserID:   0,
				Username: "testuser",
				Role:     "admin",
				RegisteredClaims: jwt.RegisteredClaims{
					ExpiresAt: jwt.NewNumericDate(now.Add(1 * time.Hour)),
				},
			},
			wantErr: ErrInvalidClaims,
		},
		{
			name: "missing username",
			claims: Claims{
				UserID:   123,
				Username: "",
				Role:     "admin",
				RegisteredClaims: jwt.RegisteredClaims{
					ExpiresAt: jwt.NewNumericDate(now.Add(1 * time.Hour)),
				},
			},
			wantErr: ErrInvalidClaims,
		},
		{
			name: "missing role",
			claims: Claims{
				UserID:   123,
				Username: "testuser",
				Role:     "",
				RegisteredClaims: jwt.RegisteredClaims{
					ExpiresAt: jwt.NewNumericDate(now.Add(1 * time.Hour)),
				},
			},
			wantErr: ErrInvalidClaims,
		},
		{
			name: "expired token",
			claims: Claims{
				UserID:   123,
				Username: "testuser",
				Role:     "admin",
				RegisteredClaims: jwt.RegisteredClaims{
					ExpiresAt: jwt.NewNumericDate(now.Add(-1 * time.Hour)),
				},
			},
			wantErr: ErrExpiredToken,
		},
		{
			name: "not yet valid",
			claims: Claims{
				UserID:   123,
				Username: "testuser",
				Role:     "admin",
				RegisteredClaims: jwt.RegisteredClaims{
					ExpiresAt: jwt.NewNumericDate(now.Add(1 * time.Hour)),
					NotBefore: jwt.NewNumericDate(now.Add(1 * time.Hour)),
				},
			},
			wantErr: ErrInvalidToken,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.claims.Validate()
			if err != tt.wantErr {
				t.Errorf("Claims.Validate() error = %v, want %v", err, tt.wantErr)
			}
		})
	}
}
