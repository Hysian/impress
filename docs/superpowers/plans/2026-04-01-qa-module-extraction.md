# QA Module Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract QA knowledge Q&A from hardcoded integration into a self-contained internal module with SiteConfig-based feature flags.

**Architecture:** Create a Module interface + Manager pattern in `backend/internal/module/`, move all QA code into `backend/internal/modules/qa/`, mirror on frontend with `frontend/src/modules/qa/`. Feature flag via SiteConfig `features` key, delivered through the bootstrap endpoint.

**Tech Stack:** Go/Gin/GORM, React/TypeScript, Vite

**Spec:** `docs/superpowers/specs/2026-04-01-qa-module-extraction-design.md`

---

### Task 1: Create Module Interface and Manager

**Files:**
- Create: `backend/internal/module/module.go`
- Create: `backend/internal/module/manager.go`

- [ ] **Step 1: Create the Module interface**

Create `backend/internal/module/module.go`:

```go
package module

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"blotting-consultancy/internal/provider"
	"blotting-consultancy/internal/repository"
)

// Module defines the contract for a self-contained feature module.
type Module interface {
	// Name returns the module identifier (e.g. "qa").
	Name() string
	// Init initializes the module (auto-migrate, create repos/services/handlers).
	Init(deps Dependencies) error
	// RegisterRoutes mounts the module's HTTP routes onto the given router groups.
	RegisterRoutes(public, admin *gin.RouterGroup)
}

// Dependencies provides shared resources that modules need.
type Dependencies struct {
	DB       *gorm.DB
	Registry *provider.Registry
	Repos    *SharedRepos
	SiteCfg  repository.SiteConfigRepository
}

// SharedRepos holds cross-module repositories.
type SharedRepos struct {
	ContentDoc repository.ContentDocumentRepository
	Article    repository.ArticleRepository
}
```

- [ ] **Step 2: Create the Manager**

Create `backend/internal/module/manager.go`:

```go
package module

import (
	"fmt"

	"github.com/gin-gonic/gin"
)

// Manager manages the lifecycle of feature modules.
type Manager struct {
	modules []Module
}

// NewManager creates a new module Manager.
func NewManager() *Manager {
	return &Manager{}
}

// Register adds a module to the manager.
func (m *Manager) Register(mod Module) {
	m.modules = append(m.modules, mod)
}

// InitAll initializes all registered modules in order.
func (m *Manager) InitAll(deps Dependencies) error {
	for _, mod := range m.modules {
		if err := mod.Init(deps); err != nil {
			return fmt.Errorf("module %s init: %w", mod.Name(), err)
		}
	}
	return nil
}

// RegisterAllRoutes registers routes for all modules.
func (m *Manager) RegisterAllRoutes(public, admin *gin.RouterGroup) {
	for _, mod := range m.modules {
		mod.RegisterRoutes(public, admin)
	}
}

// Has returns true if a module with the given name is registered.
func (m *Manager) Has(name string) bool {
	for _, mod := range m.modules {
		if mod.Name() == name {
			return true
		}
	}
	return false
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd /home/dev/impress/backend && go build ./internal/module/...`
Expected: Success, no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/internal/module/
git commit -m "feat(module): add Module interface and Manager for feature modularization"
```

---

### Task 2: Update SiteConfig to Support Features Key

**Files:**
- Modify: `backend/internal/model/site_config.go:12-14` (constants) and `:29-33` (Validate)

- [ ] **Step 1: Add SiteConfigKeyFeatures constant**

In `backend/internal/model/site_config.go`, add the constant:

```go
const (
	SiteConfigKeyGlobal   = "global"
	SiteConfigKeyTheme    = "theme"
	SiteConfigKeyEmail    = "email"
	SiteConfigKeyFeatures = "features"
)
```

- [ ] **Step 2: Update Validate() to accept "features"**

Change the `Validate` method:

```go
func (sc *SiteConfig) Validate() error {
	if sc.Key != SiteConfigKeyGlobal && sc.Key != SiteConfigKeyTheme && sc.Key != SiteConfigKeyEmail && sc.Key != SiteConfigKeyFeatures {
		return errors.New("key must be 'global', 'theme', 'email', or 'features'")
	}
	return nil
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd /home/dev/impress/backend && go build ./internal/model/...`
Expected: Success.

- [ ] **Step 4: Commit**

```bash
git add backend/internal/model/site_config.go
git commit -m "feat(site-config): add 'features' as valid SiteConfig key"
```

---

### Task 3: Create QA Module — Model and Repository

**Files:**
- Create: `backend/internal/modules/qa/model.go`
- Create: `backend/internal/modules/qa/repository.go`

- [ ] **Step 1: Create QA model**

Create `backend/internal/modules/qa/model.go`. Move the `QALog`, `QAFeedback`, and `JSONArray` types from `backend/internal/model/qa_log.go`, changing the package to `qa`:

```go
package qa

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

// QAFeedback represents a thumbs up/down rating.
type QAFeedback string

const (
	QAFeedbackNone     QAFeedback = ""
	QAFeedbackPositive QAFeedback = "positive"
	QAFeedbackNegative QAFeedback = "negative"
)

// QALog records a knowledge base Q&A interaction.
type QALog struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	Question  string     `gorm:"type:text;not null" json:"question"`
	Answer    string     `gorm:"type:text;not null" json:"answer"`
	Sources   JSONArray  `gorm:"type:jsonb" json:"sources"`
	Locale    string     `gorm:"size:10" json:"locale"`
	IPAddress string     `gorm:"size:45" json:"ipAddress"`
	Rating    QAFeedback `gorm:"size:20" json:"rating"`
	CreatedAt time.Time  `gorm:"autoCreateTime;index" json:"createdAt"`
}

// TableName returns the table name for QALog.
func (QALog) TableName() string {
	return "qa_logs"
}

// JSONArray represents a JSON array stored in the database.
type JSONArray []interface{}

// Value implements the driver.Valuer interface for database serialization.
func (j JSONArray) Value() (driver.Value, error) {
	if j == nil {
		return json.Marshal([]interface{}{})
	}
	return json.Marshal(j)
}

// Scan implements the sql.Scanner interface for database deserialization.
func (j *JSONArray) Scan(value interface{}) error {
	if value == nil {
		*j = make(JSONArray, 0)
		return nil
	}

	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return nil
	}

	return json.Unmarshal(bytes, j)
}
```

- [ ] **Step 2: Create QA repository**

Create `backend/internal/modules/qa/repository.go`. Merge the interface and GORM implementation from `qa_log_repository.go` + `qa_log_repository_impl.go`, updating all type references from `model.QALog` / `model.QAFeedback` to local `QALog` / `QAFeedback`:

```go
package qa

import (
	"context"
	"errors"

	"gorm.io/gorm"
)

// QALogRepository defines the interface for Q&A log data access.
type QALogRepository interface {
	Create(ctx context.Context, log *QALog) error
	FindByID(ctx context.Context, id uint) (*QALog, error)
	List(ctx context.Context, offset, limit int) ([]*QALog, int64, error)
	UpdateRating(ctx context.Context, id uint, rating QAFeedback) error
}

// gormQALogRepository implements QALogRepository using GORM.
type gormQALogRepository struct {
	db *gorm.DB
}

// newGormQALogRepository creates a new gormQALogRepository.
func newGormQALogRepository(db *gorm.DB) QALogRepository {
	return &gormQALogRepository{db: db}
}

// Create creates a new Q&A log entry.
func (r *gormQALogRepository) Create(ctx context.Context, log *QALog) error {
	return r.db.WithContext(ctx).Create(log).Error
}

