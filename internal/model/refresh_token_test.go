package model

import (
	"testing"
	"time"
)

func TestRefreshToken_TableName(t *testing.T) {
	rt := RefreshToken{}
	expected := "refresh_tokens"
	if rt.TableName() != expected {
		t.Errorf("Expected table name %s, got %s", expected, rt.TableName())
	}
}

func TestRefreshToken_Validate(t *testing.T) {
	tests := []struct {
		name    string
		token   RefreshToken
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid token",
			token: RefreshToken{
				UserID:    1,
				Token:     "valid_token_string",
				ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
			},
			wantErr: false,
		},
		{
			name: "missing user_id",
			token: RefreshToken{
				Token:     "valid_token_string",
				ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
			},
			wantErr: true,
			errMsg:  "user_id is required",
		},
		{
			name: "missing token",
			token: RefreshToken{
				UserID:    1,
				ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
			},
			wantErr: true,
			errMsg:  "token is required",
		},
		{
			name: "missing expires_at",
			token: RefreshToken{
				UserID: 1,
				Token:  "valid_token_string",
			},
			wantErr: true,
			errMsg:  "expires_at is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.token.Validate()
			if tt.wantErr {
				if err == nil {
					t.Error("Expected error but got none")
				} else if err.Error() != tt.errMsg {
					t.Errorf("Expected error message %q, got %q", tt.errMsg, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error but got: %v", err)
				}
			}
		})
	}
}

func TestRefreshToken_IsExpired(t *testing.T) {
	tests := []struct {
		name      string
		expiresAt time.Time
		want      bool
	}{
		{
			name:      "not expired",
			expiresAt: time.Now().Add(1 * time.Hour),
			want:      false,
		},
		{
			name:      "expired",
			expiresAt: time.Now().Add(-1 * time.Hour),
			want:      true,
		},
		{
			name:      "just expired",
			expiresAt: time.Now().Add(-1 * time.Second),
			want:      true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rt := RefreshToken{
				ExpiresAt: tt.expiresAt,
			}
			if got := rt.IsExpired(); got != tt.want {
				t.Errorf("IsExpired() = %v, want %v", got, tt.want)
			}
		})
	}
}
