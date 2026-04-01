# QA Module Extraction Design

**Date:** 2026-04-01
**Status:** Approved

## Summary

Extract the QA (knowledge Q&A) feature from hardcoded integration into a self-contained internal module with feature flag support via SiteConfig, establishing a Module interface pattern for future modularization efforts.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Approach | Internal modularization (not just feature flag, not gRPC plugin) | Real decoupling without over-engineering |
| Toggle control | SiteConfig database (`features` key) | Dynamic on/off without restart, reuses existing draft/published mechanism |
| Disabled behavior | Public: hidden; Admin: always visible | Users don't see disabled features; admins retain access to enable/manage |
| Backend registration | Interface-based Module + Manager | Prepares for future module extractions |
| Frontend organization | `modules/qa/` aggregated directory | Mirrors backend structure, consistent convention |

## Backend Design

### Module Interface (`backend/internal/module/module.go`)

```go
type Module interface {
    Name() string
    Init(deps Dependencies) error
    RegisterRoutes(public, admin *gin.RouterGroup)
}

type Dependencies struct {
    DB       *gorm.DB
    Registry *provider.Registry
    Repos    *SharedRepos
    SiteCfg  repository.SiteConfigRepository   // For feature flag checks
}

type SharedRepos struct {
    ContentDoc repository.ContentDocumentRepository
    Article    repository.ArticleRepository
}
```

### Module Manager (`backend/internal/module/manager.go`)

```go
type Manager struct {
    modules []Module
}

func NewManager() *Manager
func (m *Manager) Register(mod Module)
func (m *Manager) InitAll(deps Dependencies) error
func (m *Manager) RegisterAllRoutes(public, admin *gin.RouterGroup)
func (m *Manager) Has(name string) bool
```

Usage in `main.go`:

```go
mgr := module.NewManager()
mgr.Register(qa.New())
mgr.InitAll(module.Dependencies{DB: database.DB, Registry: registry, Repos: sharedRepos})
mgr.RegisterAllRoutes(publicGroup, adminGroup)
```

### QA Module (`backend/internal/modules/qa/`)

Directory structure:

```
backend/internal/modules/qa/
  module.go          # Implements Module interface, orchestrates init and route registration
  handler.go         # HTTP handlers (moved from internal/handler/qa/handler.go)
  service.go         # QA RAG service (moved from internal/service/qa_service.go)
  embedding.go       # Embedding service (moved from internal/service/embedding_service.go)
  vectorstore.go     # In-memory vector store (moved from internal/service/vectorstore_memory.go)
  repository.go      # QALog repo interface + GORM impl (merged from internal/repository/qa_log_repository*.go)
  model.go           # QALog model (moved from internal/model/qa_log.go)
  handler_test.go    # Tests (moved from internal/handler/qa/handler_test.go)
  service_test.go    # Tests (moved from internal/service/qa_service_test.go)
  embedding_test.go  # Tests (moved from internal/service/embedding_service_test.go)
  vectorstore_test.go # Tests (moved from internal/service/vectorstore_memory_test.go)
```

**`module.go` Init responsibilities:**
1. Auto-migrate `QALog` model (removed from main.go migration list)
2. Initialize `qaLogRepo`, `vectorStore`, `qaService`, `embeddingService`
3. Build handler using `deps.Repos.ContentDoc` and `deps.Repos.Article` (shared, not moved into QA)

**`module.go` RegisterRoutes:**
- Public: `POST /qa/ask` (with feature flag check)
- Admin: `POST /qa/index`, `GET /qa/logs`, `POST /qa/logs/:id/feedback`

### Feature Flag Mechanism

**SiteConfig extension:** Add `features` as a valid key alongside existing `global`/`theme`/`email`. This requires:
1. Add `SiteConfigKeyFeatures = "features"` constant in `backend/internal/model/site_config.go`
2. Update `SiteConfig.Validate()` to accept the `"features"` key in its `BeforeSave` hook

