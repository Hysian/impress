# Unified Visual Template Pages Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the two existing page systems (block/section `pages` table + content document `content_documents` table) into a single unified visual template page system with draft/publish workflow, version history, translation tracking, and theme export/import.

**Architecture:** Replace both existing models with four new GORM models (UnifiedPage, PageVersion, PageTemplate, SiteConfig). Write a Go migration function to transform existing data. Update the frontend types, SectionRenderer, and build a unified editor. All section components gain an optional `variant` prop defaulting to `"default"`.

**Tech Stack:** Go/Gin/GORM (backend), React/TypeScript/Tailwind (frontend), goose (migration), Vitest (frontend tests), go test (backend tests)

**Spec:** `docs/superpowers/specs/2026-03-12-unified-visual-template-pages-design.md`

---

## File Structure

```
backend/
├── internal/model/
│   ├── unified_page.go              (create - UnifiedPage model)
│   ├── unified_page_test.go         (create - model validation tests)
│   ├── page_version.go              (create - PageVersion model)
│   ├── page_template.go             (create - PageTemplate model)
│   ├── page_template_test.go        (create - template validation tests)
│   ├── site_config.go               (create - SiteConfig model)
│   ├── page.go                      (delete in cleanup phase)
│   ├── content_document.go          (delete in cleanup phase)
│   ├── content_version.go           (delete in cleanup phase)
│   └── json_map.go                  (keep - shared JSONMap type, already exists)
├── internal/repository/
│   ├── unified_page_repository.go         (create - interface)
│   ├── unified_page_repository_impl.go    (create - GORM implementation)
│   ├── unified_page_repository_test.go    (create - integration tests)
│   ├── page_version_repository.go         (create - interface)
│   ├── page_version_repository_impl.go    (create - GORM implementation)
│   ├── page_template_repository.go        (create - interface)
│   ├── page_template_repository_impl.go   (create - GORM implementation)
│   ├── site_config_repository.go          (create - interface)
│   ├── site_config_repository_impl.go     (create - GORM implementation)
│   ├── page_repository.go                 (delete in cleanup phase)
│   ├── page_repository_impl.go            (delete in cleanup phase)
│   ├── content_document_repository.go     (delete in cleanup phase)
│   └── content_document_repository_impl.go (delete in cleanup phase)
├── internal/service/
│   ├── unified_page_service.go            (create - draft/publish/rollback logic)
│   ├── unified_page_service_test.go       (create)
│   ├── page_migration_service.go          (create - data migration logic)
│   ├── page_migration_service_test.go     (create)
│   ├── theme_export_service.go            (create - theme export/import)
│   ├── theme_export_service_test.go       (create)
│   └── content_service.go                 (delete in cleanup phase)
├── internal/handler/
│   ├── unified_page/
│   │   └── handler.go                     (create - unified page CRUD + draft/publish)
│   ├── page_template/
│   │   └── handler.go                     (create - template CRUD)
│   ├── theme_export/
│   │   └── handler.go                     (create - theme export/import endpoints)
│   ├── page/handler.go                    (delete in cleanup phase)
│   ├── content/                           (delete in cleanup phase)
│   └── theme/handler.go                   (modify - switch to SiteConfig)
├── internal/db/migrations/
│   └── 00008_unified_pages.go             (create - Go migration function)
├── cmd/server/main.go                     (modify - wire new handlers)
frontend/src/
├── theme/
│   ├── types.ts                           (modify - add variant/locked to SectionData)
│   ├── sections/
│   │   ├── SectionRenderer.tsx            (modify - variant dispatch)
│   │   └── index.ts                       (modify - export variant registry)
│   └── hooks/
│       └── useLocalizedData.ts            (create - locale extraction hook)
├── api/
│   ├── unifiedPages.ts                    (create - unified page API client)
│   ├── templates.ts                       (create - template API client)
│   ├── themeExport.ts                     (create - theme export/import API)
│   ├── pages.ts                           (delete in cleanup phase)
│   └── publicContent.ts                   (delete in cleanup phase)
├── pages/admin/pages/
│   └── editor/page.tsx                    (rewrite - unified editor)
├── pages/admin/content/                   (delete in cleanup phase)
├── schemas/                               (delete in cleanup phase)
└── types/schema.ts                        (delete in cleanup phase)
```

---

## Chunk 1: Backend Models

### Task 0: Extract JSONMap to shared file

**Files:**
- Create: `backend/internal/model/json_map.go`
- Modify: `backend/internal/model/content_document.go` (remove JSONMap definition)

> **Why:** `JSONMap` is currently defined in `content_document.go`. All new models depend on it, and `content_document.go` will be deleted in cleanup. Extract it first to prevent a compilation break.

- [ ] **Step 1: Create `json_map.go` with the JSONMap type and its Scanner/Valuer**

```go
// backend/internal/model/json_map.go
package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
)

// JSONMap is a map[string]interface{} that implements sql.Scanner and driver.Valuer for JSON columns.
type JSONMap map[string]interface{}

func (j *JSONMap) Scan(value interface{}) error {
	if value == nil {
		*j = make(JSONMap)
		return nil
	}
	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return fmt.Errorf("JSONMap.Scan: unsupported type %T", value)
	}
	result := make(JSONMap)
	if err := json.Unmarshal(bytes, &result); err != nil {
		return err
	}
	*j = result
	return nil
}

func (j JSONMap) Value() (driver.Value, error) {
	if j == nil {
		return "{}", nil
	}
	return json.Marshal(j)
}
```

> **Note on nil behavior:** `Value()` returns `"{}"` for nil, not SQL NULL. This matches the existing behavior. For the `Unpublish` use case where we need SQL NULL, see the `NullableJSONMap` type added below.

- [ ] **Step 2: Add NullableJSONMap for columns that need SQL NULL**

Append to `json_map.go`:

```go
// NullableJSONMap is like JSONMap but serializes Go nil as SQL NULL (not "{}").
// Use this for columns where NULL has semantic meaning (e.g., published_config).
type NullableJSONMap map[string]interface{}

func (j *NullableJSONMap) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return fmt.Errorf("NullableJSONMap.Scan: unsupported type %T", value)
	}
	result := make(NullableJSONMap)
	if err := json.Unmarshal(bytes, &result); err != nil {
		return err
	}
	*j = result
	return nil
}

func (j NullableJSONMap) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil // SQL NULL
	}
	return json.Marshal(j)
}
```

- [ ] **Step 3: Remove JSONMap from content_document.go**

In `backend/internal/model/content_document.go`, delete the `JSONMap` type definition and its `Scan`/`Value` methods (they now live in `json_map.go`).

- [ ] **Step 4: Verify it compiles**

```bash
cd /home/dev/impress/backend && go build ./internal/model/
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
cd /home/dev/impress/backend
git add internal/model/json_map.go internal/model/content_document.go
git commit -m "refactor: extract JSONMap to shared json_map.go, add NullableJSONMap"
```

### Task 1: Create UnifiedPage model

**Files:**
- Create: `backend/internal/model/unified_page.go`
- Create: `backend/internal/model/unified_page_test.go`

- [ ] **Step 1: Write test for UnifiedPage validation**

```go
// backend/internal/model/unified_page_test.go
package model_test

import (
	"testing"

	"blotting-consultancy/internal/model"
)

func TestUnifiedPage_Validate_RequiresSlug(t *testing.T) {
	p := &model.UnifiedPage{Slug: ""}
	if err := p.Validate(); err == nil {
		t.Error("expected error for empty slug")
	}
}

func TestUnifiedPage_Validate_RequiresMode(t *testing.T) {
	p := &model.UnifiedPage{Slug: "test", Mode: "invalid"}
	if err := p.Validate(); err == nil {
		t.Error("expected error for invalid mode")
	}
}

func TestUnifiedPage_Validate_ValidComposable(t *testing.T) {
	p := &model.UnifiedPage{Slug: "test", Mode: "composable"}
	if err := p.Validate(); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestUnifiedPage_Validate_TemplateRequiresTemplateID(t *testing.T) {
	p := &model.UnifiedPage{Slug: "test", Mode: "template", TemplateID: nil}
	if err := p.Validate(); err == nil {
		t.Error("expected error for template mode without templateId")
	}
}

func TestUnifiedPage_Validate_ValidTemplate(t *testing.T) {
	tid := uint(1)
	p := &model.UnifiedPage{Slug: "test", Mode: "template", TemplateID: &tid}
	if err := p.Validate(); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestUnifiedPage_Validate_ValidStatuses(t *testing.T) {
	for _, s := range []string{"draft", "published", "scheduled"} {
		p := &model.UnifiedPage{Slug: "test", Mode: "composable", Status: s}
		if err := p.Validate(); err != nil {
			t.Errorf("unexpected error for status %q: %v", s, err)
		}
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/dev/impress/backend && go test -v -run TestUnifiedPage ./internal/model/
```

Expected: FAIL — type not found.

- [ ] **Step 3: Implement UnifiedPage model**

```go
// backend/internal/model/unified_page.go
package model

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

const (
	PageModeTemplate   = "template"
	PageModeComposable = "composable"
)

// UnifiedPage replaces both Page and ContentDocument.
type UnifiedPage struct {
	ID   uint   `gorm:"primaryKey" json:"id"`
	Slug string `gorm:"uniqueIndex;size:200;not null" json:"slug"`

	// Bilingual metadata
	ZhTitle       string `gorm:"size:500;not null;default:''" json:"zhTitle"`
	EnTitle       string `gorm:"size:500;not null;default:''" json:"enTitle"`
	ZhDescription string `gorm:"type:text;not null;default:''" json:"zhDescription"`
	EnDescription string `gorm:"type:text;not null;default:''" json:"enDescription"`

	// Page mode
	Mode       string `gorm:"size:20;not null;default:'composable'" json:"mode"`
	TemplateID *uint  `gorm:"index" json:"templateId"`

	// Dual-version content
	DraftConfig      JSONMap         `gorm:"type:text" json:"draftConfig"`
	DraftVersion     int             `gorm:"not null;default:1" json:"draftVersion"`
	PublishedConfig  NullableJSONMap `gorm:"type:text" json:"publishedConfig"` // nil = SQL NULL = never published
	PublishedVersion int             `gorm:"not null;default:0" json:"publishedVersion"`

	// Status & workflow
	Status      string     `gorm:"size:20;not null;default:'draft'" json:"status"`
	ScheduledAt *time.Time `json:"scheduledAt"`

	// Translation tracking
	TranslationStatus JSONMap `gorm:"type:text" json:"translationStatus"`

	// SEO
	ZhMetaTitle       string `gorm:"size:200;not null;default:''" json:"zhMetaTitle"`
	EnMetaTitle       string `gorm:"size:200;not null;default:''" json:"enMetaTitle"`
	ZhMetaDescription string `gorm:"size:500;not null;default:''" json:"zhMetaDescription"`
	EnMetaDescription string `gorm:"size:500;not null;default:''" json:"enMetaDescription"`
	ZhMetaKeywords    string `gorm:"size:500;not null;default:''" json:"zhMetaKeywords"`
	EnMetaKeywords    string `gorm:"size:500;not null;default:''" json:"enMetaKeywords"`

	// Navigation & ordering
	SortOrder int   `gorm:"not null;default:0" json:"sortOrder"`
	ShowInNav bool  `gorm:"not null;default:false" json:"showInNav"`
	ParentID  *uint `gorm:"index" json:"parentId"`

	// Timestamps
	CreatedAt   time.Time      `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt   time.Time      `gorm:"autoUpdateTime" json:"updatedAt"`
	PublishedAt *time.Time     `json:"publishedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (UnifiedPage) TableName() string { return "unified_pages" }

func (p *UnifiedPage) Validate() error {
	if p.Slug == "" {
		return errors.New("slug is required")
	}
	if p.Mode != PageModeTemplate && p.Mode != PageModeComposable {
		return errors.New("mode must be 'template' or 'composable'")
	}
	if p.Mode == PageModeTemplate && p.TemplateID == nil {
		return errors.New("templateId is required for template mode")
	}
	if p.Status != "" && p.Status != "draft" && p.Status != "published" && p.Status != "scheduled" {
		return errors.New("invalid status")
	}
	return nil
}

func (p *UnifiedPage) BeforeSave(tx *gorm.DB) error {
	if p.Status == "" {
		p.Status = "draft"
	}
	if p.Mode == "" {
		p.Mode = PageModeComposable
	}
	return p.Validate()
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/dev/impress/backend && go test -v -run TestUnifiedPage ./internal/model/
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /home/dev/impress/backend
git add internal/model/unified_page.go internal/model/unified_page_test.go
git commit -m "feat: add UnifiedPage model with validation"
```

### Task 2: Create PageVersion model

**Files:**
- Create: `backend/internal/model/page_version.go`

- [ ] **Step 1: Implement PageVersion model**

```go
// backend/internal/model/page_version.go
package model

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

// PageVersion stores a snapshot of a page config at publish time.
type PageVersion struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	PageID    uint      `gorm:"not null;index;uniqueIndex:idx_page_version" json:"pageId"`
	Version   int       `gorm:"not null;uniqueIndex:idx_page_version" json:"version"`
	Config    JSONMap   `gorm:"type:text;not null" json:"config"`
	CreatedBy uint      `gorm:"not null" json:"createdBy"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

func (PageVersion) TableName() string { return "page_versions" }

func (v *PageVersion) Validate() error {
	if v.PageID == 0 {
		return errors.New("pageId is required")
	}
	if v.Version < 1 {
		return errors.New("version must be >= 1")
	}
	return nil
}