// FindByID finds a Q&A log entry by ID.
func (r *gormQALogRepository) FindByID(ctx context.Context, id uint) (*QALog, error) {
	var log QALog
	err := r.db.WithContext(ctx).First(&log, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("qa log not found")
		}
		return nil, err
	}
	return &log, nil
}

// List returns paginated Q&A log entries, ordered by created_at DESC.
func (r *gormQALogRepository) List(ctx context.Context, offset, limit int) ([]*QALog, int64, error) {
	var logs []*QALog
	var total int64

	query := r.db.WithContext(ctx).Model(&QALog{})

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&logs).Error; err != nil {
		return nil, 0, err
	}

	return logs, total, nil
}

// UpdateRating updates the rating of a Q&A log entry.
func (r *gormQALogRepository) UpdateRating(ctx context.Context, id uint, rating QAFeedback) error {
	result := r.db.WithContext(ctx).
		Model(&QALog{}).
		Where("id = ?", id).
		Update("rating", rating)

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("qa log not found")
	}
	return nil
}
```

Note: The repo constructor and struct are now unexported (`gormQALogRepository`, `newGormQALogRepository`) since they're only used within the `qa` package by `module.go`.

- [ ] **Step 3: Verify compilation**

Run: `cd /home/dev/impress/backend && go build ./internal/modules/qa/...`
Expected: Success.

- [ ] **Step 4: Commit**

```bash
git add backend/internal/modules/qa/model.go backend/internal/modules/qa/repository.go
git commit -m "feat(qa-module): add QA model and repository"
```

---

### Task 4: Create QA Module — VectorStore, Embedding, Service

**Files:**
- Create: `backend/internal/modules/qa/vectorstore.go`
- Create: `backend/internal/modules/qa/embedding.go`
- Create: `backend/internal/modules/qa/service.go`

- [ ] **Step 1: Create vectorstore.go**

Move `backend/internal/service/vectorstore_memory.go` to `backend/internal/modules/qa/vectorstore.go`, changing the package to `qa`. The code is identical except for `package qa` instead of `package service`:

```go
package qa

import (
	"context"
	"math"
	"sort"
	"sync"

	"blotting-consultancy/internal/provider"
)

// vectorEntry stores a single vector with its metadata.
type vectorEntry struct {
	ID        string
	Embedding []float64
	Metadata  map[string]string
}

// MemoryVectorStore is an in-memory implementation of VectorStoreProvider
// using brute-force cosine similarity. Suitable for development and testing.
type MemoryVectorStore struct {
	mu      sync.RWMutex
	entries map[string]*vectorEntry
}

// NewMemoryVectorStore creates a new in-memory vector store.
func NewMemoryVectorStore() *MemoryVectorStore {
	return &MemoryVectorStore{
		entries: make(map[string]*vectorEntry),
	}
}

// Store saves an embedding with its ID and metadata.
func (m *MemoryVectorStore) Store(_ context.Context, id string, embedding []float64, metadata map[string]string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.entries[id] = &vectorEntry{
		ID:        id,
		Embedding: embedding,
		Metadata:  metadata,
	}
	return nil
}

// Search finds the top-K most similar vectors to the query embedding using cosine similarity.
func (m *MemoryVectorStore) Search(_ context.Context, query []float64, topK int) ([]provider.VectorResult, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if len(m.entries) == 0 {
		return nil, nil
	}

	type scored struct {
		id       string
		score    float64
		metadata map[string]string
	}

	results := make([]scored, 0, len(m.entries))
	for _, entry := range m.entries {
		sim := cosineSimilarity(query, entry.Embedding)
		results = append(results, scored{
			id:       entry.ID,
			score:    sim,
			metadata: entry.Metadata,
		})
	}

	sort.Slice(results, func(i, j int) bool {
		return results[i].score > results[j].score
	})

	if topK > len(results) {
		topK = len(results)
	}

	out := make([]provider.VectorResult, topK)
	for i := 0; i < topK; i++ {
		out[i] = provider.VectorResult{
			ID:       results[i].id,
			Score:    results[i].score,
			Metadata: results[i].metadata,
		}
	}

	return out, nil
}

// Delete removes an embedding by ID.
func (m *MemoryVectorStore) Delete(_ context.Context, id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	delete(m.entries, id)
	return nil
}

// Count returns the number of stored entries (useful for testing).
func (m *MemoryVectorStore) Count() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.entries)
}

// cosineSimilarity computes the cosine similarity between two vectors.
func cosineSimilarity(a, b []float64) float64 {
	if len(a) != len(b) || len(a) == 0 {
		return 0
	}

	var dot, normA, normB float64
	for i := range a {
		dot += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}

	magA := math.Sqrt(normA)
	magB := math.Sqrt(normB)
	if magA == 0 || magB == 0 {
		return 0
	}

	return dot / (magA * magB)
}
```

- [ ] **Step 2: Create embedding.go**

Move `backend/internal/service/embedding_service.go` to `backend/internal/modules/qa/embedding.go`, changing package to `qa` and replacing `ErrAINotConfigured` reference:

```go
package qa

import (
	"context"
	"crypto/sha256"
	"fmt"
	"strings"
	"unicode/utf8"

	"blotting-consultancy/internal/provider"
	"blotting-consultancy/internal/service"
)

const (
	DefaultChunkSize    = 2000
	DefaultChunkOverlap = 200
)

// EmbeddingService handles text chunking and vector storage for RAG indexing.
type EmbeddingService struct {
	ai           provider.AIProvider
	vectorStore  provider.VectorStoreProvider
	chunkSize    int
	chunkOverlap int
}

// NewEmbeddingService creates a new EmbeddingService.
func NewEmbeddingService(ai provider.AIProvider, vectorStore provider.VectorStoreProvider) *EmbeddingService {
	return &EmbeddingService{
		ai:           ai,
		vectorStore:  vectorStore,
		chunkSize:    DefaultChunkSize,
		chunkOverlap: DefaultChunkOverlap,
	}
}

// IndexContent chunks the given text, generates embeddings, and stores them.
func (s *EmbeddingService) IndexContent(ctx context.Context, sourceID string, text string, metadata map[string]string) (int, error) {
	if s.ai == nil {
		return 0, service.ErrAINotConfigured
	}

	chunks := ChunkText(text, s.chunkSize, s.chunkOverlap)
	if len(chunks) == 0 {
		return 0, nil
	}

	indexed := 0
	for i, chunk := range chunks {
		if strings.TrimSpace(chunk) == "" {
			continue
		}

		embedding, err := s.ai.Embed(ctx, chunk)
		if err != nil {
			return indexed, fmt.Errorf("embedding chunk %d: %w", i, err)
		}

		chunkID := chunkID(sourceID, i)
		chunkMeta := make(map[string]string, len(metadata)+2)
		for k, v := range metadata {
			chunkMeta[k] = v
		}
		chunkMeta["source_id"] = sourceID
		chunkMeta["chunk_index"] = fmt.Sprintf("%d", i)
		chunkMeta["chunk_text"] = chunk

		if err := s.vectorStore.Store(ctx, chunkID, embedding, chunkMeta); err != nil {
			return indexed, fmt.Errorf("storing chunk %d: %w", i, err)
		}
		indexed++
	}

	return indexed, nil
}

// DeleteContent removes all indexed chunks for a given source ID.
func (s *EmbeddingService) DeleteContent(ctx context.Context, sourceID string) error {
	for i := 0; i < 1000; i++ {
		_ = s.vectorStore.Delete(ctx, chunkID(sourceID, i))
	}
	return nil
}

