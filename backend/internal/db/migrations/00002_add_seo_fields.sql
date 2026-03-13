-- +goose Up
-- No-op: keywords column is now created by GORM AutoMigrate.
-- This migration originally added keywords to pages table,
-- but AutoMigrate runs first and already creates the full schema.

-- +goose Down
-- No-op
