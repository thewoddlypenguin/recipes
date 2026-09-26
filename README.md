# Mikkelsen Family Recipes

A warm, fast, mobile-first family recipe app — a custom replacement for the
old WordPress/Elementor site at `recipes.justinmikkelsen.com`.

- Browse, search, and filter recipes (course, cuisine, diet, ingredient, equipment, tags)
- Beautiful recipe pages with structured ingredients, step timers, and notes
- **Cooking Mode** — full-screen, terracotta-themed, screen wake lock, step-by-step
- **Weekly Menu** — plan dinners Monday–Sunday and print the week
- Admin/editor login with structured add/edit forms and image uploads
- WordPress migration tooling (WXR importer + staged image importer)

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Backend | FastAPI (Python 3.12) + SQLAlchemy 2.x + Alembic |
| Database | PostgreSQL 16 (SQLite fallback for local dev) |
| Auth | JWT bearer tokens (PyJWT + bcrypt), roles: admin / editor / viewer |
| Deploy | Docker Compose (nginx frontend + uvicorn backend + Postgres) |

## Repository layout

```
backend/
  app/
    api/routes/        auth, recipes, terms, uploads, weekly-menu
    core/              config, database, security, utils
    models/            SQLAlchemy models
    schemas/           Pydantic schemas
    scripts/           entrypoint + import_wordpress/ migration tools
    seed/              seed_data.py (admin + 6 family recipes)
    services/          recipe persistence + image storage
    tests/             pytest API tests
  alembic/             migrations
frontend/
  src/
    api/               typed API client
    components/        Header, RecipeCard, CookMode*, editors, etc.
    hooks/             useAuth, useWakeLock
    pages/             Browse, RecipeDetail, CookMode, WeeklyMenu, Login, admin/
  nginx.conf           production SPA + API proxy
uploads/               persistent media (volume-mounted)
  recipes/             app-owned images: uploads/recipes/{slug}/...
  wordpress-import/    staged WP year folders (2025/, 2026/) — source only
docs/                  deployment, schema, migration notes
```

## Quick start (local, no Docker)

Requires Python 3.12 and Node 20+.

```bash
./start.sh
```

- Backend: http://localhost:8000 (Swagger docs at `/docs`)
- Frontend: http://localhost:5173 (dev server proxies `/api` and `/uploads`)
- Without `DATABASE_URL`, the backend uses a local SQLite file (`backend/dev.db`),
  so you can develop with zero setup. For Postgres locally:
  `export DATABASE_URL=postgresql+psycopg://mikkelsen:change-me@localhost:5432/mikkelsen_recipes`
- Local image uploads/seed placeholders land in `backend/uploads/` (override with `UPLOAD_DIR`).

## Running with Docker Compose (staging/production)

```bash
cp .env.example .env         # then edit values (passwords, secret key!)
docker compose up -d --build
docker compose exec backend alembic upgrade head   # if RUN_MIGRATIONS=false
docker compose exec backend python -m app.seed.seed_data
```

- App: http://localhost:8080 (set `APP_PORT` to change)
- `uploads/` is bind-mounted into the backend — media survives rebuilds.
- `postgres_data/` is a named volume — database survives rebuilds.
- The frontend nginx container serves the SPA and proxies `/api` and `/uploads`
  to the backend, so the browser only ever talks to one origin.

### Deployment flow (GitHub → server)

```bash
git pull origin main
docker compose up -d --build
```

The backend container runs `alembic upgrade head` on start (configurable via
`RUN_MIGRATIONS`) and can auto-seed (`AUTO_SEED=true`). See
[docs/deployment.md](docs/deployment.md) for reverse-proxy/TLS notes for
`justinmikkelsen.com/recipes-staging`.

## Environment variables

Copy `.env.example` → `.env` and fill in real values. Key variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | `postgresql+psycopg://user:pass@db:5432/dbname` |
| `SECRET_KEY` | JWT signing secret — set a long random string |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Session lifetime (default 1440 = 24 h) |
| `UPLOAD_DIR` | Where images are stored (`/app/uploads` in Docker) |
| `PUBLIC_UPLOAD_URL` | Public mount path (`/uploads`) |
| `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` | Seed admin credentials |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `VITE_BASE_PATH` | Deployment sub-path for the SPA (`/recipes-staging/` for staging, `/` for root) — baked at frontend build time |
| `VITE_JUSTINSPACE_URL` | Header link target for “JustinSpace” |

Never commit `.env`.

## Database migrations

```bash
# inside backend/ (or docker compose exec backend)
alembic upgrade head                              # apply
alembic revision --autogenerate -m "describe"     # create new migration
alembic downgrade -1                              # roll back one step
```

Schema reference: [docs/database-schema.md](docs/database-schema.md).

## Seed data

Six published family recipes with generated placeholder images plus an admin
user (from `INITIAL_ADMIN_EMAIL`/`INITIAL_ADMIN_PASSWORD`):

```bash
python -m app.seed.seed_data     # idempotent — safe to re-run
```

Recipes: One Pot Lemon Ricotta Pasta · One Pot Creamy Garlic Pasta ·
Miso Chicken Ramen · Absolutely Ultimate Potato Soup · Sweet Cornbread ·
Almond Poppy Seed Bread.

## Image uploads

- `POST /api/uploads/images` (multipart, editors/admins only) validates the
  file type (jpg/jpeg/png/webp, 10 MB max), stores it under
  `uploads/recipes/{recipe_slug}/`, and returns a public URL which the form
  stores in `recipes.image_url`.
- The database stores app-owned URLs like `/uploads/recipes/one-pot-lemon-ricotta-pasta/hero.jpg`
  — never WordPress paths.
- Legacy WordPress images are imported by *copying* them into
  `uploads/recipes/{slug}/` first. See the next section.

## WordPress migration

Full notes: [docs/wordpress-migration-notes.md](docs/wordpress-migration-notes.md)
and [backend/app/scripts/import_wordpress/README.md](backend/app/scripts/import_wordpress/README.md).

```bash
# recipes from a WXR export (imports as drafts)
python -m app.scripts.import_wordpress.import_recipes --wxr export.xml --dry-run

# featured images from the staged year folders
python -m app.scripts.import_wordpress.import_images --mapping mapping.json
```

## Tests

```bash
cd backend
.venv/bin/python -m pytest tests/ -q
```

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `relation "recipes" does not exist` / empty browse page | Run `alembic upgrade head`, then seed. |
| Images 404 after rebuild | Ensure `./uploads` is bind-mounted and `UPLOAD_DIR=/app/uploads`. |
| Login always 401 | `SECRET_KEY` changed after tokens were issued — log in again; check `INITIAL_ADMIN_*` values used at seed time. |
| CORS errors from the frontend | Add the frontend origin to `CORS_ORIGINS`, or serve both through the nginx proxy (default in compose). |
| 413 on upload | Image exceeds 10 MB; also check nginx `client_max_body_size` (25m in `frontend/nginx.conf`). |
| White screen, console shows `TypeError: t.filter is not a function` (or `Expected JSON from /api/... but received text/html`) | The frontend is calling root-absolute `/api/...` while deployed under a sub-path — the host serves the SPA shell (HTML, 200) and the app crashes. Set `VITE_BASE_PATH=/recipes-staging/` and rebuild the frontend image. |
| `/favicon.ico` 404 | Harmless; the app ships `favicon.svg` linked from `index.html`. |