func chunkID(sourceID string, index int) string {
	h := sha256.Sum256([]byte(fmt.Sprintf("%s::%d", sourceID, index)))
	return fmt.Sprintf("%x", h[:8])
}

// ChunkText splits text into chunks of approximately chunkSize characters with overlap.
func ChunkText(text string, chunkSize, overlap int) []string {
	text = strings.TrimSpace(text)
	if text == "" {
		return nil
	}

	charCount := utf8.RuneCountInString(text)
	if charCount <= chunkSize {
		return []string{text}
	}

	runes := []rune(text)
	var chunks []string
	start := 0

	for start < len(runes) {
		end := start + chunkSize
		if end >= len(runes) {
			end = len(runes)
		}

		if end < len(runes) {
			breakAt := findBreakPoint(runes, start, end)
			if breakAt > start {
				end = breakAt
			}
		}

		chunk := strings.TrimSpace(string(runes[start:end]))
		if chunk != "" {
			chunks = append(chunks, chunk)
		}

		nextStart := end - overlap
		if nextStart <= start {
			nextStart = end
		}
		start = nextStart
	}

	return chunks
}

func findBreakPoint(runes []rune, start, end int) int {
	for i := end - 1; i > start+end/2; i-- {
		if i > 0 && runes[i] == '\n' && runes[i-1] == '\n' {
			return i + 1
		}
	}

	for i := end - 1; i > start+end/2; i-- {
		r := runes[i]
		if r == '.' || r == '!' || r == '?' || r == '\n' {
			return i + 1
		}
		if r == '\u3002' || r == '\uff01' || r == '\uff1f' {
			return i + 1
		}
	}

	return end
}
```

- [ ] **Step 3: Create service.go**

Move `backend/internal/service/qa_service.go` to `backend/internal/modules/qa/service.go`, changing package to `qa`:

```go
package qa

import (
	"context"
	"fmt"
	"strings"

	"blotting-consultancy/internal/provider"
	"blotting-consultancy/internal/service"
)

const (
	DefaultTopK     = 5
	DefaultMinScore = 0.3
)

// QASource represents a source reference in a Q&A answer.
type QASource struct {
	SourceID   string  `json:"sourceId"`
	ChunkIndex string  `json:"chunkIndex"`
	Score      float64 `json:"score"`
	Preview    string  `json:"preview"`
}

// QAResult represents the result of a Q&A query.
type QAResult struct {
	Answer  string     `json:"answer"`
	Sources []QASource `json:"sources"`
}

// QAService implements a RAG (Retrieval-Augmented Generation) pipeline.
type QAService struct {
	ai          provider.AIProvider
	vectorStore provider.VectorStoreProvider
	topK        int
	minScore    float64
}

// NewQAService creates a new QAService.
func NewQAService(ai provider.AIProvider, vectorStore provider.VectorStoreProvider) *QAService {
	return &QAService{
		ai:          ai,
		vectorStore: vectorStore,
		topK:        DefaultTopK,
		minScore:    DefaultMinScore,
	}
}

// Ask processes a user question through the RAG pipeline.
func (s *QAService) Ask(ctx context.Context, question string, locale string) (*QAResult, error) {
	if strings.TrimSpace(question) == "" {
		return nil, fmt.Errorf("question cannot be empty")
	}

	if s.ai == nil {
		return nil, service.ErrAINotConfigured
	}

	queryEmbedding, err := s.ai.Embed(ctx, question)
	if err != nil {
		return nil, fmt.Errorf("embedding question: %w", err)
	}

	results, err := s.vectorStore.Search(ctx, queryEmbedding, s.topK)
	if err != nil {
		return nil, fmt.Errorf("vector search: %w", err)
	}

	var relevantChunks []provider.VectorResult
	for _, r := range results {
		if r.Score >= s.minScore {
			relevantChunks = append(relevantChunks, r)
		}
	}

	sources := make([]QASource, 0, len(relevantChunks))
	var contextParts []string

	for _, chunk := range relevantChunks {
		chunkText := chunk.Metadata["chunk_text"]
		sourceID := chunk.Metadata["source_id"]
		chunkIndex := chunk.Metadata["chunk_index"]

		if chunkText != "" {
			contextParts = append(contextParts, chunkText)
		}

		preview := chunkText
		if len(preview) > 200 {
			preview = preview[:200] + "..."
		}

		sources = append(sources, QASource{
			SourceID:   sourceID,
			ChunkIndex: chunkIndex,
			Score:      chunk.Score,
			Preview:    preview,
		})
	}

	systemPrompt := buildSystemPrompt(contextParts, locale)

	answer, err := s.ai.ChatComplete(ctx, systemPrompt, question)
	if err != nil {
		return nil, fmt.Errorf("generating answer: %w", err)
	}

	return &QAResult{
		Answer:  answer,
		Sources: sources,
	}, nil
}

func buildSystemPrompt(contextParts []string, locale string) string {
	langInstruction := "Please respond in Chinese."
	if locale == "en" {
		langInstruction = "Please respond in English."
	}

	if len(contextParts) == 0 {
		return fmt.Sprintf(`You are a helpful assistant for Blotting Consultancy (印迹咨询).
%s
If you don't have enough information to answer the question, politely say so and suggest the user contact us directly.`, langInstruction)
	}

	contextText := strings.Join(contextParts, "\n\n---\n\n")

	return fmt.Sprintf(`You are a helpful assistant for Blotting Consultancy (印迹咨询).
%s

Use the following reference content to answer the user's question. If the answer is not in the provided content, say so honestly and suggest contacting us directly. Do not make up information.

Reference content:
---
%s
---`, langInstruction, contextText)
}
```

- [ ] **Step 4: Verify compilation**

Run: `cd /home/dev/impress/backend && go build ./internal/modules/qa/...`
Expected: Success.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/modules/qa/vectorstore.go backend/internal/modules/qa/embedding.go backend/internal/modules/qa/service.go
git commit -m "feat(qa-module): add vectorstore, embedding, and QA service"
```

---

### Task 5: Create QA Module — Handler and Module Entry Point

**Files:**
- Create: `backend/internal/modules/qa/handler.go`
- Create: `backend/internal/modules/qa/module.go`

- [ ] **Step 1: Create handler.go**

Move `backend/internal/handler/qa/handler.go` to `backend/internal/modules/qa/handler.go`. Key changes:
- Package is `qa` (same name, different path)
- Replace `model.QALog`, `model.QAFeedback`, `model.JSONArray` with local types
- Replace `repository.QALogRepository` with local `QALogRepository`
- Replace `service.QAService` / `service.EmbeddingService` with local types
- Replace `repository.ContentDocumentRepository` / `repository.ArticleRepository` with imports from `repository` package
- Add feature flag check to `PublicAsk`
- Add `SiteConfigRepository` dependency for feature flag

