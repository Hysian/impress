package logger

import (
	"bytes"
	"encoding/json"
	"io"
	"os"
	"strings"
	"testing"
)

func TestNew_DevelopmentFormat(t *testing.T) {
	// Capture stdout
	old := os.Stdout
	r, w, _ := os.Pipe()
	os.Stdout = w

	logger := New("development", nil)
	logger.Info("test message")

	w.Close()
	os.Stdout = old

	var buf bytes.Buffer
	io.Copy(&buf, r)
	output := buf.String()

	// Development mode should use text format (not JSON)
	if strings.Contains(output, "{") && strings.Contains(output, "}") {
		// Check if it's actually JSON
		var js map[string]interface{}
		if json.Unmarshal([]byte(output), &js) == nil {
			t.Error("Expected text format in development mode, got JSON")
		}
	}

	if !strings.Contains(output, "test message") {
		t.Error("Expected log message not found in output")
	}
}

func TestNew_ProductionFormat(t *testing.T) {
	// Capture stdout
	old := os.Stdout
	r, w, _ := os.Pipe()
	os.Stdout = w

	logger := New("production", nil)
	logger.Info("test message")

	w.Close()
	os.Stdout = old

	var buf bytes.Buffer
	io.Copy(&buf, r)
	output := buf.String()

	// Production mode should use JSON format
	var js map[string]interface{}
	if err := json.Unmarshal([]byte(output), &js); err != nil {
		t.Errorf("Expected JSON format in production mode, got error: %v\nOutput: %s", err, output)
	}

	if msg, ok := js["msg"].(string); !ok || msg != "test message" {
		t.Error("Expected 'test message' in JSON output")
	}
}

func TestNew_WithContextFields(t *testing.T) {
	// Capture stdout
	old := os.Stdout
	r, w, _ := os.Pipe()
	os.Stdout = w

	contextFields := map[string]interface{}{
		"service": "test-service",
		"version": "1.0.0",
	}
	logger := New("production", contextFields)
	logger.Info("test message")

	w.Close()
	os.Stdout = old

	var buf bytes.Buffer
	io.Copy(&buf, r)
	output := buf.String()

	var js map[string]interface{}
	if err := json.Unmarshal([]byte(output), &js); err != nil {
		t.Fatalf("Failed to parse JSON output: %v", err)
	}

	if service, ok := js["service"].(string); !ok || service != "test-service" {
		t.Error("Expected context field 'service' not found in output")
	}

	if version, ok := js["version"].(string); !ok || version != "1.0.0" {
		t.Error("Expected context field 'version' not found in output")
	}
}

func TestLogger_Debug(t *testing.T) {
	old := os.Stdout
	r, w, _ := os.Pipe()
	os.Stdout = w

	logger := New("production", nil)
	logger.Debug("debug message", "key", "value")

	w.Close()
	os.Stdout = old

	var buf bytes.Buffer
	io.Copy(&buf, r)
	output := buf.String()

	var js map[string]interface{}
	if err := json.Unmarshal([]byte(output), &js); err != nil {
		t.Fatalf("Failed to parse JSON output: %v", err)
	}

	if level, ok := js["level"].(string); !ok || level != "DEBUG" {
		t.Errorf("Expected level 'DEBUG', got %v", js["level"])
	}

	if msg, ok := js["msg"].(string); !ok || msg != "debug message" {
		t.Error("Expected 'debug message' in output")
	}

	if key, ok := js["key"].(string); !ok || key != "value" {
		t.Error("Expected key-value pair in output")
	}
}

func TestLogger_Info(t *testing.T) {
	old := os.Stdout
	r, w, _ := os.Pipe()
	os.Stdout = w

	logger := New("production", nil)
	logger.Info("info message", "request_id", "12345")

	w.Close()
	os.Stdout = old

	var buf bytes.Buffer
	io.Copy(&buf, r)
	output := buf.String()

	var js map[string]interface{}
	if err := json.Unmarshal([]byte(output), &js); err != nil {
		t.Fatalf("Failed to parse JSON output: %v", err)
	}

	if level, ok := js["level"].(string); !ok || level != "INFO" {
		t.Errorf("Expected level 'INFO', got %v", js["level"])
	}

	if msg, ok := js["msg"].(string); !ok || msg != "info message" {
		t.Error("Expected 'info message' in output")
	}
}