func (v *PageVersion) BeforeSave(tx *gorm.DB) error {
	return v.Validate()
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /home/dev/impress/backend && go build ./internal/model/
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /home/dev/impress/backend
git add internal/model/page_version.go
git commit -m "feat: add PageVersion model for version history"
```

### Task 3: Create PageTemplate model

**Files:**
- Create: `backend/internal/model/page_template.go`
- Create: `backend/internal/model/page_template_test.go`

- [ ] **Step 1: Write test for PageTemplate validation**

```go
// backend/internal/model/page_template_test.go
package model_test

import (
	"testing"

	"blotting-consultancy/internal/model"
)

func TestPageTemplate_Validate_RequiresKey(t *testing.T) {
	pt := &model.PageTemplate{Key: "", NameZh: "test", Category: "custom"}
	if err := pt.Validate(); err == nil {
		t.Error("expected error for empty key")
	}
}

func TestPageTemplate_Validate_RequiresNameZh(t *testing.T) {
	pt := &model.PageTemplate{Key: "test", NameZh: "", Category: "custom"}
	if err := pt.Validate(); err == nil {
		t.Error("expected error for empty nameZh")
	}
}

func TestPageTemplate_Validate_ValidCategories(t *testing.T) {
	for _, c := range []string{"builtin", "custom", "theme"} {
		pt := &model.PageTemplate{Key: "test", NameZh: "测试", Category: c}
		if err := pt.Validate(); err != nil {
			t.Errorf("unexpected error for category %q: %v", c, err)
		}
	}
}

func TestPageTemplate_Validate_InvalidCategory(t *testing.T) {
	pt := &model.PageTemplate{Key: "test", NameZh: "测试", Category: "invalid"}
	if err := pt.Validate(); err == nil {
		t.Error("expected error for invalid category")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/dev/impress/backend && go test -v -run TestPageTemplate ./internal/model/
```

Expected: FAIL — type not found.

- [ ] **Step 3: Implement PageTemplate model**

```go
// backend/internal/model/page_template.go
package model

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

const (
	TemplateCategoryBuiltin = "builtin"
	TemplateCategoryCustom  = "custom"
	TemplateCategoryTheme   = "theme"
)

// PageTemplate defines a reusable page layout preset.
type PageTemplate struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	Key           string    `gorm:"uniqueIndex;size:100;not null" json:"key"`
	NameZh        string    `gorm:"size:200;not null" json:"nameZh"`
	NameEn        string    `gorm:"size:200;not null;default:''" json:"nameEn"`
	DescriptionZh string    `gorm:"type:text;not null;default:''" json:"descriptionZh"`
	DescriptionEn string    `gorm:"type:text;not null;default:''" json:"descriptionEn"`
	Category      string    `gorm:"size:50;not null;default:'custom'" json:"category"`
	Config        JSONMap   `gorm:"type:text;not null" json:"config"`
	Thumbnail     string    `gorm:"size:500" json:"thumbnail"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime" json:"updatedAt"`
}

func (PageTemplate) TableName() string { return "page_templates" }

func (pt *PageTemplate) Validate() error {
	if pt.Key == "" {
		return errors.New("key is required")
	}
	if pt.NameZh == "" {
		return errors.New("nameZh is required")
	}
	switch pt.Category {
	case TemplateCategoryBuiltin, TemplateCategoryCustom, TemplateCategoryTheme:
	default:
		return errors.New("category must be 'builtin', 'custom', or 'theme'")
	}
	return nil
}

func (pt *PageTemplate) BeforeSave(tx *gorm.DB) error {
	if pt.Category == "" {
		pt.Category = TemplateCategoryCustom
	}
	return pt.Validate()
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/dev/impress/backend && go test -v -run TestPageTemplate ./internal/model/
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /home/dev/impress/backend
git add internal/model/page_template.go internal/model/page_template_test.go
git commit -m "feat: add PageTemplate model with validation"
```

### Task 4: Create SiteConfig model

**Files:**
- Create: `backend/internal/model/site_config.go`

- [ ] **Step 1: Implement SiteConfig model**

```go
// backend/internal/model/site_config.go
package model

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

const (
	SiteConfigKeyGlobal = "global"
	SiteConfigKeyTheme  = "theme"
)

// SiteConfig stores site-wide configuration (replaces global and theme content documents).
type SiteConfig struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	Key              string    `gorm:"uniqueIndex;size:50;not null" json:"key"`
	DraftConfig      JSONMap   `gorm:"type:text" json:"draftConfig"`
	DraftVersion     int       `gorm:"not null;default:1" json:"draftVersion"`
	PublishedConfig  JSONMap   `gorm:"type:text" json:"publishedConfig"`
	PublishedVersion int       `gorm:"not null;default:0" json:"publishedVersion"`
	CreatedAt        time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt        time.Time `gorm:"autoUpdateTime" json:"updatedAt"`
}

func (SiteConfig) TableName() string { return "site_configs" }

func (sc *SiteConfig) Validate() error {
	if sc.Key != SiteConfigKeyGlobal && sc.Key != SiteConfigKeyTheme {
		return errors.New("key must be 'global' or 'theme'")
	}
	return nil
}

func (sc *SiteConfig) BeforeSave(tx *gorm.DB) error {
	return sc.Validate()
}
```

- [ ] **Step 2: Write test for SiteConfig validation**

```go
// backend/internal/model/site_config_test.go
package model_test

import (
	"testing"

	"blotting-consultancy/internal/model"
)

func TestSiteConfig_Validate_ValidKeys(t *testing.T) {
	for _, k := range []string{"global", "theme"} {
		sc := &model.SiteConfig{Key: k}
		if err := sc.Validate(); err != nil {
			t.Errorf("unexpected error for key %q: %v", k, err)
		}
	}
}

func TestSiteConfig_Validate_InvalidKey(t *testing.T) {
	sc := &model.SiteConfig{Key: "invalid"}
	if err := sc.Validate(); err == nil {
		t.Error("expected error for invalid key")
	}
}

func TestSiteConfig_Validate_EmptyKey(t *testing.T) {
	sc := &model.SiteConfig{Key: ""}
	if err := sc.Validate(); err == nil {
		t.Error("expected error for empty key")
	}
}
```

- [ ] **Step 3: Run tests**

```bash
cd /home/dev/impress/backend && go test -v -run TestSiteConfig ./internal/model/
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd /home/dev/impress/backend
git add internal/model/site_config.go internal/model/site_config_test.go
git commit -m "feat: add SiteConfig model for global/theme config"
```

### Task 5: Register new models in AutoMigrate

**Files:**
- Modify: `backend/cmd/server/main.go` (AutoMigrate section)

- [ ] **Step 1: Find and update the AutoMigrate call**

In `backend/cmd/server/main.go`, find the `AutoMigrate(...)` call (currently includes `&model.Page{}`, `&model.ContentDocument{}`, `&model.ContentVersion{}`). Add the four new models:

```go
&model.UnifiedPage{},
&model.PageVersion{},
&model.PageTemplate{},
&model.SiteConfig{},
```

Keep the old models in AutoMigrate for now — they'll be removed in the cleanup chunk.

- [ ] **Step 2: Verify backend compiles and starts**

```bash
cd /home/dev/impress/backend && go build -o server ./cmd/server/
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add backend/cmd/server/main.go
git commit -m "feat: register unified page models in AutoMigrate"
```

---

## Chunk 2: Backend Repositories

### Task 6: Create UnifiedPageRepository

**Files:**
- Create: `backend/internal/repository/unified_page_repository.go`
- Create: `backend/internal/repository/unified_page_repository_impl.go`
- Create: `backend/internal/repository/unified_page_repository_test.go`

- [ ] **Step 1: Write repository interface**

```go
// backend/internal/repository/unified_page_repository.go
package repository

import (
	"context"

	"blotting-consultancy/internal/model"
)

type UnifiedPageRepository interface {
	Create(ctx context.Context, page *model.UnifiedPage) error
	Update(ctx context.Context, page *model.UnifiedPage) error
	Delete(ctx context.Context, id uint) error
	FindByID(ctx context.Context, id uint) (*model.UnifiedPage, error)
	FindBySlug(ctx context.Context, slug string) (*model.UnifiedPage, error)
	List(ctx context.Context, status string, mode string, parentID *uint) ([]*model.UnifiedPage, error)
	ListPublished(ctx context.Context) ([]*model.UnifiedPage, error)
	UpdateDraft(ctx context.Context, id uint, expectedVersion int, draftConfig model.JSONMap) (int, error)
	UpdatePublished(ctx context.Context, id uint, publishedConfig model.JSONMap, publishedVersion int) error
	UpdateSortOrder(ctx context.Context, id uint, sortOrder int) error
}
```

- [ ] **Step 2: Write integration test**

```go
// backend/internal/repository/unified_page_repository_test.go
package repository_test

import (
	"context"
	"testing"

	"blotting-consultancy/internal/model"
	"blotting-consultancy/internal/repository"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(&model.UnifiedPage{}, &model.PageVersion{}, &model.PageTemplate{}, &model.SiteConfig{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

func TestUnifiedPageRepo_CreateAndFindBySlug(t *testing.T) {
	db := setupTestDB(t)
	repo := repository.NewGormUnifiedPageRepository(db)
	ctx := context.Background()

	page := &model.UnifiedPage{Slug: "about", ZhTitle: "关于", Mode: "composable"}
	if err := repo.Create(ctx, page); err != nil {
		t.Fatalf("create: %v", err)
	}
	if page.ID == 0 {
		t.Error("expected ID to be set after create")
	}

	found, err := repo.FindBySlug(ctx, "about")
	if err != nil {
		t.Fatalf("find: %v", err)
	}
	if found.ZhTitle != "关于" {
		t.Errorf("expected zhTitle '关于', got %q", found.ZhTitle)
	}
}

func TestUnifiedPageRepo_UpdateDraft_OptimisticLock(t *testing.T) {
	db := setupTestDB(t)
	repo := repository.NewGormUnifiedPageRepository(db)
	ctx := context.Background()

	page := &model.UnifiedPage{Slug: "test", Mode: "composable", DraftVersion: 1}
	repo.Create(ctx, page)

	// Correct version
	newVer, err := repo.UpdateDraft(ctx, page.ID, 1, model.JSONMap{"sections": []any{}})
	if err != nil {
		t.Fatalf("updateDraft: %v", err)
	}
	if newVer != 2 {
		t.Errorf("expected version 2, got %d", newVer)
	}

	// Stale version → conflict
	_, err = repo.UpdateDraft(ctx, page.ID, 1, model.JSONMap{"sections": []any{}})
	if err == nil {
		t.Error("expected conflict error for stale version")
	}
}

func TestUnifiedPageRepo_ListPublished(t *testing.T) {
	db := setupTestDB(t)
	repo := repository.NewGormUnifiedPageRepository(db)
	ctx := context.Background()

	repo.Create(ctx, &model.UnifiedPage{Slug: "pub", Mode: "composable", Status: "published"})
	repo.Create(ctx, &model.UnifiedPage{Slug: "draft", Mode: "composable", Status: "draft"})

	pages, err := repo.ListPublished(ctx)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(pages) != 1 {
		t.Errorf("expected 1 published, got %d", len(pages))
	}
}
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd /home/dev/impress/backend && go test -v -run TestUnifiedPageRepo ./internal/repository/
```

Expected: FAIL — constructor not found.

- [ ] **Step 4: Implement repository**

```go
// backend/internal/repository/unified_page_repository_impl.go
package repository

import (
	"context"
	"errors"
	"fmt"

	"blotting-consultancy/internal/model"
	"gorm.io/gorm"
)

type GormUnifiedPageRepository struct {
	db *gorm.DB
}

func NewGormUnifiedPageRepository(db *gorm.DB) UnifiedPageRepository {
	return &GormUnifiedPageRepository{db: db}
}

func (r *GormUnifiedPageRepository) Create(ctx context.Context, page *model.UnifiedPage) error {
	return r.db.WithContext(ctx).Create(page).Error
}

func (r *GormUnifiedPageRepository) Update(ctx context.Context, page *model.UnifiedPage) error {
	return r.db.WithContext(ctx).Save(page).Error
}

func (r *GormUnifiedPageRepository) Delete(ctx context.Context, id uint) error {
	result := r.db.WithContext(ctx).Delete(&model.UnifiedPage{}, id)
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return result.Error
}

func (r *GormUnifiedPageRepository) FindByID(ctx context.Context, id uint) (*model.UnifiedPage, error) {
	var page model.UnifiedPage
	if err := r.db.WithContext(ctx).First(&page, id).Error; err != nil {
		return nil, err
	}
	return &page, nil
}

func (r *GormUnifiedPageRepository) FindBySlug(ctx context.Context, slug string) (*model.UnifiedPage, error) {
	var page model.UnifiedPage
	if err := r.db.WithContext(ctx).Where("slug = ?", slug).First(&page).Error; err != nil {
		return nil, err
	}
	return &page, nil
}

func (r *GormUnifiedPageRepository) List(ctx context.Context, status string, mode string, parentID *uint) ([]*model.UnifiedPage, error) {
	q := r.db.WithContext(ctx).Model(&model.UnifiedPage{})
	if status != "" {
		q = q.Where("status = ?", status)
	}
	if mode != "" {
		q = q.Where("mode = ?", mode)
	}
	if parentID != nil {
		q = q.Where("parent_id = ?", *parentID)
	}
	var pages []*model.UnifiedPage
	err := q.Order("sort_order ASC, created_at DESC").Find(&pages).Error
	return pages, err
}

func (r *GormUnifiedPageRepository) ListPublished(ctx context.Context) ([]*model.UnifiedPage, error) {
	var pages []*model.UnifiedPage
	err := r.db.WithContext(ctx).
		Where("status = ?", "published").
		Order("sort_order ASC, created_at DESC").
		Find(&pages).Error
	return pages, err
}

func (r *GormUnifiedPageRepository) UpdateDraft(ctx context.Context, id uint, expectedVersion int, draftConfig model.JSONMap) (int, error) {
	result := r.db.WithContext(ctx).
		Model(&model.UnifiedPage{}).
		Where("id = ? AND draft_version = ?", id, expectedVersion).
		Updates(map[string]interface{}{
			"draft_config":  draftConfig,
			"draft_version": gorm.Expr("draft_version + 1"),
		})
	if result.Error != nil {
		return 0, result.Error
	}
	if result.RowsAffected == 0 {
		return 0, errors.New("draft version conflict or page not found")
	}
	// Fetch new version
	var page model.UnifiedPage
	if err := r.db.WithContext(ctx).Select("draft_version").First(&page, id).Error; err != nil {
		return 0, fmt.Errorf("fetch new version: %w", err)
	}
	return page.DraftVersion, nil
}

func (r *GormUnifiedPageRepository) UpdatePublished(ctx context.Context, id uint, publishedConfig model.JSONMap, publishedVersion int) error {
	return r.db.WithContext(ctx).
		Model(&model.UnifiedPage{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"published_config":  publishedConfig,
			"published_version": publishedVersion,
			"status":            "published",
		}).Error
}

func (r *GormUnifiedPageRepository) UpdateSortOrder(ctx context.Context, id uint, sortOrder int) error {
	result := r.db.WithContext(ctx).Model(&model.UnifiedPage{}).Where("id = ?", id).Update("sort_order", sortOrder)
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return result.Error
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /home/dev/impress/backend && go test -v -run TestUnifiedPageRepo ./internal/repository/
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd /home/dev/impress/backend
git add internal/repository/unified_page_repository.go internal/repository/unified_page_repository_impl.go internal/repository/unified_page_repository_test.go
git commit -m "feat: add UnifiedPageRepository with optimistic draft locking"
```

### Task 7: Create PageVersionRepository

**Files:**
- Create: `backend/internal/repository/page_version_repository.go`
- Create: `backend/internal/repository/page_version_repository_impl.go`

- [ ] **Step 1: Write interface**

```go
// backend/internal/repository/page_version_repository.go
package repository

import (
	"context"

	"blotting-consultancy/internal/model"
)

type PageVersionRepository interface {
	Create(ctx context.Context, version *model.PageVersion) error
	FindByPageIDAndVersion(ctx context.Context, pageID uint, version int) (*model.PageVersion, error)
	ListByPageID(ctx context.Context, pageID uint, offset, limit int) ([]*model.PageVersion, int64, error)
	GetLatestVersion(ctx context.Context, pageID uint) (int, error)
	Delete(ctx context.Context, id uint) error
}
```

- [ ] **Step 2: Implement**

```go
// backend/internal/repository/page_version_repository_impl.go
package repository

import (
	"context"

	"blotting-consultancy/internal/model"
	"gorm.io/gorm"
)

type GormPageVersionRepository struct {
	db *gorm.DB
}

func NewGormPageVersionRepository(db *gorm.DB) PageVersionRepository {
	return &GormPageVersionRepository{db: db}
}

func (r *GormPageVersionRepository) Create(ctx context.Context, v *model.PageVersion) error {
	return r.db.WithContext(ctx).Create(v).Error
}

func (r *GormPageVersionRepository) FindByPageIDAndVersion(ctx context.Context, pageID uint, version int) (*model.PageVersion, error) {
	var v model.PageVersion
	err := r.db.WithContext(ctx).Where("page_id = ? AND version = ?", pageID, version).First(&v).Error
	return &v, err
}

func (r *GormPageVersionRepository) ListByPageID(ctx context.Context, pageID uint, offset, limit int) ([]*model.PageVersion, int64, error) {
	var versions []*model.PageVersion
	var count int64
	q := r.db.WithContext(ctx).Model(&model.PageVersion{}).Where("page_id = ?", pageID)
	if err := q.Count(&count).Error; err != nil {
		return nil, 0, err
	}
	err := q.Order("version DESC").Offset(offset).Limit(limit).Find(&versions).Error
	return versions, count, err
}

func (r *GormPageVersionRepository) GetLatestVersion(ctx context.Context, pageID uint) (int, error) {
	var result struct{ Max int }
	err := r.db.WithContext(ctx).
		Model(&model.PageVersion{}).
		Select("COALESCE(MAX(version), 0) as max").
		Where("page_id = ?", pageID).
		Scan(&result).Error
	return result.Max, err
}

func (r *GormPageVersionRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&model.PageVersion{}, id).Error
}
```

- [ ] **Step 3: Verify it compiles**

```bash
cd /home/dev/impress/backend && go build ./internal/repository/
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /home/dev/impress/backend
git add internal/repository/page_version_repository.go internal/repository/page_version_repository_impl.go
git commit -m "feat: add PageVersionRepository"
```

### Task 8: Create PageTemplateRepository

**Files:**
- Create: `backend/internal/repository/page_template_repository.go`
- Create: `backend/internal/repository/page_template_repository_impl.go`

- [ ] **Step 1: Write interface**

```go
// backend/internal/repository/page_template_repository.go
package repository

import (
	"context"

	"blotting-consultancy/internal/model"
)

type PageTemplateRepository interface {
	Create(ctx context.Context, tmpl *model.PageTemplate) error
	Update(ctx context.Context, tmpl *model.PageTemplate) error
	Delete(ctx context.Context, id uint) error
	FindByID(ctx context.Context, id uint) (*model.PageTemplate, error)
	FindByKey(ctx context.Context, key string) (*model.PageTemplate, error)
	List(ctx context.Context, category string) ([]*model.PageTemplate, error)
}
```

- [ ] **Step 2: Implement**

```go
// backend/internal/repository/page_template_repository_impl.go
package repository

import (
	"context"

	"blotting-consultancy/internal/model"
	"gorm.io/gorm"
)

type GormPageTemplateRepository struct {
	db *gorm.DB
}

func NewGormPageTemplateRepository(db *gorm.DB) PageTemplateRepository {
	return &GormPageTemplateRepository{db: db}
}

func (r *GormPageTemplateRepository) Create(ctx context.Context, tmpl *model.PageTemplate) error {
	return r.db.WithContext(ctx).Create(tmpl).Error
}

func (r *GormPageTemplateRepository) Update(ctx context.Context, tmpl *model.PageTemplate) error {
	return r.db.WithContext(ctx).Save(tmpl).Error
}

func (r *GormPageTemplateRepository) Delete(ctx context.Context, id uint) error {
	result := r.db.WithContext(ctx).Delete(&model.PageTemplate{}, id)
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return result.Error
}

func (r *GormPageTemplateRepository) FindByID(ctx context.Context, id uint) (*model.PageTemplate, error) {
	var tmpl model.PageTemplate
	err := r.db.WithContext(ctx).First(&tmpl, id).Error
	return &tmpl, err
}

func (r *GormPageTemplateRepository) FindByKey(ctx context.Context, key string) (*model.PageTemplate, error) {
	var tmpl model.PageTemplate
	err := r.db.WithContext(ctx).Where("key = ?", key).First(&tmpl).Error
	return &tmpl, err
}

func (r *GormPageTemplateRepository) List(ctx context.Context, category string) ([]*model.PageTemplate, error) {
	q := r.db.WithContext(ctx).Model(&model.PageTemplate{})
	if category != "" {
		q = q.Where("category = ?", category)
	}
	var templates []*model.PageTemplate
	err := q.Order("category ASC, key ASC").Find(&templates).Error
	return templates, err
}
```

- [ ] **Step 3: Verify it compiles**

```bash
cd /home/dev/impress/backend && go build ./internal/repository/
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /home/dev/impress/backend
git add internal/repository/page_template_repository.go internal/repository/page_template_repository_impl.go
git commit -m "feat: add PageTemplateRepository"
```

### Task 9: Create SiteConfigRepository

**Files:**
- Create: `backend/internal/repository/site_config_repository.go`
- Create: `backend/internal/repository/site_config_repository_impl.go`

- [ ] **Step 1: Write interface**

```go
// backend/internal/repository/site_config_repository.go
package repository

import (
	"context"

	"blotting-consultancy/internal/model"
)

type SiteConfigRepository interface {
	FindByKey(ctx context.Context, key string) (*model.SiteConfig, error)
	Upsert(ctx context.Context, config *model.SiteConfig) error
	UpdateDraft(ctx context.Context, key string, expectedVersion int, draftConfig model.JSONMap) (int, error)
	UpdatePublished(ctx context.Context, key string, publishedConfig model.JSONMap, publishedVersion int) error
}
```

- [ ] **Step 2: Implement**

```go
// backend/internal/repository/site_config_repository_impl.go
package repository

import (
	"context"
	"errors"
	"fmt"

	"blotting-consultancy/internal/model"
	"gorm.io/gorm"
)

type GormSiteConfigRepository struct {
	db *gorm.DB
}

func NewGormSiteConfigRepository(db *gorm.DB) SiteConfigRepository {
	return &GormSiteConfigRepository{db: db}
}

func (r *GormSiteConfigRepository) FindByKey(ctx context.Context, key string) (*model.SiteConfig, error) {
	var sc model.SiteConfig
	err := r.db.WithContext(ctx).Where("key = ?", key).First(&sc).Error
	return &sc, err
}

func (r *GormSiteConfigRepository) Upsert(ctx context.Context, config *model.SiteConfig) error {
	var existing model.SiteConfig
	err := r.db.WithContext(ctx).Where("key = ?", config.Key).First(&existing).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return r.db.WithContext(ctx).Create(config).Error
	}
	if err != nil {
		return err
	}
	config.ID = existing.ID
	return r.db.WithContext(ctx).Save(config).Error
}

func (r *GormSiteConfigRepository) UpdateDraft(ctx context.Context, key string, expectedVersion int, draftConfig model.JSONMap) (int, error) {
	result := r.db.WithContext(ctx).
		Model(&model.SiteConfig{}).
		Where("key = ? AND draft_version = ?", key, expectedVersion).
		Updates(map[string]interface{}{
			"draft_config":  draftConfig,
			"draft_version": gorm.Expr("draft_version + 1"),
		})
	if result.Error != nil {
		return 0, result.Error
	}
	if result.RowsAffected == 0 {
		return 0, errors.New("draft version conflict or config not found")
	}
	var sc model.SiteConfig
	if err := r.db.WithContext(ctx).Select("draft_version").Where("key = ?", key).First(&sc).Error; err != nil {
		return 0, fmt.Errorf("fetch new version: %w", err)
	}
	return sc.DraftVersion, nil
}

func (r *GormSiteConfigRepository) UpdatePublished(ctx context.Context, key string, publishedConfig model.JSONMap, publishedVersion int) error {
	return r.db.WithContext(ctx).
		Model(&model.SiteConfig{}).
		Where("key = ?", key).
		Updates(map[string]interface{}{
			"published_config":  publishedConfig,
			"published_version": publishedVersion,
		}).Error
}
```

- [ ] **Step 3: Verify it compiles**

```bash
cd /home/dev/impress/backend && go build ./internal/repository/
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /home/dev/impress/backend
git add internal/repository/site_config_repository.go internal/repository/site_config_repository_impl.go
git commit -m "feat: add SiteConfigRepository"
```

- [ ] **Step 5: Run all backend tests**

```bash
cd /home/dev/impress/backend && go test -v -race ./...
```

Expected: All pass.

---

## Chunk 3: Backend Service — UnifiedPageService

### Task 10: Create UnifiedPageService with draft/publish/rollback

**Files:**
- Create: `backend/internal/service/unified_page_service.go`
- Create: `backend/internal/service/unified_page_service_test.go`

- [ ] **Step 1: Write tests for publish and rollback**

```go
// backend/internal/service/unified_page_service_test.go
package service_test

import (
	"context"
	"testing"

	"blotting-consultancy/internal/model"
	"blotting-consultancy/internal/repository"
	"blotting-consultancy/internal/service"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	db.AutoMigrate(&model.UnifiedPage{}, &model.PageVersion{}, &model.PageTemplate{}, &model.SiteConfig{})
	return db
}

func TestUnifiedPageService_Publish(t *testing.T) {
	db := setupServiceTestDB(t)
	pageRepo := repository.NewGormUnifiedPageRepository(db)
	versionRepo := repository.NewGormPageVersionRepository(db)
	svc := service.NewUnifiedPageService(pageRepo, versionRepo)
	ctx := context.Background()

	page := &model.UnifiedPage{
		Slug: "test", Mode: "composable", DraftVersion: 1,
		DraftConfig: model.JSONMap{"sections": []any{}},
	}
	pageRepo.Create(ctx, page)

	err := svc.Publish(ctx, page.ID, 1, 1) // expectedDraftVersion=1, userID=1
	if err != nil {
		t.Fatalf("publish: %v", err)
	}

	updated, _ := pageRepo.FindByID(ctx, page.ID)
	if updated.Status != "published" {
		t.Errorf("expected published, got %q", updated.Status)
	}
	if updated.PublishedVersion != 1 {
		t.Errorf("expected publishedVersion 1, got %d", updated.PublishedVersion)
	}

	// Verify version record created
	versions, count, _ := versionRepo.ListByPageID(ctx, page.ID, 0, 10)
	if count != 1 {
		t.Errorf("expected 1 version, got %d", count)
	}
	if versions[0].CreatedBy != 1 {
		t.Errorf("expected createdBy 1, got %d", versions[0].CreatedBy)
	}
}

func TestUnifiedPageService_Publish_VersionConflict(t *testing.T) {
	db := setupServiceTestDB(t)
	pageRepo := repository.NewGormUnifiedPageRepository(db)
	versionRepo := repository.NewGormPageVersionRepository(db)
	svc := service.NewUnifiedPageService(pageRepo, versionRepo)
	ctx := context.Background()

	page := &model.UnifiedPage{
		Slug: "test", Mode: "composable", DraftVersion: 2,
		DraftConfig: model.JSONMap{"sections": []any{}},
	}
	pageRepo.Create(ctx, page)

	err := svc.Publish(ctx, page.ID, 1, 1) // wrong expectedDraftVersion
	if err == nil {
		t.Error("expected version conflict error")
	}
}

func TestUnifiedPageService_Rollback(t *testing.T) {
	db := setupServiceTestDB(t)
	pageRepo := repository.NewGormUnifiedPageRepository(db)
	versionRepo := repository.NewGormPageVersionRepository(db)
	svc := service.NewUnifiedPageService(pageRepo, versionRepo)
	ctx := context.Background()

	page := &model.UnifiedPage{
		Slug: "test", Mode: "composable", DraftVersion: 1,
		DraftConfig: model.JSONMap{"sections": []any{map[string]any{"type": "hero"}}},
	}
	pageRepo.Create(ctx, page)

	// Publish v1 (draftVersion=1)
	if err := svc.Publish(ctx, page.ID, 1, 1); err != nil {
		t.Fatalf("publish v1: %v", err)
	}

	// Modify draft (current draftVersion=1, UpdateDraft increments to 2)
	newDraftVer, err := pageRepo.UpdateDraft(ctx, page.ID, 1, model.JSONMap{"sections": []any{map[string]any{"type": "hero"}, map[string]any{"type": "rich-text"}}})
	if err != nil {
		t.Fatalf("update draft: %v", err)
	}

	// Publish v2 (draftVersion=newDraftVer)
	if err := svc.Publish(ctx, page.ID, newDraftVer, 1); err != nil {
		t.Fatalf("publish v2: %v", err)
	}

	// Rollback to v1 → creates v3
	err = svc.Rollback(ctx, page.ID, 1, 1)
	if err != nil {
		t.Fatalf("rollback: %v", err)
	}

	updated, _ := pageRepo.FindByID(ctx, page.ID)
	if updated.PublishedVersion != 3 {
		t.Errorf("expected publishedVersion 3 after rollback, got %d", updated.PublishedVersion)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/dev/impress/backend && go test -v -run TestUnifiedPageService ./internal/service/
```

Expected: FAIL — constructor not found.

- [ ] **Step 3: Implement UnifiedPageService**

```go
// backend/internal/service/unified_page_service.go
package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"blotting-consultancy/internal/model"
	"blotting-consultancy/internal/repository"
)

var (
	ErrPageVersionConflict = errors.New("draft version conflict")
	ErrPageNotFound        = errors.New("page not found")
	ErrVersionNotFound     = errors.New("version not found")
)

type UnifiedPageService struct {
	pageRepo    repository.UnifiedPageRepository
	versionRepo repository.PageVersionRepository
}

func NewUnifiedPageService(pageRepo repository.UnifiedPageRepository, versionRepo repository.PageVersionRepository) *UnifiedPageService {
	return &UnifiedPageService{pageRepo: pageRepo, versionRepo: versionRepo}
}

// Publish copies DraftConfig → PublishedConfig, creates a version record.
func (s *UnifiedPageService) Publish(ctx context.Context, pageID uint, expectedDraftVersion int, userID uint) error {
	page, err := s.pageRepo.FindByID(ctx, pageID)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrPageNotFound, err)
	}
	if page.DraftVersion != expectedDraftVersion {
		return ErrPageVersionConflict
	}

	// Determine next published version
	latestVer, err := s.versionRepo.GetLatestVersion(ctx, pageID)
	if err != nil {
		return fmt.Errorf("get latest version: %w", err)
	}
	newVersion := latestVer + 1

	// Create version record
	version := &model.PageVersion{
		PageID:    pageID,
		Version:   newVersion,
		Config:    page.DraftConfig,
		CreatedBy: userID,
	}
	if err := s.versionRepo.Create(ctx, version); err != nil {
		return fmt.Errorf("create version: %w", err)
	}

	// Update page in a single write: published config + status + publishedAt
	now := time.Now()
	page.PublishedConfig = model.NullableJSONMap(page.DraftConfig)
	page.PublishedVersion = newVersion
	page.Status = "published"
	page.PublishedAt = &now
	return s.pageRepo.Update(ctx, page)
}

// Rollback loads a historical version and publishes it as a new version.
func (s *UnifiedPageService) Rollback(ctx context.Context, pageID uint, targetVersion int, userID uint) error {
	historicalVersion, err := s.versionRepo.FindByPageIDAndVersion(ctx, pageID, targetVersion)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrVersionNotFound, err)
	}

	latestVer, err := s.versionRepo.GetLatestVersion(ctx, pageID)
	if err != nil {
		return fmt.Errorf("get latest version: %w", err)
	}
	newVersion := latestVer + 1

	// Create new version record from historical config
	version := &model.PageVersion{
		PageID:    pageID,
		Version:   newVersion,
		Config:    historicalVersion.Config,
		CreatedBy: userID,
	}
	if err := s.versionRepo.Create(ctx, version); err != nil {
		return fmt.Errorf("create rollback version: %w", err)
	}

	// Update both draft and published
	page, err := s.pageRepo.FindByID(ctx, pageID)
	if err != nil {
		return fmt.Errorf("find page: %w", err)
	}

	page.DraftConfig = historicalVersion.Config
	page.DraftVersion = page.DraftVersion + 1
	page.PublishedConfig = model.NullableJSONMap(historicalVersion.Config)
	page.PublishedVersion = newVersion
	page.Status = "published"
	now := time.Now()
	page.PublishedAt = &now
	return s.pageRepo.Update(ctx, page)
}

// Unpublish sets page back to draft. Sets PublishedConfig to nil (SQL NULL via NullableJSONMap).
func (s *UnifiedPageService) Unpublish(ctx context.Context, pageID uint) error {
	page, err := s.pageRepo.FindByID(ctx, pageID)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrPageNotFound, err)
	}
	page.Status = "draft"
	page.PublishedConfig = nil // NullableJSONMap nil → SQL NULL, enabling "404 if published_config IS NULL"
	return s.pageRepo.Update(ctx, page)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/dev/impress/backend && go test -v -run TestUnifiedPageService ./internal/service/
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /home/dev/impress/backend
git add internal/service/unified_page_service.go internal/service/unified_page_service_test.go
git commit -m "feat: add UnifiedPageService with publish/rollback/unpublish"
```

---

## Chunk 4: Backend Handlers

### Task 11: Create unified page handler

**Files:**
- Create: `backend/internal/handler/unified_page/handler.go`

- [ ] **Step 1: Implement handler with all endpoints**

```go
// backend/internal/handler/unified_page/handler.go
package unified_page

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"blotting-consultancy/internal/middleware"
	"blotting-consultancy/internal/model"
	"blotting-consultancy/internal/repository"
	"blotting-consultancy/internal/service"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct {
	pageRepo    repository.UnifiedPageRepository
	versionRepo repository.PageVersionRepository
	pageSvc     *service.UnifiedPageService
}