```go
package qa

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"blotting-consultancy/internal/model"
	"blotting-consultancy/internal/repository"
	"blotting-consultancy/internal/service"
)

// Handler handles Knowledge Base Q&A HTTP requests.
type Handler struct {
	qaService        *QAService
	embeddingService *EmbeddingService
	qaLogRepo        QALogRepository
	contentDocRepo   repository.ContentDocumentRepository
	articleRepo      repository.ArticleRepository
	siteCfgRepo      repository.SiteConfigRepository
}

type askInput struct {
	Question string `json:"question"`
	Locale   string `json:"locale"`
}

// featureEnabled checks if the QA feature is enabled in SiteConfig.
func (h *Handler) featureEnabled(c *gin.Context) bool {
	cfg, err := h.siteCfgRepo.FindByKey(c.Request.Context(), model.SiteConfigKeyFeatures)
	if err != nil {
		return false // missing config = disabled
	}
	published := cfg.PublishedConfig
	if published == nil {
		return false
	}
	qaMap, ok := published["qa"].(map[string]interface{})
	if !ok {
		return false
	}
	enabled, ok := qaMap["enabled"].(bool)
	return ok && enabled
}

// PublicAsk handles a public Q&A question.
func (h *Handler) PublicAsk(c *gin.Context) {
	if !h.featureEnabled(c) {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	var input askInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "invalid request data"}})
		return
	}

	if input.Question == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "question is required"}})
		return
	}

	if input.Locale == "" {
		input.Locale = "zh"
	}

	result, err := h.qaService.Ask(c.Request.Context(), input.Question, input.Locale)
	if err != nil {
		if errors.Is(err, service.ErrAINotConfigured) {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": gin.H{"code": "AI_NOT_CONFIGURED", "message": "AI provider is not configured."}})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "failed to process question"}})
		return
	}

	sourcesJSON, _ := json.Marshal(result.Sources)
	var sourcesArray JSONArray
	_ = json.Unmarshal(sourcesJSON, &sourcesArray)

	qaLog := &QALog{
		Question:  input.Question,
		Answer:    result.Answer,
		Sources:   sourcesArray,
		Locale:    input.Locale,
		IPAddress: c.ClientIP(),
	}
	_ = h.qaLogRepo.Create(c.Request.Context(), qaLog)

	c.JSON(http.StatusOK, gin.H{
		"answer":  result.Answer,
		"sources": result.Sources,
		"logId":   qaLog.ID,
	})
}

// AdminIndex triggers content indexing for the knowledge base.
func (h *Handler) AdminIndex(c *gin.Context) {
	ctx := c.Request.Context()
	totalIndexed := 0

	docs, err := h.contentDocRepo.List(ctx)
	if err == nil {
		for _, doc := range docs {
			if doc.PublishedConfig == nil {
				continue
			}
			text := extractTextFromConfig(doc.PublishedConfig)
			if text == "" {
				continue
			}
			sourceID := "content:" + string(doc.PageKey)
			metadata := map[string]string{
				"type":     "content",
				"page_key": string(doc.PageKey),
			}
			count, err := h.embeddingService.IndexContent(ctx, sourceID, text, metadata)
			if err != nil {
				if errors.Is(err, service.ErrAINotConfigured) {
					c.JSON(http.StatusServiceUnavailable, gin.H{"error": gin.H{"code": "AI_NOT_CONFIGURED", "message": "AI provider is not configured."}})
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "indexing failed: " + err.Error()}})
				return
			}
			totalIndexed += count
		}
	}

	articles, _, err := h.articleRepo.List(ctx, 0, 1000, "published", nil, nil)
	if err == nil {
		for _, article := range articles {
			text := article.ZhTitle + "\n" + article.ZhBody
			if article.EnTitle != "" {
				text += "\n" + article.EnTitle + "\n" + article.EnBody
			}
			sourceID := "article:" + strconv.FormatUint(uint64(article.ID), 10)
			metadata := map[string]string{
				"type":       "article",
				"article_id": strconv.FormatUint(uint64(article.ID), 10),
				"slug":       article.Slug,
			}
			count, err := h.embeddingService.IndexContent(ctx, sourceID, text, metadata)
			if err != nil {
				if errors.Is(err, service.ErrAINotConfigured) {
					c.JSON(http.StatusServiceUnavailable, gin.H{"error": gin.H{"code": "AI_NOT_CONFIGURED", "message": "AI provider is not configured."}})
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "indexing failed: " + err.Error()}})
				return
			}
			totalIndexed += count
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "indexing complete",
		"chunksStored": totalIndexed,
	})
}

// AdminListLogs returns paginated Q&A logs.
func (h *Handler) AdminListLogs(c *gin.Context) {
	page := 1
	pageSize := 20

	if p := c.Query("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil && v > 0 {
			page = v
		}
	}
	if ps := c.Query("pageSize"); ps != "" {
		if v, err := strconv.Atoi(ps); err == nil && v > 0 {
			pageSize = v
		}
	}
	if pageSize > 100 {
		pageSize = 100
	}

	offset := (page - 1) * pageSize

	items, total, err := h.qaLogRepo.List(c.Request.Context(), offset, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "query failed"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items":    items,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

type feedbackInput struct {
	Rating string `json:"rating"`
}

// AdminFeedback records feedback for a Q&A log entry.
func (h *Handler) AdminFeedback(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "invalid ID"}})
		return
	}

	var input feedbackInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "invalid request data"}})
		return
	}

	rating := QAFeedback(input.Rating)
	if rating != QAFeedbackPositive && rating != QAFeedbackNegative {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "rating must be 'positive' or 'negative'"}})
		return
	}

	if err := h.qaLogRepo.UpdateRating(c.Request.Context(), uint(id), rating); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "qa log not found"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "feedback recorded"})
}

func extractTextFromConfig(config model.JSONMap) string {
	var parts []string
	extractStrings(map[string]interface{}(config), &parts)
	return joinNonEmpty(parts, "\n")
}

func extractStrings(data interface{}, parts *[]string) {
	switch v := data.(type) {
	case map[string]interface{}:
		for _, val := range v {
			extractStrings(val, parts)
		}
	case []interface{}:
		for _, item := range v {
			extractStrings(item, parts)
		}
	case string:
		if v != "" {
			*parts = append(*parts, v)
		}
	}
}

func joinNonEmpty(parts []string, sep string) string {
	var nonEmpty []string
	for _, p := range parts {
		if p != "" {
			nonEmpty = append(nonEmpty, p)
		}
	}
	if len(nonEmpty) == 0 {
		return ""
	}
	result := nonEmpty[0]
	for i := 1; i < len(nonEmpty); i++ {
		result += sep + nonEmpty[i]
	}
	return result
}
```

- [ ] **Step 2: Create module.go (Module interface implementation)**

Create `backend/internal/modules/qa/module.go`:

```go
package qa

import (
	"github.com/gin-gonic/gin"

	"blotting-consultancy/internal/module"
)

// Module implements the module.Module interface for the QA feature.
type Module struct {
	handler *Handler
}

// New creates a new QA module instance.
func New() *Module {
	return &Module{}
}

// Name returns the module identifier.
func (m *Module) Name() string {
	return "qa"
}

// Init initializes the QA module: auto-migrate, create repo/services/handler.
func (m *Module) Init(deps module.Dependencies) error {
	// Auto-migrate the QALog model
	if err := deps.DB.AutoMigrate(&QALog{}); err != nil {
		return err
	}

	qaLogRepo := newGormQALogRepository(deps.DB)
	vectorStore := NewMemoryVectorStore()
	qaService := NewQAService(deps.Registry.AI(), vectorStore)
	embeddingService := NewEmbeddingService(deps.Registry.AI(), vectorStore)

	m.handler = &Handler{
		qaService:        qaService,
		embeddingService: embeddingService,
		qaLogRepo:        qaLogRepo,
		contentDocRepo:   deps.Repos.ContentDoc,
		articleRepo:      deps.Repos.Article,
		siteCfgRepo:      deps.SiteCfg,
	}

	return nil
}

// RegisterRoutes mounts QA routes onto the public and admin router groups.
func (m *Module) RegisterRoutes(public, admin *gin.RouterGroup) {
	public.POST("/qa/ask", m.handler.PublicAsk)

	admin.POST("/qa/index", m.handler.AdminIndex)
	admin.GET("/qa/logs", m.handler.AdminListLogs)
	admin.POST("/qa/logs/:id/feedback", m.handler.AdminFeedback)
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd /home/dev/impress/backend && go build ./internal/modules/qa/...`
Expected: Success.

