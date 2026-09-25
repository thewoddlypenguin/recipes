"""Import staged WordPress images into the app's media structure.

Reads a JSON mapping (see README.md in this folder) of recipe slugs to WP
attachment paths like '2025/02/example.jpg', resolves each file under
uploads/wordpress-import/, copies it to uploads/recipes/{slug}/, and updates
the recipe's legacy_* columns and (when empty) image_url.

Missing files are logged and skipped - one bad entry never aborts the run.

Usage (from backend/):
    python -m app.scripts.import_wordpress.import_images --mapping mapping.json
"""

import argparse
import json
import sys
from pathlib import Path

from app.core.database import SessionLocal
from app.models.recipe import Recipe
from app.services.images import import_legacy_image


def load_mapping(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise SystemExit("Mapping file must contain a JSON array of objects.")
    return data


def main() -> None:
    parser = argparse.ArgumentParser(description="Import staged WordPress images.")
    parser.add_argument("--mapping", required=True, help="Path to mapping.json")
    parser.add_argument("--dry-run", action="store_true", help="Report without writing")
    args = parser.parse_args()

    entries = load_mapping(Path(args.mapping))
    print(f"Processing {len(entries)} mapping entries...")

    db = SessionLocal()
    copied = updated = missing = skipped = 0
    try:
        for entry in entries:
            slug = (entry.get("slug") or "").strip()
            attached_file = (entry.get("attached_file") or "").strip()
            if not slug or not attached_file:
                print(f"[skip] entry missing slug or attached_file: {entry}")
                skipped += 1
                continue

            recipe = db.query(Recipe).filter(Recipe.slug == slug).first()
            if recipe is None:
                print(f"[skip] no recipe with slug '{slug}' - import recipes first")
                skipped += 1
                continue

            result = import_legacy_image(attached_file, slug)
            if result is None:
                print(f"[missing] {attached_file} not found under uploads/wordpress-import/ for '{slug}'")
                missing += 1
                continue

            _, public_url = result
            print(f"[ok] {slug}: {attached_file} -> {public_url}")
            copied += 1

            if args.dry_run:
                continue

            recipe.legacy_image_path = attached_file
            if entry.get("wp_post_id") is not None:
                recipe.legacy_wp_post_id = int(entry["wp_post_id"])
            if entry.get("thumbnail_id") is not None:
                recipe.legacy_thumbnail_id = int(entry["thumbnail_id"])
            if not recipe.image_url:
                recipe.image_url = public_url
                recipe.image_alt = recipe.image_alt or recipe.title
            db.commit()
            updated += 1
    finally:
        db.close()

    print(
        f"\nDone. copied={copied} updated={updated} missing={missing} skipped={skipped}"
        + ("  (dry run - nothing written)" if args.dry_run else "")
    )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)