func NewHandler(pageRepo repository.UnifiedPageRepository, versionRepo repository.PageVersionRepository, pageSvc *service.UnifiedPageService) *Handler {
	return &Handler{pageRepo: pageRepo, versionRepo: versionRepo, pageSvc: pageSvc}
}

// getUserID extracts the authenticated user ID from gin context.
func getUserID(c *gin.Context) (uint, bool) {
	userCtx := middleware.GetUserContext(c)
	if userCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return 0, false
	}
	return userCtx.UserID, true
}

// --- Public endpoints ---

func (h *Handler) PublicList(c *gin.Context) {
	pages, err := h.pageRepo.ListPublished(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list pages"})
		return
	}
	locale := c.DefaultQuery("locale", "zh")
	result := make([]gin.H, 0, len(pages))
	for _, p := range pages {
		result = append(result, gin.H{
			"id":          p.ID,
			"slug":        p.Slug,
			"title":       localizedField(p.ZhTitle, p.EnTitle, locale),
			"description": localizedField(p.ZhDescription, p.EnDescription, locale),
			"mode":        p.Mode,
			"showInNav":   p.ShowInNav,
			"sortOrder":   p.SortOrder,
			"parentId":    p.ParentID,
		})
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) PublicGetBySlug(c *gin.Context) {
	slug := c.Param("slug")
	page, err := h.pageRepo.FindBySlug(c.Request.Context(), slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "page not found"})
		return
	}
	if page.PublishedConfig == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "page not published"})
		return
	}
	locale := c.DefaultQuery("locale", "zh")
	c.JSON(http.StatusOK, gin.H{
		"id":          page.ID,
		"slug":        page.Slug,
		"title":       localizedField(page.ZhTitle, page.EnTitle, locale),
		"description": localizedField(page.ZhDescription, page.EnDescription, locale),
		"mode":        page.Mode,
		"config":      page.PublishedConfig,
		"seo": gin.H{
			"title":       localizedField(page.ZhMetaTitle, page.EnMetaTitle, locale),
			"description": localizedField(page.ZhMetaDescription, page.EnMetaDescription, locale),
			"keywords":    localizedField(page.ZhMetaKeywords, page.EnMetaKeywords, locale),
		},
	})
}