- [ ] **Step 4: Commit**

```bash
git add backend/internal/modules/qa/handler.go backend/internal/modules/qa/module.go
git commit -m "feat(qa-module): add handler and module entry point with feature flag"
```

---

### Task 6: Move QA Test Files

**Files:**
- Create: `backend/internal/modules/qa/handler_test.go`
- Create: `backend/internal/modules/qa/service_test.go`
- Create: `backend/internal/modules/qa/embedding_test.go`
- Create: `backend/internal/modules/qa/vectorstore_test.go`

- [ ] **Step 1: Create handler_test.go**

Move `backend/internal/handler/qa/handler_test.go` to `backend/internal/modules/qa/handler_test.go`. Update the import from `blotting-consultancy/internal/model` — `model.JSONMap` is still in the `model` package:

```go
package qa

import (
	"testing"

	"blotting-consultancy/internal/model"

	"github.com/stretchr/testify/assert"
)

func TestExtractTextFromConfig(t *testing.T) {
	config := model.JSONMap{
		"title": "Welcome",
		"hero": map[string]interface{}{
			"heading":    "Our Company",
			"subheading": "Best consultancy",
		},
		"items": []interface{}{
			map[string]interface{}{"name": "Service A"},
			map[string]interface{}{"name": "Service B"},
		},
		"count": 42,
	}

	text := extractTextFromConfig(config)
	assert.Contains(t, text, "Welcome")
	assert.Contains(t, text, "Our Company")
	assert.Contains(t, text, "Best consultancy")
	assert.Contains(t, text, "Service A")
	assert.Contains(t, text, "Service B")
}

func TestExtractTextFromConfig_Nil(t *testing.T) {
	text := extractTextFromConfig(nil)
	assert.Equal(t, "", text)
}

func TestExtractTextFromConfig_Empty(t *testing.T) {
	text := extractTextFromConfig(model.JSONMap{})
	assert.Equal(t, "", text)
}

func TestJoinNonEmpty(t *testing.T) {
	assert.Equal(t, "", joinNonEmpty(nil, "\n"))
	assert.Equal(t, "", joinNonEmpty([]string{}, "\n"))
	assert.Equal(t, "a", joinNonEmpty([]string{"a"}, "\n"))
	assert.Equal(t, "a\nb", joinNonEmpty([]string{"a", "", "b"}, "\n"))
}
```

- [ ] **Step 2: Create service_test.go**

Move `backend/internal/service/qa_service_test.go` to `backend/internal/modules/qa/service_test.go`. Import `service.NewStubAIProvider` since the stub stays in the `service` package:

```go
package qa

import (
	"context"
	"testing"

	"blotting-consultancy/internal/service"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestQAService_AskEmpty(t *testing.T) {
	ai := service.NewStubAIProvider()
	vs := NewMemoryVectorStore()
	svc := NewQAService(ai, vs)

	_, err := svc.Ask(context.Background(), "", "zh")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "empty")
}

func TestQAService_AskWithNoContent(t *testing.T) {
	ai := service.NewStubAIProvider()
	vs := NewMemoryVectorStore()
	svc := NewQAService(ai, vs)

	result, err := svc.Ask(context.Background(), "What is this company?", "zh")
	require.NoError(t, err)
	assert.NotEmpty(t, result.Answer)
	assert.Empty(t, result.Sources)
}

func TestQAService_AskWithIndexedContent(t *testing.T) {
	ctx := context.Background()
	ai := service.NewStubAIProvider()
	vs := NewMemoryVectorStore()

	embSvc := NewEmbeddingService(ai, vs)
	count, err := embSvc.IndexContent(ctx, "test:1", "We provide consulting services for businesses.", map[string]string{
		"type": "content",
	})
	require.NoError(t, err)
	assert.Equal(t, 1, count)

	svc := NewQAService(ai, vs)
	result, err := svc.Ask(ctx, "What services do you provide?", "en")
	require.NoError(t, err)
	assert.NotEmpty(t, result.Answer)
}

func TestQAService_EndToEnd(t *testing.T) {
	ctx := context.Background()
	ai := service.NewStubAIProvider()
	vs := NewMemoryVectorStore()

	embSvc := NewEmbeddingService(ai, vs)
	embSvc.IndexContent(ctx, "about:1", "Our company was founded in 2020. We are experts in digital transformation.", map[string]string{"type": "page"})
	embSvc.IndexContent(ctx, "services:1", "We offer cloud migration, AI consulting, and data analytics.", map[string]string{"type": "page"})

	assert.True(t, vs.Count() >= 2, "expected at least 2 vectors stored")

	svc := NewQAService(ai, vs)
	result, err := svc.Ask(ctx, "When was the company founded?", "en")
	require.NoError(t, err)
	assert.NotEmpty(t, result.Answer)
}

func TestBuildSystemPrompt(t *testing.T) {
	prompt := buildSystemPrompt(nil, "zh")
	assert.Contains(t, prompt, "Chinese")
	assert.Contains(t, prompt, "Blotting Consultancy")

	prompt = buildSystemPrompt([]string{"chunk1", "chunk2"}, "en")
	assert.Contains(t, prompt, "English")
	assert.Contains(t, prompt, "chunk1")
	assert.Contains(t, prompt, "chunk2")
}
```

- [ ] **Step 3: Create embedding_test.go**

Move `backend/internal/service/embedding_service_test.go` to `backend/internal/modules/qa/embedding_test.go`:

```go
package qa

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestChunkText_Short(t *testing.T) {
	chunks := ChunkText("Hello world", 2000, 200)
	assert.Len(t, chunks, 1)
	assert.Equal(t, "Hello world", chunks[0])
}

func TestChunkText_Empty(t *testing.T) {
	chunks := ChunkText("", 2000, 200)
	assert.Nil(t, chunks)

	chunks = ChunkText("   ", 2000, 200)
	assert.Nil(t, chunks)
}

func TestChunkText_LongText(t *testing.T) {
	text := ""
	for i := 0; i < 100; i++ {
		text += "This is sentence number. "
	}

	chunks := ChunkText(text, 100, 20)
	assert.True(t, len(chunks) > 1, "expected multiple chunks, got %d", len(chunks))

	for i, c := range chunks {
		assert.NotEmpty(t, c, "chunk %d is empty", i)
	}
}

func TestChunkText_ChineseText(t *testing.T) {
	text := ""
	for i := 0; i < 50; i++ {
		text += "这是一个测试句子。"
	}

	chunks := ChunkText(text, 100, 20)
	assert.True(t, len(chunks) > 1)

	for _, c := range chunks {
		assert.NotEmpty(t, c)
	}
}

func TestChunkText_ParagraphBreaks(t *testing.T) {
	text := "First paragraph with enough content to fill the space.\n\n" +
		"Second paragraph with more content to test paragraph breaking.\n\n" +
		"Third paragraph that adds even more text to ensure chunking happens."

	chunks := ChunkText(text, 60, 10)
	assert.True(t, len(chunks) >= 2)
}
```

- [ ] **Step 4: Create vectorstore_test.go**

Move `backend/internal/service/vectorstore_memory_test.go` to `backend/internal/modules/qa/vectorstore_test.go`. Import `service.NewStubAIProvider` for the stub tests:

