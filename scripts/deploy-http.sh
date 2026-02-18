#!/usr/bin/env bash
# HTTP deployment script
# Uploads frontend/backend artifacts to a remote deployment API.

set -euo pipefail

ENVIRONMENT="${ENVIRONMENT:-production}"
VERSION="${VERSION:?VERSION environment variable is required}"
DEPLOY_HTTP_ENDPOINT="${DEPLOY_HTTP_ENDPOINT:?DEPLOY_HTTP_ENDPOINT environment variable is required}"
DEPLOY_HTTP_TOKEN="${DEPLOY_HTTP_TOKEN:-}"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-./artifacts}"

FRONTEND_ARTIFACT="${ARTIFACTS_DIR}/frontend-${VERSION}.tar.gz"
BACKEND_ARTIFACT="${ARTIFACTS_DIR}/backend-${VERSION}.tar.gz"
FRONTEND_SHA="${FRONTEND_ARTIFACT}.sha256"
BACKEND_SHA="${BACKEND_ARTIFACT}.sha256"

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: curl is required"
  exit 1
fi

if [ ! -f "${FRONTEND_ARTIFACT}" ]; then
  echo "ERROR: Frontend artifact not found: ${FRONTEND_ARTIFACT}"
  exit 1
fi

if [ ! -f "${BACKEND_ARTIFACT}" ]; then
  echo "ERROR: Backend artifact not found: ${BACKEND_ARTIFACT}"
  exit 1
fi

echo "=========================================="
echo "HTTP Deployment"
echo "=========================================="
echo "Environment: ${ENVIRONMENT}"
echo "Version: ${VERSION}"
echo "Endpoint: ${DEPLOY_HTTP_ENDPOINT}"
echo "=========================================="

tmp_response="$(mktemp)"
trap 'rm -f "${tmp_response}"' EXIT

curl_args=(
  --silent
  --show-error
  --location
  --output "${tmp_response}"
  --write-out "%{http_code}"
  --request POST
  --form "environment=${ENVIRONMENT}"
  --form "version=${VERSION}"
  --form "frontend_artifact=@${FRONTEND_ARTIFACT}"
  --form "backend_artifact=@${BACKEND_ARTIFACT}"
)

if [ -n "${DEPLOY_HTTP_TOKEN}" ]; then
  curl_args+=(--header "Authorization: Bearer ${DEPLOY_HTTP_TOKEN}")
fi

if [ -f "${FRONTEND_SHA}" ]; then
  curl_args+=(--form "frontend_checksum=@${FRONTEND_SHA}")
fi

if [ -f "${BACKEND_SHA}" ]; then
  curl_args+=(--form "backend_checksum=@${BACKEND_SHA}")
fi

http_code="$(curl "${curl_args[@]}" "${DEPLOY_HTTP_ENDPOINT}")"

if [ "${http_code}" -lt 200 ] || [ "${http_code}" -ge 300 ]; then
  echo "ERROR: Deployment API returned HTTP ${http_code}"
  echo "Response:"
  cat "${tmp_response}"
  exit 1
fi

echo "Deployment request accepted (HTTP ${http_code})"
if [ -s "${tmp_response}" ]; then
  echo "Response:"
  cat "${tmp_response}"
fi