// --- Admin endpoints ---

func (h *Handler) AdminList(c *gin.Context) {
	status := c.Query("status")
	mode := c.Query("mode")
	var parentID *uint
	if pid := c.Query("parentId"); pid != "" {
		if v, err := strconv.ParseUint(pid, 10, 64); err == nil {
			u := uint(v)
			parentID = &u
		}
	}
	pages, err := h.pageRepo.List(c.Request.Context(), status, mode, parentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list pages"})
		return
	}
	c.JSON(http.StatusOK, pages)
}

func (h *Handler) AdminGetByID(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}
	page, err := h.pageRepo.FindByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "page not found"})
		return
	}
	c.JSON(http.StatusOK, page)
}

type createInput struct {
	Slug              string      `json:"slug" binding:"required"`
	ZhTitle           string      `json:"zhTitle"`
	EnTitle           string      `json:"enTitle"`
	ZhDescription     string      `json:"zhDescription"`
	EnDescription     string      `json:"enDescription"`
	Mode              string      `json:"mode" binding:"required"`
	TemplateID        *uint       `json:"templateId"`
	DraftConfig       model.JSONMap `json:"draftConfig"`
	ZhMetaTitle       string      `json:"zhMetaTitle"`
	EnMetaTitle       string      `json:"enMetaTitle"`
	ZhMetaDescription string      `json:"zhMetaDescription"`
	EnMetaDescription string      `json:"enMetaDescription"`
	ZhMetaKeywords    string      `json:"zhMetaKeywords"`
	EnMetaKeywords    string      `json:"enMetaKeywords"`
	SortOrder         int         `json:"sortOrder"`
	ShowInNav         bool        `json:"showInNav"`
	ParentID          *uint       `json:"parentId"`
}

func (h *Handler) AdminCreate(c *gin.Context) {
	var input createInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	page := &model.UnifiedPage{
		Slug:              input.Slug,
		ZhTitle:           input.ZhTitle,
		EnTitle:           input.EnTitle,
		ZhDescription:     input.ZhDescription,
		EnDescription:     input.EnDescription,
		Mode:              input.Mode,
		TemplateID:        input.TemplateID,
		DraftConfig:       input.DraftConfig,
		DraftVersion:      1,
		Status:            "draft",
		ZhMetaTitle:       input.ZhMetaTitle,
		EnMetaTitle:       input.EnMetaTitle,
		ZhMetaDescription: input.ZhMetaDescription,
		EnMetaDescription: input.EnMetaDescription,
		ZhMetaKeywords:    input.ZhMetaKeywords,
		EnMetaKeywords:    input.EnMetaKeywords,
		SortOrder:         input.SortOrder,
		ShowInNav:         input.ShowInNav,
		ParentID:          input.ParentID,
	}
	if err := h.pageRepo.Create(c.Request.Context(), page); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, page)
}

func (h *Handler) AdminGetDraft(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}
	page, err := h.pageRepo.FindByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "page not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"id":               page.ID,
		"slug":             page.Slug,
		"config":           page.DraftConfig,
		"version":          page.DraftVersion,
		"publishedVersion": page.PublishedVersion,
		"updatedAt":        page.UpdatedAt,
	})
}

type updateDraftInput struct {
	Config model.JSONMap `json:"config" binding:"required"`
}

func (h *Handler) AdminUpdateDraft(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}
	ifMatch := c.GetHeader("If-Match")
	if ifMatch == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "If-Match header required"})
		return
	}
	expectedVersion, err := strconv.Atoi(ifMatch)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "If-Match must be an integer"})
		return
	}
	var input updateDraftInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	newVersion, err := h.pageRepo.UpdateDraft(c.Request.Context(), id, expectedVersion, input.Config)
	if err != nil {
		// Distinguish version conflict from other errors
		page, findErr := h.pageRepo.FindByID(c.Request.Context(), id)
		if findErr != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "page not found"})
			return
		}
		if page.DraftVersion != expectedVersion {
			// Version mismatch — this is a conflict
			c.JSON(http.StatusConflict, gin.H{
				"error":          "conflict",
				"currentVersion": page.DraftVersion,
			})
			return
		}
		// Not a conflict — some other DB error
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save draft"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": id, "version": newVersion, "updatedAt": time.Now()})
}

type publishInput struct {
	ExpectedDraftVersion int `json:"expectedDraftVersion" binding:"required"`
}

func (h *Handler) AdminPublish(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}
	var input publishInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	userID, ok := getUserID(c)
	if !ok {
		return
	}
	if err := h.pageSvc.Publish(c.Request.Context(), id, input.ExpectedDraftVersion, userID); err != nil {
		if errors.Is(err, service.ErrPageVersionConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": "draft version conflict"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	page, _ := h.pageRepo.FindByID(c.Request.Context(), id)
	c.JSON(http.StatusOK, gin.H{
		"id":               page.ID,
		"publishedVersion": page.PublishedVersion,
		"publishedAt":      page.PublishedAt,
	})
}

func (h *Handler) AdminUnpublish(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}
	if err := h.pageSvc.Unpublish(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": id, "status": "draft"})
}

type rollbackInput struct {
	TargetVersion int `json:"targetVersion" binding:"required"`
}

func (h *Handler) AdminRollback(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}
	var input rollbackInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	userID, ok := getUserID(c)
	if !ok {
		return
	}
	if err := h.pageSvc.Rollback(c.Request.Context(), id, input.TargetVersion, userID); err != nil {
		if errors.Is(err, service.ErrVersionNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "version not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	page, _ := h.pageRepo.FindByID(c.Request.Context(), id)
	c.JSON(http.StatusOK, gin.H{
		"id":               page.ID,
		"publishedVersion": page.PublishedVersion,
		"publishedAt":      page.PublishedAt,
	})
}

func (h *Handler) AdminDelete(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}
	if err := h.pageRepo.Delete(c.Request.Context(), id); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "page not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

// --- Helpers ---

func parseID(c *gin.Context) (uint, error) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return 0, err
	}
	return uint(id), nil
}

func localizedField(zh, en, locale string) string {
	if locale == "en" && en != "" {
		return en
	}
	return zh
}
```

- [ ] **Step 2: Verify it compiles**

The handler uses `middleware.GetUserContext(c)` from `blotting-consultancy/internal/middleware` to extract the authenticated user. The `getUserID` helper returns `(uint, bool)` and writes 401 on failure.

```bash
cd /home/dev/impress/backend && go build ./internal/handler/unified_page/
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /home/dev/impress/backend
git add internal/handler/unified_page/
git commit -m "feat: add unified page handler with draft/publish/rollback endpoints"
```

### Task 12: Create page template handler

**Files:**
- Create: `backend/internal/handler/page_template/handler.go`

- [ ] **Step 1: Implement template CRUD handler**

```go
// backend/internal/handler/page_template/handler.go
package page_template

import (
	"errors"
	"net/http"
	"strconv"

	"blotting-consultancy/internal/model"
	"blotting-consultancy/internal/repository"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct {
	tmplRepo repository.PageTemplateRepository
}

func NewHandler(tmplRepo repository.PageTemplateRepository) *Handler {
	return &Handler{tmplRepo: tmplRepo}
}

func (h *Handler) List(c *gin.Context) {
	category := c.Query("category")
	templates, err := h.tmplRepo.List(c.Request.Context(), category)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list templates"})
		return
	}
	c.JSON(http.StatusOK, templates)
}

type createInput struct {
	Key           string        `json:"key" binding:"required"`
	NameZh        string        `json:"nameZh" binding:"required"`
	NameEn        string        `json:"nameEn"`
	DescriptionZh string        `json:"descriptionZh"`
	DescriptionEn string        `json:"descriptionEn"`
	Config        model.JSONMap `json:"config" binding:"required"`
	Thumbnail     string        `json:"thumbnail"`
}

func (h *Handler) Create(c *gin.Context) {
	var input createInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tmpl := &model.PageTemplate{
		Key:           input.Key,
		NameZh:        input.NameZh,
		NameEn:        input.NameEn,
		DescriptionZh: input.DescriptionZh,
		DescriptionEn: input.DescriptionEn,
		Category:      model.TemplateCategoryCustom,
		Config:        input.Config,
		Thumbnail:     input.Thumbnail,
	}
	if err := h.tmplRepo.Create(c.Request.Context(), tmpl); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, tmpl)
}

func (h *Handler) Update(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}
	existing, err := h.tmplRepo.FindByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "template not found"})
		return
	}
	if existing.Category == model.TemplateCategoryBuiltin {
		c.JSON(http.StatusForbidden, gin.H{"error": "builtin templates cannot be modified"})
		return
	}
	var input createInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	existing.NameZh = input.NameZh
	existing.NameEn = input.NameEn
	existing.DescriptionZh = input.DescriptionZh
	existing.DescriptionEn = input.DescriptionEn
	existing.Config = input.Config
	existing.Thumbnail = input.Thumbnail
	if err := h.tmplRepo.Update(c.Request.Context(), existing); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, existing)
}

