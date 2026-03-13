-- +goose Up
-- No-op: FTS5 virtual table creation moved to application startup
-- (SQLite FTS5 may not be available in all builds)

-- +goose Down
DROP TABLE IF EXISTS search_index_fts;
