#!/usr/bin/env bash
# deploy-run.sh — 解析 deploy-workflow.json 执行生产部署
# Usage:
#   ./scripts/deploy-run.sh                  # 默认: backend-only
#   ./scripts/deploy-run.sh backend-only     # 仅后端
#   ./scripts/deploy-run.sh frontend-only    # 仅前端
#   ./scripts/deploy-run.sh full             # 全量部署

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKFLOW_FILE="$SCRIPT_DIR/deploy-workflow.json"
CONF_FILE="$ROOT_DIR/.prod_server"

# ── Colors ──────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
step_ok()   { echo -e "  ${GREEN}✓${NC} $*"; }
step_fail() { echo -e "  ${RED}✗${NC} $*"; }
step_info() { echo -e "  ${CYAN}→${NC} $*"; }
header()    { echo -e "\n${YELLOW}[$1]${NC} $2"; }

# ── Parse server config ────────────────────────────
parse_server_conf() {
  if [ ! -f "$CONF_FILE" ]; then
    echo -e "${RED}Server config not found: $CONF_FILE${NC}" >&2; exit 1
  fi
  SERVER_IP=$(grep '^ip=' "$CONF_FILE" | cut -d= -f2 | cut -d: -f1)
  SERVER_PORT=$(grep '^ip=' "$CONF_FILE" | cut -d: -f2)
  SERVER_USER=$(grep '^user=' "$CONF_FILE" | cut -d= -f2)
  SERVER_PASS=$(grep '^passwd=' "$CONF_FILE" | cut -d= -f2)
  REMOTE_BASE=$(grep '^path=' "$CONF_FILE" | cut -d= -f2)
  NGINX_PORT=$(grep '^port=' "$CONF_FILE" | cut -d= -f2)
}

# ── SSH / SCP helpers ──────────────────────────────
remote_exec() {
  sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no -p "$SERVER_PORT" \
    "$SERVER_USER@$SERVER_IP" "$@"
}

remote_scp() {
  sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no -P "$SERVER_PORT" "$@"
}


# ── Parse workflow JSON ────────────────────────────
get_backend_env() {
  python3 -c "
import json
with open('$WORKFLOW_FILE') as f:
    wf = json.load(f)
env = wf['env']['BACKEND_ENV']
for k, v in env.items():
    print(f'{k}={v}')
"
}

get_workflow_jobs() {
  local workflow_name="$1"
  python3 -c "
import json
with open('$WORKFLOW_FILE') as f:
    wf = json.load(f)
jobs = wf['workflows']['$workflow_name']['jobs']
print(' '.join(jobs))
"
}

# ── Job implementations ───────────────────────────

job_lint_check() {
  header "LINT" "代码检查"
  cd "$ROOT_DIR"

  step_info "ESLint..."
  if pnpm lint > /dev/null 2>&1; then
    step_ok "ESLint 通过"
  else
    step_fail "ESLint 失败"; exit 1
  fi

  step_info "TypeScript 类型检查..."
  if pnpm type-check > /dev/null 2>&1; then
    step_ok "类型检查通过"
  else
    step_fail "类型检查失败"; exit 1
  fi
}

job_build_backend() {
  header "BUILD" "构建后端"
  cd "$ROOT_DIR"

  step_info "编译 Go 二进制..."
  (cd backend && CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -o server ./cmd/server/)
  LOCAL_MD5=$(md5sum backend/server | awk '{print $1}')
  LOCAL_SIZE=$(du -h backend/server | awk '{print $1}')
  step_ok "编译完成 (${LOCAL_SIZE}, md5: ${LOCAL_MD5:0:8}...)"
}

job_build_frontend() {
  header "BUILD" "构建前端"
  cd "$ROOT_DIR"

  step_info "安装依赖..."
  pnpm install > /dev/null 2>&1
  step_ok "依赖已安装"

  step_info "构建生产包..."
  pnpm build > /dev/null 2>&1
  step_ok "前端构建完成"
}