func (h *Handler) Delete(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}
	existing, err := h.tmplRepo.FindByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "template not found"})
		return
	}
	if existing.Category == model.TemplateCategoryBuiltin {
		c.JSON(http.StatusForbidden, gin.H{"error": "builtin templates cannot be deleted"})
		return
	}
	if err := h.tmplRepo.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func (h *Handler) Duplicate(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}
	existing, err := h.tmplRepo.FindByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "template not found"})
		return
	}
	dup := &model.PageTemplate{
		Key:           existing.Key + "-copy",
		NameZh:        existing.NameZh + " (副本)",
		NameEn:        existing.NameEn + " (Copy)",
		DescriptionZh: existing.DescriptionZh,
		DescriptionEn: existing.DescriptionEn,
		Category:      model.TemplateCategoryCustom,
		Config:        existing.Config,
		Thumbnail:     existing.Thumbnail,
	}
	if err := h.tmplRepo.Create(c.Request.Context(), dup); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, dup)
}

func parseID(c *gin.Context) (uint, error) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return 0, err
	}
	return uint(id), nil
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /home/dev/impress/backend && go build ./internal/handler/page_template/
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /home/dev/impress/backend
git add internal/handler/page_template/
git commit -m "feat: add page template handler with CRUD and duplicate"
```

### Task 13: Create version history endpoints

**Files:**
- Add to: `backend/internal/handler/unified_page/handler.go`

- [ ] **Step 1: Add version list and detail methods to the handler**

> **Note:** The `Handler` struct and `NewHandler` constructor already include `versionRepo` from Task 11. This step only adds methods.

```go
func (h *Handler) AdminListVersions(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	if page < 1 { page = 1 }
	if pageSize < 1 { pageSize = 20 }
	offset := (page - 1) * pageSize

	versions, total, err := h.versionRepo.ListByPageID(c.Request.Context(), id, offset, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list versions"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": versions, "total": total})
}

func (h *Handler) AdminGetVersionDetail(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}
	versionNum, err := strconv.Atoi(c.Param("version"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid version"})
		return
	}
	version, err := h.versionRepo.FindByPageIDAndVersion(c.Request.Context(), id, versionNum)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "version not found"})
		return
	}
	c.JSON(http.StatusOK, version)
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /home/dev/impress/backend && go build ./internal/handler/unified_page/
```

- [ ] **Step 3: Commit**

```bash
git add backend/internal/handler/unified_page/handler.go
git commit -m "feat: add version history list and detail to unified page handler"
```

### Task 14: Wire new handlers into main.go

**Files:**
- Modify: `backend/cmd/server/main.go`

- [ ] **Step 1: Add repository and handler instantiation**

In the imports section of `main.go`, add:

```go
unifiedPageHandler "blotting-consultancy/internal/handler/unified_page"
pageTemplateHandler "blotting-consultancy/internal/handler/page_template"
```

In the repository instantiation section of `main.go`, add:

```go
unifiedPageRepo := repository.NewGormUnifiedPageRepository(database.DB)
pageVersionRepo := repository.NewGormPageVersionRepository(database.DB)
pageTemplateRepo := repository.NewGormPageTemplateRepository(database.DB)
siteConfigRepo := repository.NewGormSiteConfigRepository(database.DB)
```

In the service/handler instantiation section, add:

```go
unifiedPageSvc := service.NewUnifiedPageService(unifiedPageRepo, pageVersionRepo)
unifiedPageHdl := unifiedPageHandler.NewHandler(unifiedPageRepo, pageVersionRepo, unifiedPageSvc)
pageTemplateHdl := pageTemplateHandler.NewHandler(pageTemplateRepo)
```

- [ ] **Step 2: Add routes (keep old routes for now)**

Add new routes alongside existing ones (old routes remain during migration):

```go
// Public - unified pages (new)
public.GET("/unified-pages", unifiedPageHdl.PublicList)
public.GET("/unified-pages/:slug", unifiedPageHdl.PublicGetBySlug)

// Admin - unified pages (new)
adminGroup.GET("/unified-pages", unifiedPageHdl.AdminList)
adminGroup.GET("/unified-pages/:id", unifiedPageHdl.AdminGetByID)
adminGroup.POST("/unified-pages", unifiedPageHdl.AdminCreate)
adminGroup.GET("/unified-pages/:id/draft", unifiedPageHdl.AdminGetDraft)
adminGroup.PUT("/unified-pages/:id/draft", unifiedPageHdl.AdminUpdateDraft)
adminGroup.POST("/unified-pages/:id/publish", unifiedPageHdl.AdminPublish)
adminGroup.POST("/unified-pages/:id/unpublish", unifiedPageHdl.AdminUnpublish)
adminGroup.POST("/unified-pages/:id/rollback", unifiedPageHdl.AdminRollback)
adminGroup.GET("/unified-pages/:id/versions", unifiedPageHdl.AdminListVersions)
adminGroup.GET("/unified-pages/:id/versions/:version", unifiedPageHdl.AdminGetVersionDetail)
adminGroup.DELETE("/unified-pages/:id", unifiedPageHdl.AdminDelete)

// Admin - templates
adminGroup.GET("/templates", pageTemplateHdl.List)
adminGroup.POST("/templates", pageTemplateHdl.Create)
adminGroup.PUT("/templates/:id", pageTemplateHdl.Update)
adminGroup.DELETE("/templates/:id", pageTemplateHdl.Delete)
adminGroup.POST("/templates/:id/duplicate", pageTemplateHdl.Duplicate)
```

Note: Using `/unified-pages` prefix temporarily to avoid conflicts with existing `/pages` routes. In the cleanup chunk, old routes are removed and new routes renamed to `/pages`.

- [ ] **Step 3: Verify it compiles and starts**

```bash
cd /home/dev/impress/backend && go build -o server ./cmd/server/
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add backend/cmd/server/main.go
git commit -m "feat: wire unified page and template handlers into main.go"
```

- [ ] **Step 5: Run full backend verification**

```bash
cd /home/dev/impress/backend && go vet ./... && go test -v -race ./...
```

Expected: All pass.

---

## Chunk 5: Frontend Type Updates & Rendering

### Task 15: Update SectionData and SectionProps types

**Files:**
- Modify: `frontend/src/theme/types.ts`

- [ ] **Step 1: Add variant and locked to SectionData**

```typescript
// frontend/src/theme/types.ts — add variant and locked fields
export interface SectionData {
  id: string;
  type: string;
  variant?: string;   // layout variant key, defaults to "default"
  locked?: boolean;    // true in template mode — cannot move/delete
  data: Record<string, unknown>;
  settings?: SectionSettings;
}
```

Keep all other interfaces unchanged.

- [ ] **Step 2: Add variant to SectionProps**

```typescript
export interface SectionProps<T = Record<string, unknown>> {
  data: T;
  settings?: SectionSettings;
  variant?: string;
}
```

- [ ] **Step 3: Run lint and type-check**

```bash
pnpm lint && pnpm type-check
```

Expected: PASS (new optional fields are backward-compatible).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/theme/types.ts
git commit -m "feat: add variant and locked fields to SectionData/SectionProps"
```

### Task 16: Update SectionRenderer for variant dispatch

**Files:**
- Modify: `frontend/src/theme/sections/SectionRenderer.tsx`

- [ ] **Step 1: Pass variant to section components**

Update the render line to include variant:

```tsx
// In SectionRenderer, change:
<Component data={section.data} settings={section.settings} />
// To:
<Component data={section.data} settings={section.settings} variant={section.variant} />
```

- [ ] **Step 2: Run lint and type-check**

```bash
pnpm lint && pnpm type-check
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/theme/sections/SectionRenderer.tsx
git commit -m "feat: pass variant prop through SectionRenderer"
```

### Task 17: Create useLocalizedData hook

**Files:**
- Create: `frontend/src/theme/hooks/useLocalizedData.ts`

- [ ] **Step 1: Implement the hook**

```typescript
// frontend/src/theme/hooks/useLocalizedData.ts
// NOTE: useMemo and useTranslation are auto-imported — do NOT add explicit imports

type LocalizedValue = { zh?: string; en?: string } | string;

/**
 * Recursively resolves { zh, en } objects in section data to the current locale string.
 * Passes through non-localized values unchanged.
 */
export function useLocalizedData<T extends Record<string, unknown>>(data: T): T {
  const { i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en" : "zh";

  return useMemo(() => resolveLocale(data, locale) as T, [data, locale]);
}

function resolveLocale(value: unknown, locale: string): unknown {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((item) => resolveLocale(item, locale));
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // Check if this is a { zh, en } localized object
    if (isLocalizedValue(obj)) {
      const localized = obj as { zh?: string; en?: string };
      return (locale === "en" ? localized.en : localized.zh) ?? localized.zh ?? "";
    }
    // Recurse into nested objects
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = resolveLocale(val, locale);
    }
    return result;
  }

  return value;
}

function isLocalizedValue(obj: Record<string, unknown>): boolean {
  const keys = Object.keys(obj);
  return (
    keys.length <= 2 &&
    keys.every((k) => k === "zh" || k === "en") &&
    keys.some((k) => typeof obj[k] === "string" || obj[k] === undefined || obj[k] === null)
  );
}
```

- [ ] **Step 2: Run lint and type-check**

```bash
pnpm lint && pnpm type-check
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/theme/hooks/useLocalizedData.ts
git commit -m "feat: add useLocalizedData hook for bilingual section data"
```

### Task 18: Create unified pages API client

**Files:**
- Create: `frontend/src/api/unifiedPages.ts`

- [ ] **Step 1: Implement API client**

```typescript
// frontend/src/api/unifiedPages.ts
import http from "./http";

// JSON config type — matches backend JSONMap
type JSONMap = Record<string, unknown>;

export interface UnifiedPageItem {
  id: number;
  slug: string;
  zhTitle: string;
  enTitle: string;
  mode: "template" | "composable";
  templateId?: number;
  status: string;
  sortOrder: number;
  showInNav: boolean;
  parentId?: number;
  publishedVersion: number;
  draftVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface UnifiedPageDraft {
  id: number;
  slug: string;
  config: JSONMap;
  version: number;
  publishedVersion: number;
  updatedAt: string;
}

export interface CreateUnifiedPageRequest {
  slug: string;
  zhTitle?: string;
  enTitle?: string;
  mode: "template" | "composable";
  templateId?: number;
  draftConfig?: JSONMap;
  sortOrder?: number;
  showInNav?: boolean;
  parentId?: number;
}

// Admin CRUD
export const listUnifiedPages = (status?: string, mode?: string) => {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (mode) params.set("mode", mode);
  return http.get<UnifiedPageItem[]>(`/admin/unified-pages?${params}`).then((r) => r.data);
};

export const getUnifiedPage = (id: number) =>
  http.get<UnifiedPageItem>(`/admin/unified-pages/${id}`).then((r) => r.data);

export const createUnifiedPage = (data: CreateUnifiedPageRequest) =>
  http.post<UnifiedPageItem>("/admin/unified-pages", data).then((r) => r.data);

export const deleteUnifiedPage = (id: number) =>
  http.delete(`/admin/unified-pages/${id}`);

// Draft
export const getUnifiedPageDraft = (id: number) =>
  http.get<UnifiedPageDraft>(`/admin/unified-pages/${id}/draft`).then((r) => r.data);

export const updateUnifiedPageDraft = (id: number, version: number, config: JSONMap) =>
  http.put(`/admin/unified-pages/${id}/draft`, { config }, {
    headers: { "If-Match": String(version) },
  }).then((r) => r.data);

// Publish / Unpublish / Rollback
export const publishUnifiedPage = (id: number, expectedDraftVersion: number) =>
  http.post(`/admin/unified-pages/${id}/publish`, { expectedDraftVersion }).then((r) => r.data);

export const unpublishUnifiedPage = (id: number) =>
  http.post(`/admin/unified-pages/${id}/unpublish`).then((r) => r.data);

export const rollbackUnifiedPage = (id: number, targetVersion: number) =>
  http.post(`/admin/unified-pages/${id}/rollback`, { targetVersion }).then((r) => r.data);

// Version history
export const listUnifiedPageVersions = (id: number, page = 1, pageSize = 20) =>
  http.get(`/admin/unified-pages/${id}/versions?page=${page}&pageSize=${pageSize}`).then((r) => r.data);

export const getUnifiedPageVersion = (id: number, version: number) =>
  http.get(`/admin/unified-pages/${id}/versions/${version}`).then((r) => r.data);
```

- [ ] **Step 2: Run lint and type-check**

```bash
pnpm lint && pnpm type-check
```

Expected: PASS (may need to check if `JSONMap` type exists in `api/types` or define it as `Record<string, unknown>`).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/unifiedPages.ts
git commit -m "feat: add unified pages API client with draft/publish/version support"
```

### Task 19: Create templates API client

**Files:**
- Create: `frontend/src/api/templates.ts`

- [ ] **Step 1: Implement API client**

```typescript
// frontend/src/api/templates.ts
import http from "./http";