```go
package qa

import (
	"context"
	"math"
	"testing"

	"blotting-consultancy/internal/service"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMemoryVectorStore_StoreAndSearch(t *testing.T) {
	ctx := context.Background()
	store := NewMemoryVectorStore()

	err := store.Store(ctx, "v1", []float64{1, 0, 0}, map[string]string{"label": "x-axis"})
	require.NoError(t, err)

	err = store.Store(ctx, "v2", []float64{0, 1, 0}, map[string]string{"label": "y-axis"})
	require.NoError(t, err)

	err = store.Store(ctx, "v3", []float64{0.9, 0.1, 0}, map[string]string{"label": "near-x"})
	require.NoError(t, err)

	assert.Equal(t, 3, store.Count())

	results, err := store.Search(ctx, []float64{1, 0, 0}, 2)
	require.NoError(t, err)
	require.Len(t, results, 2)

	assert.Equal(t, "v1", results[0].ID)
	assert.InDelta(t, 1.0, results[0].Score, 0.001)
	assert.Equal(t, "x-axis", results[0].Metadata["label"])

	assert.Equal(t, "v3", results[1].ID)
	assert.True(t, results[1].Score > 0.9)
}

func TestMemoryVectorStore_Delete(t *testing.T) {
	ctx := context.Background()
	store := NewMemoryVectorStore()

	store.Store(ctx, "v1", []float64{1, 0}, map[string]string{})
	store.Store(ctx, "v2", []float64{0, 1}, map[string]string{})
	assert.Equal(t, 2, store.Count())

	err := store.Delete(ctx, "v1")
	require.NoError(t, err)
	assert.Equal(t, 1, store.Count())

	err = store.Delete(ctx, "v999")
	require.NoError(t, err)
}

func TestMemoryVectorStore_SearchEmpty(t *testing.T) {
	ctx := context.Background()
	store := NewMemoryVectorStore()

	results, err := store.Search(ctx, []float64{1, 0}, 5)
	require.NoError(t, err)
	assert.Empty(t, results)
}

func TestMemoryVectorStore_SearchTopKLargerThanStore(t *testing.T) {
	ctx := context.Background()
	store := NewMemoryVectorStore()

	store.Store(ctx, "v1", []float64{1, 0}, map[string]string{})

	results, err := store.Search(ctx, []float64{1, 0}, 10)
	require.NoError(t, err)
	assert.Len(t, results, 1)
}

func TestCosineSimilarity(t *testing.T) {
	tests := []struct {
		name     string
		a, b     []float64
		expected float64
	}{
		{"identical", []float64{1, 0}, []float64{1, 0}, 1.0},
		{"orthogonal", []float64{1, 0}, []float64{0, 1}, 0.0},
		{"opposite", []float64{1, 0}, []float64{-1, 0}, -1.0},
		{"empty", []float64{}, []float64{}, 0.0},
		{"different_lengths", []float64{1, 0}, []float64{1}, 0.0},
		{"zero_vector", []float64{0, 0}, []float64{1, 0}, 0.0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := cosineSimilarity(tt.a, tt.b)
			assert.InDelta(t, tt.expected, result, 0.001)
		})
	}
}

func TestMemoryVectorStore_Overwrite(t *testing.T) {
	ctx := context.Background()
	store := NewMemoryVectorStore()

	store.Store(ctx, "v1", []float64{1, 0}, map[string]string{"version": "1"})
	store.Store(ctx, "v1", []float64{0, 1}, map[string]string{"version": "2"})

	assert.Equal(t, 1, store.Count())

	results, err := store.Search(ctx, []float64{0, 1}, 1)
	require.NoError(t, err)
	require.Len(t, results, 1)
	assert.Equal(t, "v1", results[0].ID)
	assert.InDelta(t, 1.0, results[0].Score, 0.001)
	assert.Equal(t, "2", results[0].Metadata["version"])
}

func TestStubAIProvider_Embed(t *testing.T) {
	ctx := context.Background()
	ai := service.NewStubAIProvider()

	emb1, err := ai.Embed(ctx, "hello world")
	require.NoError(t, err)
	assert.Len(t, emb1, 128)

	emb2, err := ai.Embed(ctx, "hello world")
	require.NoError(t, err)
	assert.Equal(t, emb1, emb2)

	emb3, err := ai.Embed(ctx, "goodbye world")
	require.NoError(t, err)
	assert.NotEqual(t, emb1, emb3)

	var norm float64
	for _, v := range emb1 {
		norm += v * v
	}
	assert.InDelta(t, 1.0, math.Sqrt(norm), 0.001)
}

func TestStubAIProvider_ChatComplete(t *testing.T) {
	ctx := context.Background()
	ai := service.NewStubAIProvider()

	answer, err := ai.ChatComplete(ctx, "system", "What is this?")
	require.NoError(t, err)
	assert.Contains(t, answer, "What is this?")
	assert.Contains(t, answer, "stub")
}
```

- [ ] **Step 5: Run all QA module tests**

