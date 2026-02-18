# CLAUDE.md

This file guides Claude Code (`claude` CLI) when working in this repository.

## Project Overview

印迹官网 (Blotting Consultancy) is a bilingual (`zh`/`en`) React SPA with a Go/Gin/GORM CMS backend.
- **frontend/** — Vite + React 前端工程
- **backend/** — Go/Gin 后端工程
- **docs/**, **scripts/**, **.github/** — 文档、脚本与 CI/CD（位于仓库根目录）

Primary planning docs (read in this order):
1. `docs/development-plan.md` (execution plan for long-running agent)
2. `docs/api-spec.md` (REST API contract)
3. `docs/architecture.md` (layering and delivery architecture)
4. `docs/data-model.md` (page config and translation-state rules)

## Core Commands

Use `pnpm` only.

```bash
pnpm install
pnpm dev            # http://localhost:3000
pnpm build
pnpm preview
pnpm lint
pnpm type-check
```

Long-running agent harness:

```bash
pnpm agent:init
pnpm agent:run
pnpm agent:run -- --max-iterations 10 --model sonnet
```

Default verification command: `pnpm lint && pnpm type-check`.

## Stack And Structure

- Frontend (in `frontend/`): React 19 + TypeScript + Vite 7 + Tailwind CSS 3 + React Router 7 + i18next
- Routing: `frontend/src/router/config.tsx` (lazy routes)
- Shared UI: `frontend/src/components/feature/`
- Pages: `frontend/src/pages/*/page.tsx`
- i18n resources: `frontend/src/i18n/local/{zh,en}/common.ts`
- Alias: `@` -> `src` (within frontend)
- Generated files (do not edit manually): `frontend/out/`, `frontend/auto-imports.d.ts`
- Backend (in `backend/`): Go, `cmd/server`, `internal/`, `pkg/`

## Long-Running Agent Protocol

These rules are mandatory when work is driven by `scripts/long-agent.mjs` + `claude` CLI.

### 1. State Files

- `.long-agent/feature_list.json` is the long-term backlog.
- `.long-agent/state.json` tracks iteration/session status.
- `.long-agent/agent-progress.md` is the running log.
- `.long-agent/reports/*.json` stores per-iteration structured reports.

Do not delete these files during autonomous runs.

### 2. Backlog Mutability Rules

In `.long-agent/feature_list.json`:
- Allowed change: `status` only (`todo`, `in_progress`, `done`, `blocked`, `needs_human`)
- Not allowed: changing `id`, `title`, `description`, `acceptance`, `priority`, `category`, `depends_on`
- Not allowed: reordering or deleting existing features

### 3. Iteration Rules (Coding Phase)

Each iteration must:
1. Re-orient (`pwd`, `ls -la`, `git status`, inspect related files).
2. Pick one feature only (next incomplete item with dependencies satisfied).
3. Implement only that feature.
4. Run verification command (`pnpm lint && pnpm type-check` unless overridden).
5. Update that feature status based on result.
6. Append concise progress notes.

Status mapping:
- `done`: implemented and verification passes
- `blocked`: technical blocker identified, with concrete dependency or missing prerequisite
- `needs_human`: business decision/credentials/approval ambiguity requiring human input

If status is `needs_human`, stop further autonomous iterations.

### 4. Commit Discipline

- Prefer one focused commit per completed feature.
- Commit message should include feature id, key changes, and verification result.
- Never include generated runtime artifacts from `.long-agent/` in commits.

## Project-Specific Constraints

- Backend lives in `backend/`; follow `docs/development-plan.md` for backend phases.
- Keep frontend behavior stable while introducing config-driven rendering.
- Maintain bilingual behavior and existing fallback (`zh` fallback for runtime display).
- No test framework is configured yet; if tests are added, use Vitest and `*.test.tsx` naming.

## Coding Conventions

- TypeScript + functional React components (`*.tsx`)
- 2-space indentation, double quotes, semicolons
- Tailwind utility-first styles
- Avoid redundant imports for auto-imported React/router/i18n helpers
- Run `pnpm lint` and `pnpm type-check` before finishing significant changes
