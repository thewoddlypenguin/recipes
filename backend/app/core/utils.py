"""Shared helpers: slugs, timestamps, term normalization."""

import re
from datetime import datetime, timezone


def utcnow() -> datetime:
    """Naive UTC datetime (portable across SQLite and PostgreSQL)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def slugify(text: str) -> str:
    text = (text or "").lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "item"


def unique_slug(db, model, base: str, exclude_id: int | None = None) -> str:
    """Return a slug derived from `base` that is unique for `model`."""
    base = slugify(base)
    candidate = base
    n = 2
    while True:
        query = db.query(model).filter(model.slug == candidate)
        if exclude_id is not None:
            query = query.filter(model.id != exclude_id)
        if query.first() is None:
            return candidate
        candidate = f"{base}-{n}"
        n += 1


def parse_term_names(raw: str | None) -> list[str]:
    """Parse a comma-separated filter param into a clean list."""
    if not raw:
        return []
    return [part.strip() for part in raw.split(",") if part.strip()]