export interface PageTemplate {
  id: number;
  key: string;
  nameZh: string;
  nameEn: string;
  descriptionZh: string;
  descriptionEn: string;
  category: "builtin" | "custom" | "theme";
  config: Record<string, unknown>;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

export const listTemplates = (category?: string) => {
  const params = category ? `?category=${category}` : "";
  return http.get<PageTemplate[]>(`/admin/templates${params}`).then((r) => r.data);
};

export const createTemplate = (data: Omit<PageTemplate, "id" | "category" | "createdAt" | "updatedAt">) =>
  http.post<PageTemplate>("/admin/templates", data).then((r) => r.data);

export const updateTemplate = (id: number, data: Partial<PageTemplate>) =>
  http.put<PageTemplate>(`/admin/templates/${id}`, data).then((r) => r.data);

export const deleteTemplate = (id: number) =>
  http.delete(`/admin/templates/${id}`);

export const duplicateTemplate = (id: number) =>
  http.post<PageTemplate>(`/admin/templates/${id}/duplicate`).then((r) => r.data);
```

- [ ] **Step 2: Run lint and type-check**

```bash
pnpm lint && pnpm type-check
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/templates.ts
git commit -m "feat: add page templates API client"
```

- [ ] **Step 4: Run full frontend verification**

```bash
pnpm lint && pnpm type-check
```

Expected: All pass.

---

## Chunk 6: Data Migration

### Task 20: Write Go migration function for content documents

**Files:**
- Create: `backend/internal/service/page_migration_service.go`
- Create: `backend/internal/service/page_migration_service_test.go`

This is the most complex task. The migration service converts:
1. 7 content document pages → unified pages with template mode
2. Existing block pages → unified pages with composable mode
3. `global` and `theme` content documents → SiteConfig rows
4. Content version history → page versions

- [ ] **Step 1: Write test for content document config conversion**

```go
// backend/internal/service/page_migration_service_test.go
package service_test

import (
	"testing"

	"blotting-consultancy/internal/model"
	"blotting-consultancy/internal/service"
)

func TestConvertContentDocConfig_Home(t *testing.T) {
	// Simulated home page content document config (object-keyed)
	input := model.JSONMap{
		"hero": map[string]interface{}{
			"title":           map[string]interface{}{"zh": "印迹法规", "en": "Blotting"},
			"subtitle":        map[string]interface{}{"zh": "专业服务", "en": "Professional"},
			"backgroundImage": "/uploads/hero.jpg",
		},
		"about": map[string]interface{}{
			"title":        map[string]interface{}{"zh": "关于我们", "en": "About Us"},
			"descriptions": []interface{}{map[string]interface{}{"zh": "描述1", "en": "Desc1"}},
			"image":        "/uploads/about.jpg",
		},
	}

	result := service.ConvertContentDocToSections("home", input)
	sections, ok := result["sections"].([]interface{})
	if !ok {
		t.Fatal("expected sections array")
	}
	if len(sections) < 2 {
		t.Fatalf("expected at least 2 sections, got %d", len(sections))
	}

	// First section should be hero
	hero := sections[0].(map[string]interface{})
	if hero["type"] != "hero" {
		t.Errorf("expected first section type 'hero', got %v", hero["type"])
	}
	heroData := hero["data"].(map[string]interface{})
	title := heroData["title"].(map[string]interface{})
	if title["zh"] != "印迹法规" {
		t.Errorf("expected zh title '印迹法规', got %v", title["zh"])
	}
}

func TestConvertBlockPageConfig_WrapsBilingualFields(t *testing.T) {
	// Simulated block page section data (flat strings)
	input := model.JSONMap{
		"sections": []interface{}{
			map[string]interface{}{
				"id":   "abc",
				"type": "hero",
				"data": map[string]interface{}{
					"title":           "关于我们",
					"subtitle":        "About Us",
					"backgroundImage": "/uploads/hero.jpg",
				},
				"settings": map[string]interface{}{"padding": "lg"},
			},
		},
	}

	result := service.ConvertBlockPageToUnified(input)
	sections := result["sections"].([]interface{})
	hero := sections[0].(map[string]interface{})
	heroData := hero["data"].(map[string]interface{})

	// title should now be {zh, en}
	title, ok := heroData["title"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected title to be bilingual object, got %T", heroData["title"])
	}
	if title["zh"] != "关于我们" {
		t.Errorf("expected zh '关于我们', got %v", title["zh"])
	}
	if title["en"] != "" {
		t.Errorf("expected en to be empty, got %v", title["en"])
	}

	// backgroundImage should NOT be wrapped (non-localizable)
	if _, ok := heroData["backgroundImage"].(string); !ok {
		t.Errorf("expected backgroundImage to remain a string")
	}

	// variant should be added
	if hero["variant"] != "default" {
		t.Errorf("expected variant 'default', got %v", hero["variant"])
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/dev/impress/backend && go test -v -run TestConvert ./internal/service/
```

Expected: FAIL — functions not found.

- [ ] **Step 3: Implement migration service**

```go
// backend/internal/service/page_migration_service.go
package service

import (
	"crypto/rand"
	"fmt"

	"blotting-consultancy/internal/model"
)

// contentDocSectionMapping defines which top-level keys in content doc configs
// map to which section types for each page key.
type sectionMapping struct {
	Key         string // top-level key in content doc config
	SectionType string
	Variant     string
}

var pageKeyMappings = map[string][]sectionMapping{
	"home": {
		{Key: "hero", SectionType: "hero", Variant: "fullscreen"},
		{Key: "advantages", SectionType: "card-grid", Variant: "three-column"},
		{Key: "about", SectionType: "company-profile", Variant: "default"},
		{Key: "services", SectionType: "service-cards", Variant: "default"},
		{Key: "team", SectionType: "team-grid", Variant: "default"},
		{Key: "contact", SectionType: "contact-form", Variant: "default"},
	},
	"about": {
		{Key: "hero", SectionType: "hero", Variant: "fullscreen"},
		{Key: "companyProfile", SectionType: "company-profile", Variant: "default"},
		{Key: "history", SectionType: "rich-text", Variant: "default"},
		{Key: "team", SectionType: "team-grid", Variant: "default"},
	},
	"advantages": {
		{Key: "hero", SectionType: "hero", Variant: "fullscreen"},
		{Key: "advantages", SectionType: "checklist", Variant: "default"},
	},
	"core-services": {
		{Key: "hero", SectionType: "hero", Variant: "fullscreen"},
		{Key: "services", SectionType: "service-cards", Variant: "default"},
		{Key: "richText", SectionType: "rich-text", Variant: "default"},
	},
	"cases": {
		{Key: "hero", SectionType: "hero", Variant: "fullscreen"},
		{Key: "cases", SectionType: "card-grid", Variant: "default"},
	},
	"experts": {
		{Key: "hero", SectionType: "hero", Variant: "fullscreen"},
		{Key: "team", SectionType: "team-grid", Variant: "default"},
	},
	"contact": {
		{Key: "hero", SectionType: "hero", Variant: "fullscreen"},
		{Key: "contact", SectionType: "contact-form", Variant: "default"},
		{Key: "map", SectionType: "text-image", Variant: "default"},
	},
}

// localizableFieldsBySection maps section type → list of dot-paths to wrap in {zh, en}.
var localizableFieldsBySection = map[string][]string{
	"hero":            {"title", "subtitle", "cta.text"},
	"card-grid":       {"title", "subtitle", "cards[].title", "cards[].description"},
	"rich-text":       {"content", "title"},
	"contact-form":    {"title", "subtitle", "submitText", "fields[].label", "fields[].placeholder"},
	"service-cards":   {"title", "subtitle", "cards[].title", "cards[].description"},
	"team-grid":       {"title", "subtitle", "members[].name", "members[].role", "members[].bio"},
	"text-image":      {"title", "text"},
	"checklist":       {"title", "items[].title", "items[].description"},
	"company-profile": {"title", "description", "stats[].label"},
}

// ConvertContentDocToSections transforms a content document's object-keyed config
// into the unified sections array format.
func ConvertContentDocToSections(pageKey string, config model.JSONMap) model.JSONMap {
	mappings, ok := pageKeyMappings[pageKey]
	if !ok {
		return model.JSONMap{"sections": []any{}}
	}

	sections := make([]any, 0, len(mappings))
	for _, m := range mappings {
		data, exists := config[m.Key]
		if !exists {
			continue
		}
		dataMap, ok := data.(map[string]interface{})
		if !ok {
			continue
		}
		section := map[string]interface{}{
			"id":       generateID(),
			"type":     m.SectionType,
			"variant":  m.Variant,
			"locked":   true,
			"data":     dataMap,
			"settings": map[string]interface{}{"background": "surface", "padding": "lg", "hidden": false},
		}
		sections = append(sections, section)
	}

	result := model.JSONMap{"sections": sections}
	if tokens, ok := config["tokens"]; ok {
		result["tokens"] = tokens
	}
	return result
}

// ConvertBlockPageToUnified adds variant/locked fields to each section
// and wraps localizable string fields in {zh, en} objects.
func ConvertBlockPageToUnified(config model.JSONMap) model.JSONMap {
	sectionsRaw, ok := config["sections"]
	if !ok {
		return config
	}
	sections, ok := sectionsRaw.([]interface{})
	if !ok {
		return config
	}

	converted := make([]interface{}, 0, len(sections))
	for _, s := range sections {
		section, ok := s.(map[string]interface{})
		if !ok {
			converted = append(converted, s)
			continue
		}
		// Add variant/locked defaults
		if _, has := section["variant"]; !has {
			section["variant"] = "default"
		}
		if _, has := section["locked"]; !has {
			section["locked"] = false
		}
		// Wrap localizable fields in data
		sectionType, _ := section["type"].(string)
		if data, ok := section["data"].(map[string]interface{}); ok {
			if paths, exists := localizableFieldsBySection[sectionType]; exists {
				wrapLocalizable(data, paths)
			}
			section["data"] = data
		}
		converted = append(converted, section)
	}

	result := model.JSONMap{"sections": converted}
	if tokens, ok := config["tokens"]; ok {
		result["tokens"] = tokens
	}
	return result
}

// wrapLocalizable wraps string fields at the given dot-paths in {zh: value, en: ""} objects.
// Supports simple paths ("title"), nested ("cta.text"), and array ("cards[].title").
func wrapLocalizable(data map[string]interface{}, paths []string) {
	for _, path := range paths {
		wrapPath(data, path)
	}
}

func wrapPath(obj map[string]interface{}, path string) {
	// Split on first "."
	for i := 0; i < len(path); i++ {
		if path[i] == '.' {
			key := path[:i]
			rest := path[i+1:]
			if sub, ok := obj[key].(map[string]interface{}); ok {
				wrapPath(sub, rest)
			}
			return
		}
		// Handle array notation: "cards[].title"
		if i+1 < len(path) && path[i] == '[' && path[i+1] == ']' {
			key := path[:i]
			rest := path[i+3:] // skip "[]."
			if arr, ok := obj[key].([]interface{}); ok {
				for _, item := range arr {
					if m, ok := item.(map[string]interface{}); ok {
						wrapPath(m, rest)
					}
				}
			}
			return
		}
	}
	// Leaf field — wrap if it's a plain string
	if val, ok := obj[path].(string); ok {
		obj[path] = map[string]interface{}{"zh": val, "en": ""}
	}
}

// UnwrapLocalizable reverses wrapLocalizable — extracts "zh" value back to flat string.
// Used for down migration.
func UnwrapLocalizable(data map[string]interface{}, sectionType string) {
	paths, exists := localizableFieldsBySection[sectionType]
	if !exists {
		return
	}
	for _, path := range paths {
		unwrapPath(data, path)
	}
}

func unwrapPath(obj map[string]interface{}, path string) {
	for i := 0; i < len(path); i++ {
		if path[i] == '.' {
			key := path[:i]
			rest := path[i+1:]
			if sub, ok := obj[key].(map[string]interface{}); ok {
				unwrapPath(sub, rest)
			}
			return
		}
		if i+1 < len(path) && path[i] == '[' && path[i+1] == ']' {
			key := path[:i]
			rest := path[i+3:]
			if arr, ok := obj[key].([]interface{}); ok {
				for _, item := range arr {
					if m, ok := item.(map[string]interface{}); ok {
						unwrapPath(m, rest)
					}
				}
			}
			return
		}
	}
	if m, ok := obj[path].(map[string]interface{}); ok {
		if zh, ok := m["zh"]; ok {
			zhStr, _ := zh.(string)
			obj[path] = zhStr
		}
	}
}

// generateID creates a random hex ID for sections.
func generateID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return fmt.Sprintf("%x", b)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/dev/impress/backend && go test -v -run TestConvert ./internal/service/
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /home/dev/impress/backend
git add internal/service/page_migration_service.go internal/service/page_migration_service_test.go
git commit -m "feat: add page migration service with config conversion logic"
```

### Task 21: Write goose migration to execute data migration

**Files:**
- Create: `backend/internal/db/migrations/00008_unified_pages.go`

- [ ] **Step 1: Create Go-based goose migration**

This migration:
1. Reads all `content_documents` rows
2. Creates `page_templates` for the 7 page-type docs
3. Creates `unified_pages` for each with deterministic IDs (1-7)
4. Migrates `content_versions` → `page_versions`
5. Reads all `pages` rows (non-theme-pages)
6. Creates `unified_pages` for each with auto-increment IDs starting from 100
7. Creates `site_configs` rows for `global` and `theme`

```go
// backend/internal/db/migrations/00008_unified_pages.go
package migrations

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"blotting-consultancy/internal/model"
	"blotting-consultancy/internal/service"
	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upUnifiedPages, downUnifiedPages)
}

func upUnifiedPages(ctx context.Context, tx *sql.Tx) error {
	// Tables are created by GORM AutoMigrate (runs before goose).
	// This migration only handles data transformation.

	// Step 1: Migrate global + theme content docs → site_configs
	for _, key := range []string{"global", "theme"} {
		row := tx.QueryRowContext(ctx,
			"SELECT draft_config, draft_version, published_config, published_version FROM content_documents WHERE page_key = ?", key)
		var draftJSON, pubJSON sql.NullString
		var draftVer, pubVer int
		if err := row.Scan(&draftJSON, &draftVer, &pubJSON, &pubVer); err != nil {
			if err == sql.ErrNoRows {
				continue
			}
			return fmt.Errorf("scan %s: %w", key, err)
		}
		_, err := tx.ExecContext(ctx,
			"INSERT INTO site_configs (key, draft_config, draft_version, published_config, published_version) VALUES (?, ?, ?, ?, ?)",
			key, draftJSON, draftVer, pubJSON, pubVer)
		if err != nil {
			return fmt.Errorf("insert site_config %s: %w", key, err)
		}
	}

	// Step 2: Migrate 7 page-type content docs → page_templates + unified_pages
	pageKeyIDs := map[string]int{
		"home": 1, "about": 2, "advantages": 3, "core-services": 4,
		"cases": 5, "experts": 6, "contact": 7,
	}

	rows, err := tx.QueryContext(ctx,
		"SELECT page_key, draft_config, draft_version, published_config, published_version FROM content_documents WHERE page_key NOT IN ('global', 'theme')")
	if err != nil {
		return fmt.Errorf("query content_documents: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var pageKey string
		var draftJSON, pubJSON sql.NullString
		var draftVer, pubVer int
		if err := rows.Scan(&pageKey, &draftJSON, &draftVer, &pubJSON, &pubVer); err != nil {
			return fmt.Errorf("scan content_doc: %w", err)
		}
		assignedID, ok := pageKeyIDs[pageKey]
		if !ok {
			continue
		}

		// Parse and convert draft config
		var draftConfig model.JSONMap
		if draftJSON.Valid {
			json.Unmarshal([]byte(draftJSON.String), &draftConfig)
			draftConfig = service.ConvertContentDocToSections(pageKey, draftConfig)
		}
		// Parse and convert published config
		var pubConfig model.JSONMap
		if pubJSON.Valid {
			json.Unmarshal([]byte(pubJSON.String), &pubConfig)
			pubConfig = service.ConvertContentDocToSections(pageKey, pubConfig)
		}

		draftBytes, _ := json.Marshal(draftConfig)
		pubBytes, _ := json.Marshal(pubConfig)

		// Insert page template
		_, err = tx.ExecContext(ctx,
			"INSERT INTO page_templates (key, name_zh, name_en, category, config) VALUES (?, ?, ?, 'builtin', ?)",
			pageKey, pageKey+"模板", pageKey+" template", string(draftBytes))
		if err != nil {
			return fmt.Errorf("insert template %s: %w", pageKey, err)
		}

		// Get the template ID just inserted
		var templateID int
		tx.QueryRowContext(ctx, "SELECT id FROM page_templates WHERE key = ?", pageKey).Scan(&templateID)

		// Determine status
		status := "draft"
		if pubVer > 0 {
			status = "published"
		}

		// Insert unified page with deterministic ID
		_, err = tx.ExecContext(ctx,
			`INSERT INTO unified_pages (id, slug, zh_title, en_title, mode, template_id,
			draft_config, draft_version, published_config, published_version, status, show_in_nav, sort_order)
			VALUES (?, ?, ?, '', 'template', ?, ?, ?, ?, ?, ?, true, ?)`,
			assignedID, pageKey, pageKey, templateID, string(draftBytes), draftVer, string(pubBytes), pubVer, status, assignedID)
		if err != nil {
			return fmt.Errorf("insert unified_page %s: %w", pageKey, err)
		}
	}

	// Step 3: Migrate content_versions → page_versions
	versionRows, err := tx.QueryContext(ctx,
		"SELECT page_key, version, config, created_by, created_at FROM content_versions")
	if err != nil {
		return fmt.Errorf("query content_versions: %w", err)
	}
	defer versionRows.Close()

	for versionRows.Next() {
		var pageKey string
		var version, createdBy int
		var configJSON string
		var createdAt time.Time
		if err := versionRows.Scan(&pageKey, &version, &configJSON, &createdBy, &createdAt); err != nil {
			return fmt.Errorf("scan content_version: %w", err)
		}
		pageID, ok := pageKeyIDs[pageKey]
		if !ok {
			continue // skip global/theme versions
		}
		var config model.JSONMap
		json.Unmarshal([]byte(configJSON), &config)
		converted := service.ConvertContentDocToSections(pageKey, config)
		convertedBytes, _ := json.Marshal(converted)

		_, err = tx.ExecContext(ctx,
			"INSERT INTO page_versions (page_id, version, config, created_by, created_at) VALUES (?, ?, ?, ?, ?)",
			pageID, version, string(convertedBytes), createdBy, createdAt)
		if err != nil {
			return fmt.Errorf("insert page_version: %w", err)
		}
	}

	// Step 4: Migrate block pages → unified_pages (IDs starting from 100)
	blockRows, err := tx.QueryContext(ctx,
		"SELECT id, slug, title, config, status, sort_order, show_in_nav FROM pages WHERE is_theme_page = false OR is_theme_page IS NULL")
	if err != nil {
		return fmt.Errorf("query pages: %w", err)
	}
	defer blockRows.Close()

	nextID := 100
	for blockRows.Next() {
		var oldID int
		var slug, titleJSON, configJSON, status string
		var sortOrder int
		var showInNav bool
		if err := blockRows.Scan(&oldID, &slug, &titleJSON, &configJSON, &status, &sortOrder, &showInNav); err != nil {
			return fmt.Errorf("scan page: %w", err)
		}

		// Parse and convert config (add variant/locked, wrap localizable fields)
		var config model.JSONMap
		json.Unmarshal([]byte(configJSON), &config)
		converted := service.ConvertBlockPageToUnified(config)
		convertedBytes, _ := json.Marshal(converted)

		// Parse bilingual title
		var zhTitle, enTitle string
		var titleMap map[string]interface{}
		if json.Unmarshal([]byte(titleJSON), &titleMap) == nil {
			zhTitle, _ = titleMap["zh"].(string)
			enTitle, _ = titleMap["en"].(string)
		} else {
			zhTitle = titleJSON // fallback: treat as raw string
		}

		pubConfig := sql.NullString{Valid: false}
		pubVersion := 0
		if status == "published" {
			pubConfig = sql.NullString{String: string(convertedBytes), Valid: true}
			pubVersion = 1
		}

		_, err = tx.ExecContext(ctx,
			`INSERT INTO unified_pages (id, slug, zh_title, en_title, mode, draft_config, draft_version,
			published_config, published_version, status, sort_order, show_in_nav)
			VALUES (?, ?, ?, ?, 'composable', ?, 1, ?, ?, ?, ?, ?)`,
			nextID, slug, zhTitle, enTitle, string(convertedBytes), pubConfig, pubVersion, status, sortOrder, showInNav)
		if err != nil {
			return fmt.Errorf("insert unified_page (block) %s: %w", slug, err)
		}
		nextID++
	}

	return nil
}

func downUnifiedPages(ctx context.Context, tx *sql.Tx) error {
	// Reverse: delete from unified_pages, page_versions, page_templates, site_configs
	// (Old tables remain intact since we haven't dropped them)
	_, err := tx.ExecContext(ctx, "DELETE FROM page_versions")
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, "DELETE FROM unified_pages")
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, "DELETE FROM page_templates")
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, "DELETE FROM site_configs")
	return err
}
```

**Note:** The migration uses raw SQL for reads/inserts but calls `service.ConvertContentDocToSections` and `service.ConvertBlockPageToUnified` for in-memory config transformation.

- [ ] **Step 2: Write integration test for the migration**

```go
// backend/internal/db/migrations/00008_unified_pages_test.go
package migrations_test