job_deploy_backend() {
  header "DEPLOY" "部署后端"

  step_info "上传二进制到 ${SERVER_IP}..."
  remote_scp "$ROOT_DIR/backend/server" "$SERVER_USER@$SERVER_IP:$REMOTE_BASE/backend/server.new"
  step_ok "上传完成"

  step_info "停止旧进程..."
  remote_exec "PID=\$(ss -tlnp sport = :8088 | grep -oP 'pid=\K\d+' | head -1); [ -n \"\$PID\" ] && kill \$PID && sleep 1 || true" 2>/dev/null
  step_ok "旧进程已停止"

  step_info "替换并启动..."
  # Build env string from workflow JSON
  ENV_STR=""
  while IFS='=' read -r key value; do
    ENV_STR+="$key='$value' "
  done < <(get_backend_env)

  remote_exec "cd $REMOTE_BASE/backend && mv server.new server && chmod +x server && nohup env $ENV_STR ./server > /tmp/backend.log 2>&1 &" 2>/dev/null
  sleep 3
  step_ok "新进程已启动"

  step_info "健康检查..."
  local retries=3
  for i in $(seq 1 $retries); do
    if remote_exec "curl -sf http://127.0.0.1:8088/public/pages > /dev/null" 2>/dev/null; then
      step_ok "健康检查通过"
      return 0
    fi
    [ "$i" -lt "$retries" ] && sleep 2
  done
  step_fail "健康检查失败（服务可能未正常启动，请检查 /tmp/backend.log）"
  exit 1
}

job_deploy_frontend() {
  header "DEPLOY" "部署前端"

  step_info "打包前端产物..."
  tar czf /tmp/frontend-out.tar.gz -C "$ROOT_DIR/frontend/out" .
  step_ok "打包完成"

  step_info "上传到 ${SERVER_IP}..."
  remote_scp /tmp/frontend-out.tar.gz "$SERVER_USER@$SERVER_IP:$REMOTE_BASE/frontend-out.tar.gz"
  step_ok "上传完成"

  step_info "解压并替换..."
  remote_exec "cd $REMOTE_BASE && rm -rf frontend/* && tar xzf frontend-out.tar.gz -C frontend/ && rm frontend-out.tar.gz" 2>/dev/null
  step_ok "前端文件已同步"

  rm -f /tmp/frontend-out.tar.gz

  step_info "重载 Nginx..."
  remote_exec "nginx -t && systemctl reload nginx" 2>/dev/null
  step_ok "Nginx 已重载"
}

# ── Main ──────────────────────────────────────────

main() {
  local workflow="${1:-backend-only}"

  parse_server_conf

  echo -e "${CYAN}══════════════════════════════════════════${NC}"
  echo -e "${CYAN}  印迹官网 · 生产部署${NC}"
  echo -e "${CYAN}══════════════════════════════════════════${NC}"
  echo -e "  工作流: ${YELLOW}${workflow}${NC}"
  echo -e "  目标:   ${SERVER_USER}@${SERVER_IP} → ${REMOTE_BASE}"
  echo -e "  端口:   Nginx ${NGINX_PORT} → Backend 8088"
  echo -e "${CYAN}══════════════════════════════════════════${NC}"

  # Get job list from workflow
  local jobs
  jobs=$(get_workflow_jobs "$workflow") || {
    echo -e "${RED}Unknown workflow: $workflow${NC}"
    echo "Available: backend-only, frontend-only, full"
    exit 1
  }

  # Execute jobs (respecting simple dependency order from JSON)
  for job in $jobs; do
    local fn="job_${job//-/_}"
    if declare -f "$fn" > /dev/null 2>&1; then
      "$fn"
    else
      echo -e "${RED}Unknown job: $job${NC}"; exit 1
    fi
  done

  echo ""
  echo -e "${GREEN}══════════════════════════════════════════${NC}"
  echo -e "${GREEN}  部署完成!${NC}"
  echo -e "${GREEN}══════════════════════════════════════════${NC}"
}

main "$@"
