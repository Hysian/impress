# CI Quality Gate Pipeline

This directory contains GitHub Actions workflows for automated quality checks.

## quality-gate.yml

The main CI pipeline that enforces code quality and blocks merges on regression failures.

### What it does

The pipeline runs three parallel check suites:

1. **Frontend Quality Checks**
   - ESLint code linting
   - TypeScript type checking
   - Vitest test suite execution
   - Test results artifact upload

2. **Backend Quality Checks**
   - Go module verification (`go mod verify` and `go mod tidy`)
   - Go vet static analysis
   - Go test suite with race detection and coverage
   - Coverage report artifact upload

3. **Integration Smoke Checks**
   - Frontend build (`pnpm build`)
   - Backend build (`go build`)
   - Build artifact verification
   - Artifact upload for deployability validation

4. **Quality Gate Summary**
   - Aggregates all check results
   - Posts job summary to GitHub UI
   - **Blocks merge if any check fails**

### Triggers

The pipeline runs on:
- Pushes to `main`, `master`, or `develop` branches
- Pull requests targeting `main`, `master`, or `develop` branches

### Artifacts

The pipeline uploads artifacts with 7-day retention:
- `frontend-test-results`: Frontend test coverage reports
- `backend-coverage`: Backend test coverage file
- `build-artifacts`: Compiled frontend (`dist/`) and backend binary (`server`)

### Branch Protection Setup

To enforce the quality gate and block merges on failures:

1. Go to repository **Settings** → **Branches**
2. Add a branch protection rule for your main branch (e.g., `main` or `master`)
3. Enable **"Require status checks to pass before merging"**
4. Select these required status checks:
   - `Frontend Quality Checks`
   - `Backend Quality Checks`
   - `Integration Smoke Checks`
   - `Quality Gate Summary`
5. Enable **"Require branches to be up to date before merging"** (recommended)
6. Save changes

### Local Verification

To run the same checks locally before pushing:

```bash
# Frontend checks
pnpm lint
pnpm type-check
pnpm test:run

# Backend checks
go mod verify
go mod tidy
go vet ./...
go test -v -race ./...

# Integration smoke
pnpm build
go build -v -o ./server ./cmd/server
```

### Troubleshooting

**Pipeline fails on `go mod tidy` check:**
- Run `go mod tidy` locally and commit the updated `go.mod` and `go.sum`

**Frontend lint or type-check fails:**
- Fix issues reported by `pnpm lint` and `pnpm type-check`
- Ensure all TypeScript errors are resolved before pushing

**Backend tests fail with race detector:**
- Race conditions detected indicate potential concurrency bugs
- Fix data races before merging to prevent production issues

**Build artifacts missing:**
- Ensure `pnpm build` produces `dist/` directory
- Ensure `go build ./cmd/server` produces `server` binary

### Performance Notes

- Go and pnpm caches are configured to speed up dependency installation
- Tests run with race detection enabled for concurrency safety
- Parallel job execution minimizes total pipeline time
- Failed jobs upload artifacts for debugging even on failure (`if: always()`)