import (
	"database/sql"
	"encoding/json"
	"testing"

	_ "github.com/mattn/go-sqlite3"
)

func TestMigration_UpUnifiedPages(t *testing.T) {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	// Create old tables with seed data
	setupOldTables(t, db)
	seedContentDocuments(t, db)
	seedBlockPages(t, db)

	// Create new tables (simulating AutoMigrate)
	createNewTables(t, db)

	// Run migration in a transaction
	tx, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	// Call upUnifiedPages directly (exported for testing or via goose)
	// Alternatively: goose.Up(db, ".")

	tx.Commit()

	// Verify site_configs
	var count int
	db.QueryRow("SELECT COUNT(*) FROM site_configs").Scan(&count)
	if count != 2 {
		t.Errorf("expected 2 site_configs, got %d", count)
	}

	// Verify unified_pages (7 from content docs + block pages)
	db.QueryRow("SELECT COUNT(*) FROM unified_pages WHERE mode = 'template'").Scan(&count)
	if count != 7 {
		t.Errorf("expected 7 template pages, got %d", count)
	}

	// Verify page_versions migrated
	db.QueryRow("SELECT COUNT(*) FROM page_versions").Scan(&count)
	if count == 0 {
		t.Error("expected page_versions to be populated")
	}

	// Verify a specific page's config has sections array
	var configJSON string
	db.QueryRow("SELECT draft_config FROM unified_pages WHERE slug = 'home'").Scan(&configJSON)
	var config map[string]interface{}
	json.Unmarshal([]byte(configJSON), &config)
	if _, ok := config["sections"]; !ok {
		t.Error("expected home page config to have sections array")
	}
}

func setupOldTables(t *testing.T, db *sql.DB) {
	t.Helper()
	_, err := db.Exec(`
		CREATE TABLE content_documents (
			page_key TEXT PRIMARY KEY, draft_config TEXT, draft_version INTEGER DEFAULT 1,
			published_config TEXT, published_version INTEGER DEFAULT 0
		);
		CREATE TABLE content_versions (
			id INTEGER PRIMARY KEY, page_key TEXT, version INTEGER,
			config TEXT, created_by INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
		CREATE TABLE pages (
			id INTEGER PRIMARY KEY, slug TEXT, title TEXT, config TEXT,
			status TEXT DEFAULT 'draft', sort_order INTEGER DEFAULT 0,
			show_in_nav INTEGER DEFAULT 0, is_theme_page INTEGER DEFAULT 0
		);
	`)
	if err != nil {
		t.Fatal(err)
	}
}

func seedContentDocuments(t *testing.T, db *sql.DB) {
	t.Helper()
	db.Exec(`INSERT INTO content_documents (page_key, draft_config, draft_version, published_config, published_version)
		VALUES ('home', '{"hero":{"title":{"zh":"首页","en":"Home"}}}', 1, '{"hero":{"title":{"zh":"首页","en":"Home"}}}', 1)`)
	db.Exec(`INSERT INTO content_documents (page_key, draft_config, draft_version) VALUES ('global', '{"siteName":"test"}', 1)`)
	db.Exec(`INSERT INTO content_documents (page_key, draft_config, draft_version) VALUES ('theme', '{"primaryColor":"#000"}', 1)`)
	// Add remaining page keys as needed for thorough testing
	for _, key := range []string{"about", "advantages", "core-services", "cases", "experts", "contact"} {
		db.Exec(`INSERT INTO content_documents (page_key, draft_config, draft_version) VALUES (?, '{}', 1)`, key)
	}
}

func seedBlockPages(t *testing.T, db *sql.DB) {
	t.Helper()
	db.Exec(`INSERT INTO pages (slug, title, config, status, sort_order, show_in_nav, is_theme_page)
		VALUES ('landing', '{"zh":"着陆页"}', '{"sections":[{"type":"hero","data":{"title":"测试"}}]}', 'published', 1, 1, 0)`)
}

