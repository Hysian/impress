package migrations

import "embed"

//go:embed *.sql
var EmbedMigrations embed.FS

// Dialect is set by the caller before goose.Up so Go-based migrations can
// short-circuit dialect-specific data migrations (e.g. SQLite legacy
// content_documents → unified_pages conversion). Valid values are
// "sqlite3" or "postgres".
var Dialect string