Config value structure:

```json
{
  "qa": { "enabled": true }
}
```

**Public route behavior:** Handler checks `features.qa.enabled` at request time. If disabled, returns `404`:

```go
func (h *Handler) PublicAsk(c *gin.Context) {
    if !h.featureEnabled(c, "qa") {
        c.JSON(404, gin.H{"error": "not found"})
        return
    }
    // ... normal processing
}
```

The handler receives a `SiteConfigRepository` (or lightweight `FeatureChecker` interface) to perform this check. SiteConfig's published version caching avoids per-request DB queries.

**Admin routes:** Always available regardless of feature flag state.

## Frontend Design

### Module Directory (`frontend/src/modules/qa/`)

```
frontend/src/modules/qa/
  index.ts              # Module registration: exports route config, sidebar item
  api.ts                # Moved from src/api/qa.ts
  widget/
    QAWidget.tsx         # Moved from src/components/feature/QAWidget.tsx
  admin/
    page.tsx             # Moved from src/pages/admin/qa/page.tsx
```

**`index.ts` exports:**

```ts
export const qaModule = {
  name: "qa",
  adminRoute: {
    path: "qa",
    lazy: () => import("./admin/page"),
  },
  sidebar: {
    label: "知识问答",
    path: "/admin/qa",
    permissionKey: "qa",
    icon: /* svg */,
  },
};
```

### Feature Flag Integration

**Feature flag delivery to frontend:** The bootstrap endpoint (`/public/bootstrap`) must include `features` config:
1. Modify `backend/internal/handler/bootstrap/handler.go` to also fetch the `features` SiteConfig row and include it in the bootstrap response
2. Extend `BootstrapData` type in `frontend/src/api/bootstrap.ts` with a `features` field
3. Extend `GlobalConfigContext` to expose `features` from bootstrap data

**PublicLayout.tsx:** Conditional QAWidget rendering:

```tsx
const { features } = useGlobalConfig();
{features?.qa?.enabled && <QAWidget />}
```

**AdminSidebar.tsx:** QA menu item always visible (reads from module export instead of hardcoded nav item).

**Admin QA page:** When QA is disabled, shows info banner with enable button at top of page.

### Route and Sidebar Wiring

- `router/config.tsx`: Import QA route from `modules/qa` instead of hardcoded admin route
- `AdminSidebar.tsx`: Read QA menu item from module export instead of hardcoded nav array

## File Changes

### New Files

| File | Description |
|------|-------------|
| `backend/internal/module/module.go` | Module interface + Dependencies |
| `backend/internal/module/manager.go` | Manager for module lifecycle |
| `backend/internal/modules/qa/module.go` | QA Module interface implementation |
| `backend/internal/modules/qa/handler.go` | Moved from `internal/handler/qa/` |
| `backend/internal/modules/qa/service.go` | Moved from `internal/service/qa_service.go` |
| `backend/internal/modules/qa/embedding.go` | Moved from `internal/service/embedding_service.go` |
| `backend/internal/modules/qa/vectorstore.go` | Moved from `internal/service/vectorstore_memory.go` |
| `backend/internal/modules/qa/handler_test.go` | Moved from `internal/handler/qa/handler_test.go` |
| `backend/internal/modules/qa/service_test.go` | Moved from `internal/service/qa_service_test.go` |
| `backend/internal/modules/qa/embedding_test.go` | Moved from `internal/service/embedding_service_test.go` |
| `backend/internal/modules/qa/vectorstore_test.go` | Moved from `internal/service/vectorstore_memory_test.go` |
| `backend/internal/modules/qa/repository.go` | Merged from `internal/repository/qa_log_repository*.go` |
| `backend/internal/modules/qa/model.go` | Moved from `internal/model/qa_log.go` |
| `frontend/src/modules/qa/index.ts` | Frontend module registration |
| `frontend/src/modules/qa/api.ts` | Moved from `src/api/qa.ts` |
| `frontend/src/modules/qa/widget/QAWidget.tsx` | Moved from `src/components/feature/QAWidget.tsx` |
| `frontend/src/modules/qa/admin/page.tsx` | Moved from `src/pages/admin/qa/page.tsx` |

