#!/bin/sh
set -e

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "Running database migrations..."
  alembic upgrade head
fi

if [ "$AUTO_SEED" = "true" ]; then
  echo "Seeding database (idempotent)..."
  python -m app.seed.seed_data || echo "Seed failed, continuing startup."
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 8000