func createNewTables(t *testing.T, db *sql.DB) {
	t.Helper()
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS unified_pages (
			id INTEGER PRIMARY KEY, slug TEXT UNIQUE, zh_title TEXT DEFAULT '', en_title TEXT DEFAULT '',
			zh_description TEXT DEFAULT '', en_description TEXT DEFAULT '', mode TEXT DEFAULT 'composable',
			template_id INTEGER, draft_config TEXT, draft_version INTEGER DEFAULT 1,
			published_config TEXT, published_version INTEGER DEFAULT 0, status TEXT DEFAULT 'draft',
			sort_order INTEGER DEFAULT 0, show_in_nav INTEGER DEFAULT 0, parent_id INTEGER,
			translation_status TEXT, zh_meta_title TEXT DEFAULT '', en_meta_title TEXT DEFAULT '',
			zh_meta_description TEXT DEFAULT '', en_meta_description TEXT DEFAULT '',
			zh_meta_keywords TEXT DEFAULT '', en_meta_keywords TEXT DEFAULT '',
			scheduled_at DATETIME, published_at DATETIME, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME
		);
		CREATE TABLE IF NOT EXISTS page_versions (
			id INTEGER PRIMARY KEY, page_id INTEGER, version INTEGER, config TEXT,
			created_by INTEGER, created_at DATETIME
		);
		CREATE TABLE IF NOT EXISTS page_templates (
			id INTEGER PRIMARY KEY, key TEXT UNIQUE, name_zh TEXT, name_en TEXT DEFAULT '',
			description_zh TEXT DEFAULT '', description_en TEXT DEFAULT '',
			category TEXT DEFAULT 'custom', config TEXT, thumbnail TEXT,
			created_at DATETIME, updated_at DATETIME
		);
		CREATE TABLE IF NOT EXISTS site_configs (
			id INTEGER PRIMARY KEY, key TEXT UNIQUE, draft_config TEXT, draft_version INTEGER DEFAULT 1,
			published_config TEXT, published_version INTEGER DEFAULT 0,
			created_at DATETIME, updated_at DATETIME
		);
	`)
	if err != nil {
		t.Fatal(err)
	}
}
```

- [ ] **Step 3: Run migration test**

```bash
cd /home/dev/impress/backend && go test -v -run TestMigration ./internal/db/migrations/
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd /home/dev/impress/backend
git add internal/db/migrations/00008_unified_pages.go
git commit -m "feat: add goose migration for unified pages data transformation"
```

---

## Chunk 7: Frontend Unified Editor

This is the largest frontend task. The unified editor replaces both the current block page editor (`pages/admin/pages/editor/page.tsx`) and the content document editor (`pages/admin/content/editor/page.tsx`).

### Task 22: Build unified page editor — core structure

**Files:**
- Rewrite: `frontend/src/pages/admin/pages/editor/page.tsx`

- [ ] **Step 1: Create the base editor component**

Rewrite `frontend/src/pages/admin/pages/editor/page.tsx` as the unified editor. The component should:

1. Route: `/admin/pages/new`, `/admin/pages/edit/:id`
2. On load: if `:id` exists, fetch via `getUnifiedPageDraft(id)`
3. State: `sections: SectionData[]`, `selectedIndex`, `draftVersion`, `editorMode: "visual" | "json"`, page metadata fields
4. For template-mode pages: fetch template config and lock sections
5. Save: call `updateUnifiedPageDraft(id, version, config)` with `If-Match` header
6. Publish: call `publishUnifiedPage(id, draftVersion)`
7. Show version history panel with rollback

The editor layout:
- Left sidebar: section list (draggable for composable, locked for template)
- Center: section preview using `SectionRenderer`
- Right sidebar: section field editor
- Bottom toolbar: save/publish/version controls

- [ ] **Step 2: Implement section picker for composable mode**

Reuse the existing `SectionPicker` pattern from the current editor — modal grid of section types from `useSectionRegistry().metas`. When adding a section, set `variant: "default"`, `locked: false`.

- [ ] **Step 3: Implement draft save with conflict detection**

Save handler:
```typescript
const handleSave = async () => {
  try {
    const result = await updateUnifiedPageDraft(pageId, draftVersion, {
      sections,
      tokens: pageTokens,
    });
    setDraftVersion(result.version);
  } catch (err: any) {
    if (err.response?.status === 409) {
      // Show conflict modal with currentVersion
      setConflictVersion(err.response.data.currentVersion);
    }
  }
};
```

- [ ] **Step 4: Implement publish/unpublish controls**

Publish button calls `publishUnifiedPage(pageId, draftVersion)`. Unpublish calls `unpublishUnifiedPage(pageId)`. Show status badge (draft/published).

- [ ] **Step 5: Implement version history panel**

Slide-out panel listing versions from `listUnifiedPageVersions(pageId)`. Each row shows version number, date, user. Click to preview. "Rollback" button calls `rollbackUnifiedPage(pageId, targetVersion)`.

- [ ] **Step 6: Run lint and type-check**

```bash
pnpm lint && pnpm type-check
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/admin/pages/editor/page.tsx
git commit -m "feat: rewrite page editor as unified editor with draft/publish/versions"
```

### Task 23: Update admin page list to show unified pages

**Files:**
- Modify: `frontend/src/pages/admin/pages/page.tsx`

- [ ] **Step 1: Switch API calls from old pages to unified pages**

Replace `listPages()` calls with `listUnifiedPages()`. Update table columns to show `mode`, `draftVersion`, `publishedVersion`, `status`. Link edit button to `/admin/pages/edit/:id` (same route, but now uses unified editor).

- [ ] **Step 2: Run lint and type-check**

```bash
pnpm lint && pnpm type-check
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/pages/page.tsx
git commit -m "feat: update admin page list to use unified pages API"
```

---

## Chunk 8: Theme Export/Import

### Task 24: Backend theme export service

**Files:**
- Create: `backend/internal/service/theme_export_service.go`
- Create: `backend/internal/service/theme_export_service_test.go`

- [ ] **Step 1: Write test for theme export**

Test that `ExportTheme()` produces a JSON package with `name`, `tokens`, `pageTemplates` array.

- [ ] **Step 2: Implement ThemeExportService**

```go
type ThemeExportService struct {
	templateRepo  repository.PageTemplateRepository
	siteConfigRepo repository.SiteConfigRepository
}

func (s *ThemeExportService) Export(ctx context.Context, name string) (model.JSONMap, error) {
	// 1. Fetch theme SiteConfig for tokens
	// 2. Fetch all page templates
	// 3. Assemble into theme package JSON
}

func (s *ThemeExportService) Import(ctx context.Context, themePackage model.JSONMap) error {
	// 1. Parse tokens and apply to theme SiteConfig
	// 2. For each pageTemplate in package, create with category="theme"
}
```

- [ ] **Step 3: Run tests**

```bash
cd /home/dev/impress/backend && go test -v -run TestThemeExport ./internal/service/
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd /home/dev/impress/backend
git add internal/service/theme_export_service.go internal/service/theme_export_service_test.go
git commit -m "feat: add theme export/import service"
```

### Task 25: Backend theme export handler

**Files:**
- Create: `backend/internal/handler/theme_export/handler.go`

- [ ] **Step 1: Implement all four theme endpoints per spec**

The spec defines four endpoints:

```go
// backend/internal/handler/theme_export/handler.go
package theme_export

import (
	"net/http"
	"strconv"

	"blotting-consultancy/internal/service"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	exportSvc *service.ThemeExportService
}

func NewHandler(exportSvc *service.ThemeExportService) *Handler {
	return &Handler{exportSvc: exportSvc}
}

// POST /admin/themes/export — export current site as theme JSON
func (h *Handler) Export(c *gin.Context) {
	name := c.DefaultQuery("name", "my-theme")
	result, err := h.exportSvc.Export(c.Request.Context(), name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

// POST /admin/themes/import — import theme package
func (h *Handler) Import(c *gin.Context) {
	var themePackage map[string]interface{}
	if err := c.ShouldBindJSON(&themePackage); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.exportSvc.Import(c.Request.Context(), themePackage); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "theme imported"})
}

// GET /admin/themes — list installed themes
func (h *Handler) List(c *gin.Context) {
	themes, err := h.exportSvc.ListInstalledThemes(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, themes)
}

// PUT /admin/themes/:id/apply — apply theme tokens to site
func (h *Handler) Apply(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.exportSvc.ApplyTheme(c.Request.Context(), uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "theme applied"})
}
```

Also add `ListInstalledThemes` and `ApplyTheme` methods to `ThemeExportService`:

```go
// Add to theme_export_service.go
func (s *ThemeExportService) ListInstalledThemes(ctx context.Context) ([]model.JSONMap, error) {
	templates, err := s.templateRepo.List(ctx, "theme")
	if err != nil {
		return nil, err
	}
	// Group templates by theme name (based on common tokens)
	// Return list of theme summaries
	var themes []model.JSONMap
	// ... group and summarize
	return themes, nil
}

func (s *ThemeExportService) ApplyTheme(ctx context.Context, themeTemplateID uint) error {
	tmpl, err := s.templateRepo.FindByID(ctx, themeTemplateID)
	if err != nil {
		return err
	}
	// Extract tokens from template config and apply to theme SiteConfig
	config, _ := tmpl.Config["tokens"].(map[string]interface{})
	if config == nil {
		return nil
	}
	themeConfig, err := s.siteConfigRepo.FindByKey(ctx, "theme")
	if err != nil {
		return err
	}
	themeConfig.DraftConfig = model.JSONMap(config)
	themeConfig.DraftVersion++
	return s.siteConfigRepo.Update(ctx, themeConfig)
}
```

- [ ] **Step 2: Wire into main.go**

```go
themeExportSvc := service.NewThemeExportService(pageTemplateRepo, siteConfigRepo)
themeExportHdl := themeExportHandler.NewHandler(themeExportSvc)

// Routes
adminGroup.POST("/themes/export", themeExportHdl.Export)
adminGroup.POST("/themes/import", themeExportHdl.Import)
adminGroup.GET("/themes", themeExportHdl.List)
adminGroup.PUT("/themes/:id/apply", themeExportHdl.Apply)
```

- [ ] **Step 3: Verify and commit**

```bash
cd /home/dev/impress/backend && go build -o server ./cmd/server/
git add internal/handler/theme_export/ backend/cmd/server/main.go
git commit -m "feat: add theme export/import/list/apply handler"
```

### Task 25b: Update theme handler to use SiteConfig

**Files:**
- Modify: `backend/internal/handler/theme/handler.go`

> **Why:** The existing `theme/handler.go` reads/writes theme config from `contentDocRepo`. Before cleanup deletes the content document system, update it to use `SiteConfigRepository`. This preserves the `GET/PUT /admin/theme/config` endpoints that the frontend theme settings page uses.

- [ ] **Step 1: Replace contentDocRepo with siteConfigRepo in theme handler**

In `theme/handler.go`, change:
- `contentDocRepo.FindByPageKey("theme")` → `siteConfigRepo.FindByKey("theme")`
- `contentDocRepo.UpdateDraft("theme", ...)` → `siteConfigRepo.UpdateDraft("theme", ...)`
- Update the constructor to accept `SiteConfigRepository` instead of `ContentDocumentRepository`

- [ ] **Step 2: Update main.go wiring**

Update the `themeHandlerInst` initialization to pass `siteConfigRepo` instead of `contentDocRepo`.

- [ ] **Step 3: Verify and commit**

```bash
cd /home/dev/impress/backend && go build -o server ./cmd/server/
git add backend/internal/handler/theme/ backend/cmd/server/main.go
git commit -m "refactor: update theme handler to use SiteConfig instead of ContentDocument"
```

### Task 26: Frontend theme export/import UI

**Files:**
- Create: `frontend/src/api/themeExport.ts`
- Modify: `frontend/src/pages/admin/theme/page.tsx` (add export/import buttons)

- [ ] **Step 1: Create API client**

- [ ] **Step 2: Add export/import UI to theme settings page**

- [ ] **Step 3: Run lint and type-check**

```bash
pnpm lint && pnpm type-check
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/themeExport.ts frontend/src/pages/admin/theme/page.tsx
git commit -m "feat: add theme export/import UI"
```

---

## Chunk 9: Cleanup — Remove Old Systems

### Task 27: Rename routes from /unified-pages to /pages

**Files:**
- Modify: `backend/cmd/server/main.go`
- Modify: `frontend/src/api/unifiedPages.ts`

- [ ] **Step 1: In main.go, remove old page and content handler routes**

Remove all routes for:
- `pageHandlerInst` (old page handler)
- `contentHandlerInst` (content handler)

> **Note:** `themeHandlerInst` was already updated to use SiteConfig in Task 25b — keep it.

- [ ] **Step 2: Rename /unified-pages to /pages**

Change all `/unified-pages` routes to `/pages` and `/public/unified-pages` to `/public/pages`.

- [ ] **Step 3: Update frontend API client**

In `unifiedPages.ts`, change all URL paths from `/unified-pages` to `/pages`.

- [ ] **Step 4: Run lint and type-check**

```bash
pnpm lint && pnpm type-check
```

- [ ] **Step 5: Verify backend compiles**

```bash
cd /home/dev/impress/backend && go build -o server ./cmd/server/
```

- [ ] **Step 6: Commit**

```bash
git add backend/cmd/server/main.go frontend/src/api/unifiedPages.ts
git commit -m "refactor: rename /unified-pages to /pages, remove old handlers"
```

### Task 28: Delete old backend files

**Files:**
- Delete: `backend/internal/model/page.go`
- Delete: `backend/internal/model/content_document.go` (keep JSONMap type — move to separate file first if not already)
- Delete: `backend/internal/model/content_version.go`
- Delete: `backend/internal/repository/page_repository.go`
- Delete: `backend/internal/repository/page_repository_impl.go`
- Delete: `backend/internal/repository/content_document_repository.go`
- Delete: `backend/internal/repository/content_document_repository_impl.go`
- Delete: `backend/internal/repository/content_version_repository.go`
- Delete: `backend/internal/repository/content_version_repository_impl.go`
- Delete: `backend/internal/handler/page/` (entire directory)
- Delete: `backend/internal/handler/content/` (entire directory)
- Delete: `backend/internal/service/content_service.go`

- [ ] **Step 1: Verify JSONMap is in json_map.go**

`JSONMap` and `NullableJSONMap` were already moved to `json_map.go` in Task 0. Verify that `content_document.go` no longer defines them before deleting it.

- [ ] **Step 2: Delete old files**

```bash
cd /home/dev/impress/backend
rm internal/model/page.go internal/model/content_document.go internal/model/content_version.go
rm internal/repository/page_repository.go internal/repository/page_repository_impl.go
rm internal/repository/content_document_repository.go internal/repository/content_document_repository_impl.go
rm internal/repository/content_version_repository.go internal/repository/content_version_repository_impl.go
rm -rf internal/handler/page/ internal/handler/content/
rm internal/service/content_service.go
```

- [ ] **Step 3: Fix compilation errors**

Remove references to deleted types from `main.go`, seed files, and any other imports.

- [ ] **Step 4: Verify backend compiles**

```bash
cd /home/dev/impress/backend && go build -o server ./cmd/server/
```

- [ ] **Step 5: Run all backend tests**

```bash
cd /home/dev/impress/backend && go test -v -race ./...
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove old Page, ContentDocument, and ContentVersion systems"
```

### Task 29: Delete old frontend files

**Files:**
- Delete: `frontend/src/api/pages.ts`
- Delete: `frontend/src/api/publicContent.ts`
- Delete: `frontend/src/pages/admin/content/` (entire directory)
- Delete: `frontend/src/schemas/` (entire directory)
- Delete: `frontend/src/types/schema.ts`

- [ ] **Step 1: Delete old files**

```bash
cd /home/dev/impress/frontend
rm src/api/pages.ts src/api/publicContent.ts
rm -rf src/pages/admin/content/ src/schemas/ src/types/schema.ts
```

- [ ] **Step 2: Update DynamicPage.tsx to use unified pages public API**

In `frontend/src/theme/DynamicPage.tsx`:
- Replace `import { fetchPublicContent, normalizeConfigForLocale } from "@/api/publicContent"` with `import { getPublicUnifiedPageBySlug } from "@/api/unifiedPages"`
- Update the data fetching to call `getPublicUnifiedPageBySlug(slug)` instead of `fetchPublicContent(slug)`
- The response already contains `publishedConfig` with a `sections` array — pass it directly to `SectionRenderer`
- The `useLocalizedData` hook handles locale extraction from bilingual `{zh, en}` objects in section data

- [ ] **Step 3: Fix remaining imports**

Update any other files that import from deleted modules. Replace `pages.ts` imports with `unifiedPages.ts`. Replace `publicContent.ts` usage with public unified pages API calls.

- [ ] **Step 4: Update router config**

In `src/router/config.tsx`, remove routes for:
- `/admin/content/editor/:pageKey`

Ensure `/admin/pages/edit/:id` uses the new unified editor.

- [ ] **Step 5: Run full verification**

```bash
pnpm lint && pnpm type-check
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove old content document frontend (schemas, API, editor)"
```

### Task 30: Add goose migration to drop old tables

**Files:**
- Create: `backend/internal/db/migrations/00009_drop_old_page_tables.go`

- [ ] **Step 1: Create drop migration**

```go
func upDropOldPageTables(ctx context.Context, tx *sql.Tx) error {
	for _, table := range []string{"content_versions", "content_documents", "pages"} {
		if _, err := tx.ExecContext(ctx, "DROP TABLE IF EXISTS "+table); err != nil {
			return err
		}
	}
	return nil
}

func downDropOldPageTables(ctx context.Context, tx *sql.Tx) error {
	// Recreate old table schemas (data restoration is handled by 00008 down migration)
	_, err := tx.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS content_documents (
			page_key TEXT PRIMARY KEY,
			draft_config TEXT,
			draft_version INTEGER NOT NULL DEFAULT 1,
			published_config TEXT,
			published_version INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME,
			updated_at DATETIME
		);
		CREATE TABLE IF NOT EXISTS content_versions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			page_key TEXT NOT NULL,
			version INTEGER NOT NULL,
			config TEXT NOT NULL,
			created_by INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME
		);
		CREATE TABLE IF NOT EXISTS pages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			slug TEXT UNIQUE,
			title TEXT,
			config TEXT,
			status TEXT NOT NULL DEFAULT 'draft',
			theme_id TEXT,
			content_key TEXT,
			render_mode TEXT,
			is_theme_page INTEGER DEFAULT 0,
			sort_order INTEGER DEFAULT 0,
			show_in_nav INTEGER DEFAULT 0,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		);
	`)
	return err
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/dev/impress/backend
git add internal/db/migrations/00009_drop_old_page_tables.go
git commit -m "feat: add goose migration to drop old page/content tables"
```

### Task 31: Final verification

- [ ] **Step 1: Run full backend verification**

```bash
cd /home/dev/impress/backend && go vet ./... && go test -v -race ./...
```

Expected: All pass.

- [ ] **Step 2: Run full frontend verification**

```bash
pnpm lint && pnpm type-check
```

Expected: All pass.

- [ ] **Step 3: Build frontend**

```bash
pnpm build
```

Expected: Successful build to `frontend/out/`.

- [ ] **Step 4: Build and start backend**

```bash
cd /home/dev/impress/backend && go build -o server ./cmd/server/
```

Expected: Compiles. Server starts and creates new tables.

---

## Dependency Graph

```
Chunk 1 (Models) — no dependencies
    ↓
Chunk 2 (Repositories) ← depends on Chunk 1
    ↓
Chunk 3 (Service) ← depends on Chunk 2
    ↓
Chunk 4 (Handlers) ← depends on Chunks 2 + 3
    ↓
Chunk 5 (Frontend Types + API) — depends on Chunk 4 for API endpoints
    ↓
Chunk 6 (Data Migration) ← depends on Chunks 1-4 (needs models + repos)
    ↓
Chunk 7 (Frontend Editor) ← depends on Chunk 5
    ↓
Chunk 8 (Theme Export) ← depends on Chunks 1-4
    ↓
Chunk 9 (Cleanup) ← depends on ALL above being complete and verified
```

Chunks 5, 6, and 8 can be developed in parallel after Chunk 4 is complete.
