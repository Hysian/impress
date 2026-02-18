package logger

import (
	"log/slog"
	"os"
)

// Logger wraps slog.Logger with leveled output
type Logger struct {
	*slog.Logger
}

// New creates a new Logger instance with optional context fields
// format is determined by env: "production" uses JSON, others use text
func New(env string, contextFields map[string]interface{}) *Logger {
	var handler slog.Handler

	// Choose handler based on environment
	if env == "production" {
		handler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelDebug,
		})
	} else {
		handler = slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelDebug,
		})
	}

	baseLogger := slog.New(handler)

	// Add context fields if provided
	if len(contextFields) > 0 {
		args := make([]interface{}, 0, len(contextFields)*2)
		for k, v := range contextFields {
			args = append(args, k, v)
		}
		baseLogger = baseLogger.With(args...)
	}

	return &Logger{Logger: baseLogger}
}

// Debug logs a debug-level message
func (l *Logger) Debug(msg string, args ...interface{}) {
	l.Logger.Debug(msg, args...)
}

// Info logs an info-level message
func (l *Logger) Info(msg string, args ...interface{}) {
	l.Logger.Info(msg, args...)
}

// Warn logs a warning-level message
func (l *Logger) Warn(msg string, args ...interface{}) {
	l.Logger.Warn(msg, args...)
}

// Error logs an error-level message
func (l *Logger) Error(msg string, args ...interface{}) {
	l.Logger.Error(msg, args...)
}

// With returns a new Logger with additional context fields
func (l *Logger) With(args ...interface{}) *Logger {
	return &Logger{Logger: l.Logger.With(args...)}
}
