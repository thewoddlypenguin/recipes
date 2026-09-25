#!/usr/bin/env bash
# Local development launcher: backend (FastAPI + SQLite/Postgres) + frontend (Vite).
#
#   ./start.sh            # first run installs deps, migrates, seeds, then serves
#
# Backend: http://localhost:8000  (API docs at /docs)
# Frontend: http://localhost:5173 (proxies /api and /uploads to the backend)

set -e
cd "$(dirname "$0")"

echo "==> Starting backend"
(
  cd backend
  if [ ! -d .venv ]; then
    python3 -m venv .venv
    .venv/bin/pip install -r requirements.txt
  fi
  export DATABASE_URL="${DATABASE_URL:-sqlite:///./dev.db}"
  .venv/bin/alembic upgrade head
  .venv/bin/python -m app.seed.seed_data
  exec .venv/bin/uvicorn app.main:app --port 8000
) &
BACK_PID=$!

trap 'kill $BACK_PID 2>/dev/null' EXIT

echo "==> Starting frontend"
cd frontend
if [ ! -d node_modules ]; then
  npm install --no-fund --no-audit
fi
npm run dev