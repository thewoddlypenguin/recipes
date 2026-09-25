# Deployment Guide

Target: a Linux server, source of truth on GitHub, staging under
`justinmikkelsen.com/recipes-staging`.

## 1. First deploy

```bash
# on the server
git clone git@github.com:<you>/mikkelsen-recipes.git && cd mikkelsen-recipes
cp .env.example .env
nano .env     # real POSTGRES_PASSWORD, SECRET_KEY, INITIAL_ADMIN_*, APP_PORT
docker compose up -d --build
```

On first start the backend container:

1. waits for Postgres (healthcheck),
2. runs `alembic upgrade head` (`RUN_MIGRATIONS=true`),
3. seeds the admin user + 6 recipes (`AUTO_SEED=true`).

Then verify:

```bash
curl http://localhost:8080/api/health     # {"status":"ok"}
docker compose logs -f backend            # watch startup
```

The app listens on `APP_PORT` (default 8080). The frontend nginx container
serves the SPA and proxies `/api/` + `/uploads/` to the backend, so only one
HTTP origin is involved.

## 2. Sub-path staging (justinmikkelsen.com/recipes-staging)

If the app is mounted under `/recipes-staging` behind an existing web server
(nginx/Caddy on the host), either:

**Option A — subdomain/port proxy (simplest):** point the existing web server
at the compose port:

```nginx
location /recipes-staging/ {
    proxy_pass http://127.0.0.1:8080/;   # trailing slash strips the prefix
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 25m;
}
```

The SPA uses client-side routing with relative-agnostic `/api` and `/uploads`
calls. When proxying under a sub-path, prefer **Option B**:

**Option B — dedicated subdomain:** `recipes-staging.justinmikkelsen.com` →
`127.0.0.1:8080`. No path rewriting needed; this is the recommended setup.

## 3. Ongoing deploys

```bash
git pull origin main
docker compose up -d --build
```

- Migrations run automatically on backend start.
- `uploads/` (bind mount) and `postgres_data` (volume) survive rebuilds.

## 4. Backups

```bash
# database
docker compose exec db pg_dump -U mikkelsen mikkelsen_recipes > backup_$(date +%F).sql

# media (bind-mounted directory)
tar czf uploads_$(date +%F).tgz uploads/
```

Restore:

```bash
cat backup_2026-09-25.sql | docker compose exec -T db psql -U mikkelsen mikkelsen_recipes
tar xzf uploads_2026-09-25.tgz
```

## 5. Copying WordPress images to staging

The WP upload year folders belong on the server before running the image
importer:

```bash
rsync -a wp-content/uploads/2025/ server:/srv/mikkelsen-recipes/uploads/wordpress-import/2025/
rsync -a wp-content/uploads/2026/ server:/srv/mikkelsen-recipes/uploads/wordpress-import/2026/
```

## 6. TLS

Terminate TLS on the host-level web server (Caddy makes this automatic; nginx
uses certbot). Proxy plain HTTP to the compose port as above — the app does not
need to be TLS-aware.

## 7. Logs & maintenance

```bash
docker compose logs -f                 # everything
docker compose logs -f backend         # API only
docker compose exec backend alembic current   # migration state
docker compose ps                      # service status
```