Run: `cd /home/dev/impress/backend && go test -v -race ./internal/modules/qa/...`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/modules/qa/*_test.go
git commit -m "feat(qa-module): move QA test files to modules/qa"
```

---

### Task 7: Update Bootstrap Handler for Features

**Files:**
- Modify: `backend/internal/handler/bootstrap/handler.go`

- [ ] **Step 1: Add SiteConfigRepository to bootstrap Handler**

In `backend/internal/handler/bootstrap/handler.go`, add `siteCfgRepo` to the Handler struct and NewHandler:

```go
type Handler struct {
	contentDocRepo repository.ContentDocumentRepository
	themeRepo      repository.InstalledThemeRepository
	pageRepo       repository.PageRepository
	siteCfgRepo    repository.SiteConfigRepository
}

func NewHandler(
	contentDocRepo repository.ContentDocumentRepository,
	themeRepo repository.InstalledThemeRepository,
	pageRepo repository.PageRepository,
	siteCfgRepo repository.SiteConfigRepository,
) *Handler {
	return &Handler{
		contentDocRepo: contentDocRepo,
		themeRepo:      themeRepo,
		pageRepo:       pageRepo,
		siteCfgRepo:    siteCfgRepo,
	}
}
```

- [ ] **Step 2: Add features to bootstrap response**

In the `PublicBootstrap` method, after the global config section (after line 134) and before building the result, add:

```go
	// 5. Features config
	var features interface{}
	featuresCfg, err := h.siteCfgRepo.FindByKey(ctx, model.SiteConfigKeyFeatures)
	if err != nil || featuresCfg.PublishedConfig == nil {
		features = gin.H{}
	} else {
		features = featuresCfg.PublishedConfig
	}
```

Then add `"features": features` to the result:

```go
	result := gin.H{
		"activeTheme":  activeThemeData,
		"themeTokens":  themeTokens,
		"themePages":   themePages,
		"globalConfig": globalConfig,
		"features":     features,
	}
```

Update the numbering: "5. Page content" becomes "6. Page content".

- [ ] **Step 3: Update main.go bootstrap handler instantiation**

In `backend/cmd/server/main.go`, find the bootstrap handler initialization (line ~359):

Change from:
```go
bootstrapHandlerInst := bootstrapHandler.NewHandler(contentDocRepo, installedThemeRepo, pageRepo)
```

To:
```go
bootstrapHandlerInst := bootstrapHandler.NewHandler(contentDocRepo, installedThemeRepo, pageRepo, siteConfigRepo)
```

(Note: `siteConfigRepo` is already initialized in main.go at line ~261.)

- [ ] **Step 4: Verify compilation**

Run: `cd /home/dev/impress/backend && go build ./cmd/server/...`
Expected: Success.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/handler/bootstrap/handler.go backend/cmd/server/main.go
git commit -m "feat(bootstrap): include features config in bootstrap response"
```

---

### Task 8: Wire QA Module into main.go and Remove Old QA Code

**Files:**
- Modify: `backend/cmd/server/main.go`
- Delete: `backend/internal/handler/qa/handler.go`
- Delete: `backend/internal/handler/qa/handler_test.go`
- Delete: `backend/internal/service/qa_service.go`
- Delete: `backend/internal/service/qa_service_test.go`
- Delete: `backend/internal/service/embedding_service.go`
- Delete: `backend/internal/service/embedding_service_test.go`
- Delete: `backend/internal/service/vectorstore_memory.go`
- Delete: `backend/internal/service/vectorstore_memory_test.go`
- Delete: `backend/internal/repository/qa_log_repository.go`
- Delete: `backend/internal/repository/qa_log_repository_impl.go`
- Delete: `backend/internal/model/qa_log.go`

- [ ] **Step 1: Update main.go imports**

Remove the QA handler import:
```go
// REMOVE this line:
qaHandler "blotting-consultancy/internal/handler/qa"
```

Add the module imports:
```go
"blotting-consultancy/internal/module"
qa "blotting-consultancy/internal/modules/qa"
```

- [ ] **Step 2: Remove QALog from auto-migrate list**

In the `AutoMigrate` call (around line 182), remove `&model.QALog{}` from the list. The QA module's `Init` handles its own migration now.

- [ ] **Step 3: Remove QA-specific initialization**

Remove these lines (around lines 254, 339-341, 378):

```go
// REMOVE: qaLogRepo := repository.NewGormQALogRepository(database.DB)

// REMOVE: vectorStore := service.NewMemoryVectorStore()
// REMOVE: qaService := service.NewQAService(registry.AI(), vectorStore)
// REMOVE: embeddingService := service.NewEmbeddingService(registry.AI(), vectorStore)

// REMOVE: qaHandlerInst := qaHandler.NewHandler(qaService, embeddingService, qaLogRepo, contentDocRepo, articleRepo)
```

- [ ] **Step 4: Remove QA route registrations**

Remove these lines:

```go
// REMOVE (around line 527):
// Public Q&A (knowledge base ask)
publicGroup.POST("/qa/ask", qaHandlerInst.PublicAsk)

// REMOVE (around lines 754-757):
// Knowledge base Q&A (admin)
adminGroup.POST("/qa/index", qaHandlerInst.AdminIndex)
adminGroup.GET("/qa/logs", qaHandlerInst.AdminListLogs)
adminGroup.POST("/qa/logs/:id/feedback", qaHandlerInst.AdminFeedback)
```

- [ ] **Step 5: Add module manager initialization**

After the provider registry setup and before handler initialization, add:

```go
	// Initialize feature modules
	mgr := module.NewManager()
	mgr.Register(qa.New())
	if err := mgr.InitAll(module.Dependencies{
		DB:       database.DB,
		Registry: registry,
		Repos: &module.SharedRepos{
			ContentDoc: contentDocRepo,
			Article:    articleRepo,
		},
		SiteCfg: siteConfigRepo,
	}); err != nil {
		log.Error("Failed to initialize modules", "error", err)
		os.Exit(1)
	}
```

After the admin group is set up (after adminGroup middleware), add:

```go
	// Register module routes
	mgr.RegisterAllRoutes(publicGroup, adminGroup)
```

- [ ] **Step 6: Delete old backend QA files**

```bash
rm backend/internal/handler/qa/handler.go
rm backend/internal/handler/qa/handler_test.go
rmdir backend/internal/handler/qa
rm backend/internal/service/qa_service.go
rm backend/internal/service/qa_service_test.go
rm backend/internal/service/embedding_service.go
rm backend/internal/service/embedding_service_test.go
rm backend/internal/service/vectorstore_memory.go
rm backend/internal/service/vectorstore_memory_test.go
rm backend/internal/repository/qa_log_repository.go
rm backend/internal/repository/qa_log_repository_impl.go
rm backend/internal/model/qa_log.go
```

- [ ] **Step 7: Verify compilation and tests**

Run: `cd /home/dev/impress/backend && go build ./cmd/server/... && go test -v -race ./internal/modules/qa/... && go vet ./...`
Expected: Build succeeds, all QA tests pass, vet clean.

- [ ] **Step 8: Commit**

```bash
git add -A backend/
git commit -m "refactor(qa): wire QA module via Manager, remove old scattered files"
```

---

### Task 9: Create Frontend QA Module Directory

**Files:**
- Create: `frontend/src/modules/qa/api.ts`
- Create: `frontend/src/modules/qa/widget/QAWidget.tsx`
- Create: `frontend/src/modules/qa/admin/page.tsx`
- Create: `frontend/src/modules/qa/index.ts`

- [ ] **Step 1: Move api.ts**

Create `frontend/src/modules/qa/api.ts` with identical content from `frontend/src/api/qa.ts` (no changes needed — imports use `@/api/http` which still works):

```ts
import { http } from "@/api/http";

export interface QALog {
  id: number;
  question: string;
  answer: string;
  sources: unknown[];
  locale: string;
  ip_address: string;
  rating: string;
  created_at: string;
}

export interface QALogsResponse {
  items: QALog[];
  page: number;
  pageSize: number;
  total: number;
}

export interface IndexResponse {
  chunksStored: number;
  message: string;
}

function getAuthHeaders() {
  const accessToken = localStorage.getItem("accessToken");
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function triggerQAIndex(): Promise<IndexResponse> {
  const response = await http.post<IndexResponse>("/admin/qa/index", {}, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function getQALogs(page = 1, pageSize = 20): Promise<QALogsResponse> {
  const response = await http.get<QALogsResponse>("/admin/qa/logs", {
    params: { page, pageSize },
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function submitQAFeedback(id: number, rating: "positive" | "negative"): Promise<void> {
  await http.post(`/admin/qa/logs/${id}/feedback`, { rating }, {
    headers: getAuthHeaders(),
  });
}
```

- [ ] **Step 2: Move QAWidget.tsx**

Create `frontend/src/modules/qa/widget/QAWidget.tsx` with identical content from `frontend/src/components/feature/QAWidget.tsx`. The only change: update the import path for `http`:

The existing file imports `{ http } from "@/api/http"` — this path still works, so no change needed. Copy the file as-is.

- [ ] **Step 3: Move admin page**

Create `frontend/src/modules/qa/admin/page.tsx` with content from `frontend/src/pages/admin/qa/page.tsx`. Update the import path from `@/api/qa` to the module-local path:

Change:
```ts
import { triggerQAIndex, getQALogs, submitQAFeedback, type QALog, type QALogsResponse } from "@/api/qa";
```
To:
```ts
import { triggerQAIndex, getQALogs, submitQAFeedback, type QALog, type QALogsResponse } from "../api";
```

- [ ] **Step 4: Create index.ts**

Create `frontend/src/modules/qa/index.ts`:

```ts
export { default as QAWidget } from "./widget/QAWidget";

export const qaModuleConfig = {
  name: "qa",
  adminRoute: {
    path: "qa",
    lazy: () => import("./admin/page").then((m) => ({ Component: m.default })),
  },
  sidebar: {
    label: "知识问答",
    path: "/admin/qa",
    permissionKey: "qa",
  },
};
```

- [ ] **Step 5: Verify with type-check**

Run: `cd /home/dev/impress && pnpm type-check`
Expected: Success (old files still exist, no conflicts yet).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/modules/
git commit -m "feat(qa-module): create frontend QA module directory"
```

---

### Task 10: Add Features to Bootstrap API and GlobalConfigContext

**Files:**
- Modify: `frontend/src/api/bootstrap.ts`
- Modify: `frontend/src/contexts/GlobalConfigContext.tsx`

- [ ] **Step 1: Add features to BootstrapData**

In `frontend/src/api/bootstrap.ts`, add `features` to the `BootstrapData` interface:

```ts
export interface BootstrapData {
  activeTheme: ActiveThemeData;
  themeTokens: Record<string, unknown>;
  themePages: ThemePageItem[];
  globalConfig: GlobalConfigData;
  pageContent?: PageContentData;
  features?: Record<string, { enabled?: boolean }>;
}
```

- [ ] **Step 2: Extend GlobalConfigContext to expose features**

In `frontend/src/contexts/GlobalConfigContext.tsx`:

Add `features` to the context value interface:

```ts
interface GlobalConfigContextValue {
  config: GlobalConfig;
  loading: boolean;
  locale: Locale;
  features: Record<string, { enabled?: boolean }>;
  refetch: () => Promise<void>;
}
```

Update the default context value:

```ts
const GlobalConfigContext = createContext<GlobalConfigContextValue>({
  config: {},
  loading: true,
  locale: "zh",
  features: {},
  refetch: async () => {},
});
```

In `GlobalConfigProvider`, extract features from bootstrap data:

```ts
const features = bootstrapData?.features ?? {};
```

Add this line inside the component, after the `useBootstrap()` call. Then include it in the provider value:

```ts
<GlobalConfigContext.Provider value={{ config, loading, locale, features, refetch: doFetch }}>
```

- [ ] **Step 3: Verify with type-check**

Run: `cd /home/dev/impress && pnpm type-check`
Expected: Success.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/bootstrap.ts frontend/src/contexts/GlobalConfigContext.tsx
git commit -m "feat(bootstrap): expose features config to frontend via GlobalConfigContext"
```

---

### Task 11: Wire Frontend QA Module and Remove Old Files

**Files:**
- Modify: `frontend/src/theme/layouts/PublicLayout.tsx`
- Modify: `frontend/src/router/config.tsx`
- Modify: `frontend/src/pages/admin/components/AdminSidebar.tsx`
- Delete: `frontend/src/api/qa.ts`
- Delete: `frontend/src/components/feature/QAWidget.tsx`
- Delete: `frontend/src/pages/admin/qa/page.tsx`

- [ ] **Step 1: Update PublicLayout.tsx**

In `frontend/src/theme/layouts/PublicLayout.tsx`:

Change the import:
```tsx
// REMOVE:
import QAWidget from "@/components/feature/QAWidget";
// ADD:
import { QAWidget } from "@/modules/qa";
import { useGlobalConfig } from "@/contexts/GlobalConfigContext";
```

Change the QAWidget rendering (replace `<QAWidget />` with conditional):
```tsx
const { features } = useGlobalConfig();

// In the JSX, replace:
//   <QAWidget />
// With:
{features?.qa?.enabled && <QAWidget />}
```

The full component becomes:

```tsx
export default function PublicLayout({ layout, children }: PublicLayoutProps) {
  const layoutType = layout?.type ?? "default";
  const { features } = useGlobalConfig();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {layoutType !== "blank" && <ThemedHeader config={layout?.header} />}

      {layoutType === "sidebar" ? (
        <div className="flex flex-1">
          <Sidebar config={layout?.sidebar} />
          <main className="flex-1">{children}</main>
        </div>
      ) : (
        <main className="flex-1">{children}</main>
      )}

      {layoutType !== "blank" && <ThemedFooter config={layout?.footer} />}

      {features?.qa?.enabled && <QAWidget />}
    </div>
  );
}
```

- [ ] **Step 2: Update router/config.tsx**

Change the QA lazy import:

```tsx
// REMOVE:
const AdminQAPage = lazy(() => import('../pages/admin/qa/page'));
// ADD:
const AdminQAPage = lazy(() => import('../modules/qa/admin/page'));
```

The route entry stays the same: `{ path: 'qa', element: <AdminQAPage /> }`.

- [ ] **Step 3: Update AdminSidebar.tsx (optional — keep hardcoded for now)**

The sidebar QA menu item at lines 209-218 can stay hardcoded for now since the sidebar doesn't yet have a module-driven architecture. The `permissionKey: "qa"` filtering already works. This can be refactored when more modules are extracted.

Alternatively, if you want the sidebar to import from the module:

```tsx
import { qaModuleConfig } from "@/modules/qa";
```

Then in the nav items, replace the hardcoded QA entry with:
```tsx
{
  label: qaModuleConfig.sidebar.label,
  path: qaModuleConfig.sidebar.path,
  permissionKey: qaModuleConfig.sidebar.permissionKey,
  icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  ),
},
```

Either approach is fine. The simpler approach is to keep the hardcoded icon but update the label/path/permissionKey to use `qaModuleConfig`. Choose whichever feels cleaner.

- [ ] **Step 4: Delete old frontend QA files**

```bash
rm frontend/src/api/qa.ts
rm frontend/src/components/feature/QAWidget.tsx
rm frontend/src/pages/admin/qa/page.tsx
rmdir frontend/src/pages/admin/qa
```

- [ ] **Step 5: Verify lint and type-check**

Run: `cd /home/dev/impress && pnpm lint && pnpm type-check`
Expected: Success.

- [ ] **Step 6: Commit**

```bash
git add -A frontend/
git commit -m "refactor(qa): wire frontend QA module, remove old scattered files"
```

---

### Task 12: Full Verification

- [ ] **Step 1: Run backend build and tests**

Run: `cd /home/dev/impress/backend && go build ./cmd/server/... && go test -v -race ./... && go vet ./...`
Expected: All pass. No references to old QA paths.

- [ ] **Step 2: Run frontend lint and type-check**

Run: `cd /home/dev/impress && pnpm lint && pnpm type-check`
Expected: Clean.

- [ ] **Step 3: Run frontend tests**

Run: `cd /home/dev/impress && pnpm test`
Expected: All pass.

- [ ] **Step 4: Verify no dangling imports**

Run: `grep -r "internal/handler/qa" backend/ --include="*.go"` — should return nothing.
Run: `grep -r "internal/service/qa_service\|internal/service/embedding_service\|internal/service/vectorstore_memory" backend/ --include="*.go"` — should return nothing.
Run: `grep -r "internal/repository/qa_log" backend/ --include="*.go"` — should return nothing.
Run: `grep -r "internal/model/qa_log\|model\.QALog\|model\.QAFeedback\|model\.JSONArray" backend/ --include="*.go"` — should return nothing (except `model.JSONMap` which is in a different file).
Run: `grep -r "@/api/qa\|components/feature/QAWidget\|pages/admin/qa" frontend/src/ --include="*.ts" --include="*.tsx"` — should return nothing.

- [ ] **Step 5: Smoke test the running server**

Start the backend and verify:
```bash
# QA public endpoint (should return 404 when feature is disabled)
curl --noproxy '*' -s -X POST http://127.0.0.1:8088/public/qa/ask -H 'Content-Type: application/json' -d '{"question":"test"}'
# Expected: {"error":"not found"} (feature disabled by default)

# Bootstrap endpoint should include features field
curl --noproxy '*' -s http://127.0.0.1:8088/public/bootstrap | python3 -c "import sys,json; d=json.load(sys.stdin); print('features' in d)"
# Expected: True
```

- [ ] **Step 6: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "fix: address verification findings from QA module extraction"
```
