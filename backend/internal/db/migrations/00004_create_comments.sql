-- +goose Up
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    content TEXT NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    author_email VARCHAR(255),
    author_url VARCHAR(500),
    author_ip VARCHAR(45),
    content_type VARCHAR(20) NOT NULL,
    content_id INTEGER NOT NULL,
    parent_id INTEGER REFERENCES comments(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    site_id INTEGER
);

CREATE INDEX IF NOT EXISTS idx_comment_target ON comments(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_comment_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_comment_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comment_site ON comments(site_id);
CREATE INDEX IF NOT EXISTS idx_comment_deleted ON comments(deleted_at);

-- +goose Down
DROP TABLE IF EXISTS comments;
