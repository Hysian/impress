package auth

import (
	"strings"
	"testing"

	"golang.org/x/crypto/bcrypt"
)

func TestHashPassword(t *testing.T) {
	tests := []struct {
		name     string
		password string
		wantErr  bool
	}{
		{
			name:     "valid password",
			password: "securePassword123!",
			wantErr:  false,
		},
		{
			name:     "empty password",
			password: "",
			wantErr:  false, // bcrypt can hash empty strings
		},
		{
			name:     "long password",
			password: strings.Repeat("a", 72), // bcrypt max length
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hash, err := HashPassword(tt.password)
			if (err != nil) != tt.wantErr {
				t.Errorf("HashPassword() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr {
				// Verify hash is valid bcrypt format
				if !strings.HasPrefix(hash, "$2a$") && !strings.HasPrefix(hash, "$2b$") {
					t.Errorf("HashPassword() returned invalid bcrypt hash format: %s", hash)
				}
				// Verify hash length is reasonable
				if len(hash) < 50 {
					t.Errorf("HashPassword() returned hash that is too short: %d", len(hash))
				}
			}
		})
	}
}

func TestVerifyPassword(t *testing.T) {
	password := "testPassword123!"
	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	tests := []struct {
		name           string
		hashedPassword string
		password       string
		wantErr        bool
	}{
		{
			name:           "correct password",
			hashedPassword: hash,
			password:       password,
			wantErr:        false,
		},
		{
			name:           "incorrect password",
			hashedPassword: hash,
			password:       "wrongPassword",
			wantErr:        true,
		},
		{
			name:           "empty password against valid hash",
			hashedPassword: hash,
			password:       "",
			wantErr:        true,
		},
		{
			name:           "invalid hash format",
			hashedPassword: "invalid-hash",
			password:       password,
			wantErr:        true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := VerifyPassword(tt.hashedPassword, tt.password)
			if (err != nil) != tt.wantErr {
				t.Errorf("VerifyPassword() error = %v, wantErr %v", err, tt.wantErr)
			}
			if !tt.wantErr && err != nil {
				t.Errorf("VerifyPassword() unexpected error: %v", err)
			}
			if tt.wantErr && err == nil {
				t.Errorf("VerifyPassword() expected error but got nil")
			}
		})
	}
}

func TestPasswordHashUniqueness(t *testing.T) {
	password := "testPassword123!"

	// Hash the same password twice
	hash1, err := HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password first time: %v", err)
	}

	hash2, err := HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password second time: %v", err)
	}

	// Hashes should be different due to random salt
	if hash1 == hash2 {
		t.Error("HashPassword() produced identical hashes for same password (should use random salt)")
	}

	// But both should verify correctly
	if err := VerifyPassword(hash1, password); err != nil {
		t.Errorf("Failed to verify first hash: %v", err)
	}
	if err := VerifyPassword(hash2, password); err != nil {
		t.Errorf("Failed to verify second hash: %v", err)
	}
}

func TestBcryptCost(t *testing.T) {
	password := "testPassword123!"
	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	// Extract cost from hash
	cost, err := bcrypt.Cost([]byte(hash))
	if err != nil {
		t.Fatalf("Failed to extract cost from hash: %v", err)
	}

	if cost != DefaultCost {
		t.Errorf("Hash cost = %d, want %d", cost, DefaultCost)
	}
}
