"""Image storage: runtime uploads and generated seed placeholders.

Layout under the persistent uploads root (UPLOAD_DIR):
  uploads/recipes/{recipe_slug}/<files>
"""

import re
import time
import unicodedata
from pathlib import Path

from app.core.config import settings

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


def slug_for_path(slug: str) -> str:
    slug = unicodedata.normalize("NFKD", slug or "").encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-zA-Z0-9-_]+", "-", slug).strip("-").lower()
    return slug or "misc"


def uploads_root() -> Path:
    root = Path(settings.upload_dir)
    root.mkdir(parents=True, exist_ok=True)
    return root


def recipe_media_dir(recipe_slug: str) -> Path:
    directory = uploads_root() / "recipes" / slug_for_path(recipe_slug)
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def sanitize_filename(name: str) -> str:
    name = Path(name or "image.jpg").name
    stem = slug_for_path(Path(name).stem) or "image"
    ext = Path(name).suffix.lower().lstrip(".")
    if ext not in ALLOWED_EXTENSIONS:
        ext = "jpg"
    return f"{stem}.{ext}"


def save_uploaded_image(contents: bytes, original_name: str, recipe_slug: str | None) -> tuple[Path, str]:
    """Persist an uploaded image under uploads/recipes/{slug}/ and return (path, public_url)."""
    ext = Path(original_name or "").suffix.lower().lstrip(".")
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: .{ext or '(none)'}")

    target_dir = recipe_media_dir(recipe_slug or "misc")
    filename = f"{int(time.time())}-{sanitize_filename(original_name)}"
    path = target_dir / filename
    path.write_bytes(contents)
    public_url = f"{settings.public_upload_url}/recipes/{target_dir.name}/{filename}"
    return path, public_url


# --------------------------------------------------------------------------
# Legacy WordPress image import helper
# --------------------------------------------------------------------------

def find_legacy_image(attached_file: str) -> Path | None:
    """Resolve a WP attached-file path like '2025/02/example.jpg' inside
    uploads/wordpress-import/. Returns None when the file is missing."""
    clean = (attached_file or "").strip().lstrip("/")
    if not clean:
        return None
    candidate = uploads_root() / "wordpress-import" / clean
    return candidate if candidate.is_file() else None


def import_legacy_image(attached_file: str, recipe_slug: str) -> tuple[Path, str] | None:
    """Copy a staged WordPress image into the app's own media structure.

    Returns (new_path, public_url) or None when the source file is missing.
    """
    source = find_legacy_image(attached_file)
    if source is None:
        return None
    target_dir = recipe_media_dir(recipe_slug)
    target = target_dir / source.name
    if not target.exists():
        target.write_bytes(source.read_bytes())
    public_url = f"{settings.public_upload_url}/recipes/{target_dir.name}/{target.name}"
    return target, public_url


# --------------------------------------------------------------------------
# Seed placeholder generation (graceful cards until real photos exist)
# --------------------------------------------------------------------------

def write_placeholder_svg(recipe_slug: str, title: str, emoji: str = "🍽️") -> str:
    """Generate a warm SVG placeholder for a recipe; returns its public URL."""
    safe_title = (title or recipe_slug).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#E8EBDD"/>
      <stop offset="0.55" stop-color="#D9E2CE"/>
      <stop offset="1" stop-color="#C9D6BD"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <circle cx="660" cy="110" r="150" fill="#F6F2E9" opacity="0.55"/>
  <circle cx="90" cy="520" r="120" fill="#F6F2E9" opacity="0.4"/>
  <text x="400" y="300" font-size="140" text-anchor="middle">{emoji}</text>
  <text x="400" y="420" font-family="Georgia, serif" font-size="34" fill="#4A4638" text-anchor="middle">{safe_title}</text>
  <text x="400" y="470" font-family="Georgia, serif" font-size="20" fill="#7C7767" text-anchor="middle" font-style="italic">Mikkelsen Family Recipes</text>
</svg>
"""
    target_dir = recipe_media_dir(recipe_slug)
    path = target_dir / "hero.svg"
    path.write_text(svg, encoding="utf-8")
    return f"{settings.public_upload_url}/recipes/{target_dir.name}/hero.svg"