### Modified Files

| File | Change |
|------|--------|
| `backend/cmd/server/main.go` | Remove QA hardcoding, use `mgr.Register(qa.New())` |
| `backend/internal/model/site_config.go` | Add `SiteConfigKeyFeatures` constant, update `Validate()` |
| `backend/internal/handler/bootstrap/handler.go` | Include `features` SiteConfig in bootstrap response |
| `frontend/src/api/bootstrap.ts` | Add `features` field to `BootstrapData` |
| `frontend/src/theme/layouts/PublicLayout.tsx` | Conditional QAWidget rendering |
| `frontend/src/pages/admin/components/AdminSidebar.tsx` | Read QA menu from module export |
| `frontend/src/router/config.tsx` | Read QA route from module export |
| `frontend/src/contexts/GlobalConfigContext.tsx` | Expose `features` from bootstrap data |

### Deleted Files

| File | Reason |
|------|--------|
| `backend/internal/handler/qa/handler.go` | Moved to modules/qa/ |
| `backend/internal/service/qa_service.go` | Moved to modules/qa/ |
| `backend/internal/service/embedding_service.go` | Moved to modules/qa/ |
| `backend/internal/service/vectorstore_memory.go` | Moved to modules/qa/ |
| `backend/internal/service/vectorstore_memory_test.go` | Moved to modules/qa/ |
| `backend/internal/service/embedding_service_test.go` | Moved to modules/qa/ |
| `backend/internal/service/qa_service_test.go` | Moved to modules/qa/ |
| `backend/internal/handler/qa/handler_test.go` | Moved to modules/qa/ |
| `backend/internal/repository/qa_log_repository.go` | Merged into modules/qa/ |
| `backend/internal/repository/qa_log_repository_impl.go` | Merged into modules/qa/ |
| `backend/internal/model/qa_log.go` | Moved to modules/qa/ |
| `frontend/src/api/qa.ts` | Moved to modules/qa/ |
| `frontend/src/components/feature/QAWidget.tsx` | Moved to modules/qa/ |
| `frontend/src/pages/admin/qa/page.tsx` | Moved to modules/qa/ |

### Unchanged

- QA business logic, API contract, and UI behavior
- Provider registry and SiteConfig mechanisms
- All other modules (articles, pages, themes, etc.)

## Design Notes

**`module/` vs `modules/` naming:** `backend/internal/module/` holds the interface definitions (singular), `backend/internal/modules/` holds concrete implementations (plural). This is intentional.

**`JSONArray` type:** Currently defined in `model/qa_log.go`. Since it is only used by QA code, it moves into the QA module's `model.go`. If a future module needs it, extract to a shared `model/types.go` at that time.

**`service.ErrAINotConfigured`:** The QA handler imports this sentinel error from `internal/service/ai_noop.go`. This is a retained cross-module dependency — the QA module will continue importing it from the `service` package rather than duplicating the definition.

**Relationship to existing plugin system:** The codebase has a gRPC-based plugin system at `internal/plugin/`. The Module system (`internal/module/`) is distinct: modules are compiled-in internal packages with direct DB/provider access, while plugins are external processes communicating via gRPC. Use modules for core features that need tight integration; use plugins for third-party extensions.

## Risk Considerations

1. **EmbeddingService / MemoryVectorStore callers:** Verified — no code outside QA references these. Safe to move.
2. **Go import path changes:** Requires full-repo search-and-replace for moved packages.
3. **SiteConfig `features` key initialization:** Treat missing `features.qa` as disabled (graceful default, no seed data required).
