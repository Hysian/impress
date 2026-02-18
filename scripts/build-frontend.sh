#!/usr/bin/env bash
# Frontend production build script
# Produces versioned frontend artifact with build metadata

set -euo pipefail

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"
cd "${FRONTEND_DIR}"

# Configuration
VERSION="${VERSION:-$(git describe --tags --always --dirty 2>/dev/null || echo "v0.0.0-$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')")}"
BUILD_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
DIST_DIR="${FRONTEND_DIR}/out"
ARTIFACTS_DIR="${PROJECT_ROOT}/artifacts"
ARTIFACT_NAME="frontend-${VERSION}.tar.gz"

echo "=========================================="
echo "Frontend Production Build"
echo "=========================================="
echo "Version: ${VERSION}"
echo "Build Time: ${BUILD_TIME}"
echo "Dist Directory: ${DIST_DIR}"
echo "Artifact Output: ${ARTIFACTS_DIR}/${ARTIFACT_NAME}"
echo "=========================================="

# Clean previous build
echo "Cleaning previous build..."
rm -rf "${DIST_DIR}"
mkdir -p "${ARTIFACTS_DIR}"

# Install dependencies
echo "Installing dependencies..."
pnpm install --frozen-lockfile

# Run type check
echo "Running type check..."
pnpm type-check

# Run linter
echo "Running linter..."
pnpm lint

# Build production bundle
echo "Building production bundle..."
pnpm build

# Create build metadata
echo "Creating build metadata..."
cat > "${DIST_DIR}/build-info.json" <<EOF
{
  "version": "${VERSION}",
  "buildTime": "${BUILD_TIME}",
  "gitCommit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "gitBranch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
  "nodeVersion": "$(node --version)",
  "pnpmVersion": "$(pnpm --version)"
}
EOF

# Create tarball artifact
echo "Creating artifact tarball..."
cd "${DIST_DIR}"
tar -czf "${ARTIFACTS_DIR}/${ARTIFACT_NAME}" .
cd "${PROJECT_ROOT}"

# Calculate checksum
echo "Calculating checksum..."
if command -v sha256sum &> /dev/null; then
  sha256sum "${ARTIFACTS_DIR}/${ARTIFACT_NAME}" > "${ARTIFACTS_DIR}/${ARTIFACT_NAME}.sha256"
elif command -v shasum &> /dev/null; then
  shasum -a 256 "${ARTIFACTS_DIR}/${ARTIFACT_NAME}" > "${ARTIFACTS_DIR}/${ARTIFACT_NAME}.sha256"
else
  echo "Warning: sha256sum or shasum not found, skipping checksum generation"
fi

# Create symlink to latest
cd "${ARTIFACTS_DIR}"
ln -sf "${ARTIFACT_NAME}" frontend-latest.tar.gz
if [ -f "${ARTIFACT_NAME}.sha256" ]; then
  ln -sf "${ARTIFACT_NAME}.sha256" frontend-latest.tar.gz.sha256
fi
cd "${PROJECT_ROOT}"

echo "=========================================="
echo "Build completed successfully!"
echo "Artifact: ${ARTIFACTS_DIR}/${ARTIFACT_NAME}"
echo "Size: $(du -h "${ARTIFACTS_DIR}/${ARTIFACT_NAME}" | cut -f1)"
if [ -f "${ARTIFACTS_DIR}/${ARTIFACT_NAME}.sha256" ]; then
  echo "Checksum: $(cat "${ARTIFACTS_DIR}/${ARTIFACT_NAME}.sha256" | cut -d' ' -f1)"
fi
echo "=========================================="
