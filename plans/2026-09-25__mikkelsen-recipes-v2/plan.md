# Plan: Mikkelsen Family Recipes v2

Replacement for WordPress/Elementor recipe site. Full-stack monorepo.

## Stack
- Frontend: React + Vite + TypeScript + Tailwind CSS v3
- Backend: FastAPI + SQLAlchemy 2.x (sync) + Alembic + PyJWT + bcrypt
- DB: PostgreSQL (docker), SQLite fallback for local smoke tests
- Deploy: Docker Compose (frontend nginx, backend uvicorn, db postgres)

## Key routes
Public: `/` browse, `/recipes/:slug`, `/recipes/:slug/cook`, `/weekly-menu`, `/login`
Admin: `/admin/recipes/new`, `/admin/recipes/:id/edit`

## Design tokens (from mockup)
- cream bg #F6F2E9, white cards, sage primary #7D9B72, terracotta cook-mode #BC6437,
  muted blue secondary #5B7F97, charcoal text #2E2A24, warm-gray borders #E4DDD0

## API contract (frontend depends on this)
- POST /api/auth/login {email,password} -> {access_token, user}
- GET /api/recipes?q&course&cuisine&diet&equipment&ingredient&tag&status&limit&offset
- POST/PUT /api/recipes, GET /api/recipes/{slug}, GET /api/recipes/id/{id}, DELETE archives
- GET/POST /api/terms?type=
- POST /api/uploads/images (multipart: file, recipe_slug) -> {url}
- GET /api/weekly-menu?week_start=YYYY-MM-DD (get-or-create), PUT /api/weekly-menu/{id}

## Build order
1. Scaffolding + Docker
2. Backend core/models/schemas/routes + Alembic
3. Seed data + WP import scripts
4. Frontend (all pages/components)
5. Verify: alembic on sqlite, seed, curl API, vite build, docker compose config
6. README + docs/

## Decisions
- All tasks self (tight coupling between API contract, design tokens, mockup fidelity)
- image_url nullable; seed generates local SVG placeholders into uploads/recipes/{slug}/
- DELETE /api/recipes/{id} archives (soft) to protect family data
- Terms auto-created from recipe classification + ingredient names on save