func TestLogger_Warn(t *testing.T) {
	old := os.Stdout
	r, w, _ := os.Pipe()
	os.Stdout = w

	logger := New("production", nil)
	logger.Warn("warning message", "error_code", "WARN001")

	w.Close()
	os.Stdout = old

	var buf bytes.Buffer
	io.Copy(&buf, r)
	output := buf.String()

	var js map[string]interface{}
	if err := json.Unmarshal([]byte(output), &js); err != nil {
		t.Fatalf("Failed to parse JSON output: %v", err)
	}

	if level, ok := js["level"].(string); !ok || level != "WARN" {
		t.Errorf("Expected level 'WARN', got %v", js["level"])
	}

	if msg, ok := js["msg"].(string); !ok || msg != "warning message" {
		t.Error("Expected 'warning message' in output")
	}
}

func TestLogger_Error(t *testing.T) {
	old := os.Stdout
	r, w, _ := os.Pipe()
	os.Stdout = w

	logger := New("production", nil)
	logger.Error("error message", "error", "something went wrong")

	w.Close()
	os.Stdout = old

	var buf bytes.Buffer
	io.Copy(&buf, r)
	output := buf.String()

	var js map[string]interface{}
	if err := json.Unmarshal([]byte(output), &js); err != nil {
		t.Fatalf("Failed to parse JSON output: %v", err)
	}

	if level, ok := js["level"].(string); !ok || level != "ERROR" {
		t.Errorf("Expected level 'ERROR', got %v", js["level"])
	}

	if msg, ok := js["msg"].(string); !ok || msg != "error message" {
		t.Error("Expected 'error message' in output")
	}
}

func TestLogger_With(t *testing.T) {
	old := os.Stdout
	r, w, _ := os.Pipe()
	os.Stdout = w

	logger := New("production", nil)
	childLogger := logger.With("user_id", "user123")
	childLogger.Info("user action", "action", "login")

	w.Close()
	os.Stdout = old

	var buf bytes.Buffer
	io.Copy(&buf, r)
	output := buf.String()

	var js map[string]interface{}
	if err := json.Unmarshal([]byte(output), &js); err != nil {
		t.Fatalf("Failed to parse JSON output: %v", err)
	}

	if userID, ok := js["user_id"].(string); !ok || userID != "user123" {
		t.Error("Expected 'user_id' context field from With() not found")
	}

	if action, ok := js["action"].(string); !ok || action != "login" {
		t.Error("Expected 'action' field in output")
	}
}

func TestLogger_AllLevels(t *testing.T) {
	// Test that all log levels work correctly
	old := os.Stdout
	r, w, _ := os.Pipe()
	os.Stdout = w

	logger := New("production", nil)
	logger.Debug("debug")
	logger.Info("info")
	logger.Warn("warn")
	logger.Error("error")

	w.Close()
	os.Stdout = old

	var buf bytes.Buffer
	io.Copy(&buf, r)
	output := buf.String()

	// Should have 4 log lines
	lines := strings.Split(strings.TrimSpace(output), "\n")
	if len(lines) != 4 {
		t.Errorf("Expected 4 log lines, got %d", len(lines))
	}

	// Check each level
	levels := []string{"DEBUG", "INFO", "WARN", "ERROR"}
	for i, line := range lines {
		var js map[string]interface{}
		if err := json.Unmarshal([]byte(line), &js); err != nil {
			t.Errorf("Failed to parse line %d: %v", i, err)
			continue
		}
		if level, ok := js["level"].(string); !ok || level != levels[i] {
			t.Errorf("Line %d: expected level %s, got %v", i, levels[i], js["level"])
		}
	}
}

// TestLogger_LevelHierarchy tests that all levels are logged (since we set level to Debug)
func TestLogger_LevelHierarchy(t *testing.T) {
	old := os.Stdout
	r, w, _ := os.Pipe()
	os.Stdout = w

	logger := New("production", nil)

	// All these should be logged since we set level to Debug
	logger.Debug("should appear")
	logger.Info("should appear")
	logger.Warn("should appear")
	logger.Error("should appear")

	w.Close()
	os.Stdout = old

	var buf bytes.Buffer
	io.Copy(&buf, r)
	output := buf.String()

	// All 4 messages should appear
	if !strings.Contains(output, "should appear") {
		t.Error("Expected all log levels to be output")
	}

	lines := strings.Split(strings.TrimSpace(output), "\n")
	if len(lines) != 4 {
		t.Errorf("Expected 4 log lines (all levels), got %d", len(lines))
	}
}
