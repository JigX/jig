#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

MODE=${1:-frontend}
PIDS=()

cleanup() {
  echo -e "\n${YELLOW}Stopping...${NC}"
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

case "$MODE" in
  frontend)
    echo -e "${GREEN}JIG dev — frontend only (API → staging)${NC}"
    echo -e "${YELLOW}URL: http://localhost:3000${NC}\n"
    cd "$(dirname "$0")/frontend"
    INTERNAL_API_URL=https://jig-staging.indeweygerlings.com npm run dev
    ;;

  full)
    echo -e "${GREEN}JIG dev — full stack (local backend + frontend)${NC}"
    echo -e "${YELLOW}Port-forwarding staging Postgres...${NC}"

    kubectl port-forward -n jig-staging svc/jig-postgres 5432:5432 &>/tmp/jig-pf.log &
    PIDS+=($!)
    sleep 2

    echo -e "${YELLOW}Starting backend on :8000${NC}"
    cd "$(dirname "$0")/backend"
    DATABASE_URL="postgresql+asyncpg://jig:6Px3fJvJrhdYqvshMyLTaEwxecvWGihc@localhost:5432/jig" \
    SECRET_KEY="dev-secret-not-for-production" \
    REDIS_URL="redis://localhost:6379/0" \
    AI_PROVIDER="ollama" \
    OLLAMA_BASE_URL="http://ollama.ai.svc.cluster.local:11434" \
      uvicorn app.main:app --reload --port 8000 &
    PIDS+=($!)

    echo -e "${YELLOW}Starting frontend on :3000${NC}"
    echo -e "${GREEN}URL: http://localhost:3000${NC}\n"
    cd "$(dirname "$0")/frontend"
    INTERNAL_API_URL=http://localhost:8000 npm run dev
    ;;

  *)
    echo -e "${RED}Usage: ./dev.sh [frontend|full]${NC}"
    echo ""
    echo "  frontend  — Next.js lokaal, API naar staging (standaard, snel)"
    echo "  full      — backend + frontend lokaal, Postgres via port-forward"
    exit 1
    ;;
esac
