from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import auth, recipes, terms, uploads, weekly_menu
from app.core.config import settings

app = FastAPI(
    title="Mikkelsen Family Recipes API",
    version="1.0.0",
    description="Custom family recipe app replacing the WordPress/Elementor site.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(recipes.router, prefix="/api/recipes", tags=["recipes"])
app.include_router(terms.router, prefix="/api/terms", tags=["terms"])
app.include_router(weekly_menu.router, prefix="/api/weekly-menu", tags=["weekly-menu"])
app.include_router(uploads.router, prefix="/api", tags=["uploads"])


@app.get("/api/health", tags=["health"])
def health() -> dict:
    return {"status": "ok"}


# Serve uploaded media (persistent volume in production).
uploads_path = Path(settings.upload_dir)
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount(settings.public_upload_url, StaticFiles(directory=str(uploads_path)), name="uploads")