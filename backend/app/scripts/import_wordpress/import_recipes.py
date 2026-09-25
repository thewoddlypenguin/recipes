"""Import recipes from a WordPress WXR export file.

Parses a WordPress eXtended RSS export (Tools -> Export) and creates recipes:
- Content is extracted from legacy comment markers first
  (<!--R_INGREDIENTS_START--> etc.), then WP Recipe Maker postmeta if present,
  then plain-text fallback.
- Taxonomy terms (category/post_tag/custom) are mapped to term types by name.
- Featured images are recorded via legacy_thumbnail_id + legacy_image_url;
  run import_images.py afterwards to copy the actual files.
- Imported recipes start as drafts (pass --publish to publish immediately).
- Every recipe keeps legacy_wp_post_id / legacy_wp_slug for traceability.

Usage (from backend/):
    python -m app.scripts.import_wordpress.import_recipes --wxr export.xml --dry-run
"""

import argparse
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from app.core.database import SessionLocal
from app.models.recipe import Recipe
from app.schemas.recipe import IngredientIn, NoteIn, RecipeIn, StepIn, TermRefIn
from app.services.recipes import apply_recipe_payload

WXR_NAMESPACES = {
    "content": "http://purl.org/rss/1.0/modules/content/",
    "wp": "http://wordpress.org/export/1.2/",
    "dc": "http://purl.org/dc/elements/1.1/",
}

MARKERS = ("SUMMARY", "QUICKFACTS", "INGREDIENTS", "INSTRUCTIONS", "NOTES")

QUANTITY_UNITS = (
    "cups", "cup", "tbsp", "tablespoons", "tsp", "teaspoons", "lbs", "lb", "oz",
    "cans", "can", "cloves", "clove", "slices", "slices", "tsp", "pints", "quarts",
    "packs", "sticks", "tbsp",
)

# Term taxonomy names in the old site -> our term types
TAXONOMY_MAP = {
    "category": "course",
    "post_tag": "tag",
    "cuisine": "cuisine",
    "diet": "diet",
    "equipment": "equipment",
    "ingredients": "ingredient",
}


def extract_marker(content: str, name: str) -> str | None:
    m = re.search(
        rf"<!--\s*R_{name}_START\s*-->(.*?)<!--\s*R_{name}_END\s*-->",
        content or "",
        re.DOTALL | re.IGNORECASE,
    )
    return m.group(1).strip() if m else None


def strip_html(html: str) -> str:
    text = re.sub(r"<[^>]+>", "\n", html)
    text = re.sub(r"\n{2,}", "\n", text)
    return "\n".join(line.strip() for line in text.splitlines() if line.strip())


def parse_ingredients(block: str) -> list[IngredientIn]:
    rows = []
    for i, line in enumerate(strip_html(block).splitlines()):
        original = line.strip()
        if not original or original.lower().startswith(("ingredient", "for the")):
            continue
        row = IngredientIn(ingredient_name=original, original_text=original, sort_order=len(rows))
        m = re.match(rf"^([\d½¼¾⅓⅔⅛\s./\-]+)\s+({ '|'.join(QUANTITY_UNITS) })\s+(.*)$", original, re.IGNORECASE)
        if m:
            row.quantity = m.group(1).strip()
            row.unit = m.group(2).lower()
            rest = m.group(3).strip()
            if "," in rest:
                name, prep = rest.split(",", 1)
                row.ingredient_name = name.strip()
                row.preparation = prep.strip()
            else:
                row.ingredient_name = rest
        else:
            m2 = re.match(r"^([\d½¼¾⅓⅔⅛\s./\-]+)\s+(.*)$", original)
            if m2:
                row.quantity = m2.group(1).strip()
                rest = m2.group(2).strip()
                if "," in rest:
                    name, prep = rest.split(",", 1)
                    row.ingredient_name = name.strip()
                    row.preparation = prep.strip()
                else:
                    row.ingredient_name = rest
        rows.append(row)
    return rows


def parse_steps(block: str) -> list[StepIn]:
    lines = [line for line in strip_html(block).splitlines() if line.strip()]
    steps = []
    for line in lines:
        cleaned = re.sub(r"^\d+[.)]\s*", "", line)
        timer = None
        tm = re.search(r"(\d+)\s*(?:minutes?|mins?)", cleaned, re.IGNORECASE)
        if tm and re.search(r"\b(bake|cook|simmer|rest|chill|boil|roast)\b", cleaned, re.IGNORECASE):
            timer = int(tm.group(1))
        steps.append(StepIn(body=cleaned, timer_minutes=timer, sort_order=len(steps)))
    return steps


def parse_wxr_postmeta(item, key: str) -> str | None:
    for meta in item.findall("wp:postmeta", WXR_NAMESPACES):
        mk = meta.findtext("wp:meta_key", default="", namespaces=WXR_NAMESPACES)
        if mk == key:
            return meta.findtext("wp:meta_value", default=None, namespaces=WXR_NAMESPACES)
    return None


def parse_terms(item) -> list[TermRefIn]:
    refs = []
    for cat in item.findall("category"):
        taxonomy = cat.attrib.get("domain", "category")
        term_type = TAXONOMY_MAP.get(taxonomy)
        name = (cat.text or "").strip()
        if term_type and name and name.lower() != "uncategorized":
            refs.append(TermRefIn(type=term_type, name=name))
    return refs


def build_payload(item, thumbnail_files: dict[str, str]) -> RecipeIn | None:
    title = item.findtext("title", default="").strip()
    slug = item.findtext("wp:post_name", default="", namespaces=WXR_NAMESPACES).strip()
    post_id = item.findtext("wp:post_id", default="", namespaces=WXR_NAMESPACES).strip()
    content_el = item.find("content:encoded", WXR_NAMESPACES)
    content = content_el.text or "" if content_el is not None else ""

    summary = extract_marker(content, "SUMMARY")
    ingredients_block = extract_marker(content, "INGREDIENTS")
    instructions_block = extract_marker(content, "INSTRUCTIONS")
    notes_block = extract_marker(content, "NOTES")

    ingredients = parse_ingredients(ingredients_block) if ingredients_block else []
    steps = parse_steps(instructions_block) if instructions_block else []
    notes = [NoteIn(body=line, sort_order=i) for i, line in enumerate(strip_html(notes_block or "").splitlines())]

    # Fallback: WP Recipe Maker postmeta (JSON) if markers are absent.
    wprm = parse_wxr_postmeta(item, "_wprm_recipe_meta")
    if not ingredients and not steps and wprm:
        # WPRM formats vary by version; treat as plain text for manual cleanup.
        ingredients = parse_ingredients(wprm)

    if not ingredients and not steps:
        return None  # not a recipe post we can convert

    quickfacts = extract_marker(content, "QUICKFACTS") or ""
    prep = cook = servings = None
    for line in quickfacts.splitlines():
        low = line.lower()
        nums = re.findall(r"\d+", line)
        if not nums:
            continue
        if "prep" in low:
            prep = int(nums[0])
        elif "cook" in low:
            cook = int(nums[0])
        elif "serving" in low or "yield" in low:
            servings = int(nums[0])

    thumbnail_id = parse_wxr_postmeta(item, "_thumbnail_id")
    legacy_image = thumbnail_files.get(thumbnail_id or "") if thumbnail_id else None

    return RecipeIn(
        title=title or slug or f"Imported recipe {post_id}",
        slug=slug or None,
        summary=(strip_html(summary) if summary else "")[:500],
        description="",
        servings=servings,
        prep_minutes=prep,
        cook_minutes=cook,
        status="draft",  # import as draft; use --publish to publish immediately
        ingredients=ingredients,
        steps=steps,
        notes=notes,
        terms=parse_terms(item),
        image_url=None,  # filled by import_images.py
        image_alt=title or None,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Import recipes from a WP WXR export.")
    parser.add_argument("--wxr", required=True, help="Path to the WordPress WXR export file")
    parser.add_argument("--dry-run", action="store_true", help="Report without writing")
    parser.add_argument("--publish", action="store_true", help="Publish imported recipes instead of drafting")
    args = parser.parse_args()

    tree = ET.parse(args.wxr)
    root = tree.getroot()
    channel = root.find("channel")
    if channel is None:
        raise SystemExit("Not a valid WXR file (no <channel> element).")

    items = channel.findall("item")
    posts = [i for i in items if i.findtext("wp:post_type", default="", namespaces=WXR_NAMESPACES) == "post"]
    # attachment _wp_attached_file lives in the attachment item's postmeta
    thumb_files: dict[str, str] = {}
    for i in items:
        if i.findtext("wp:post_type", default="", namespaces=WXR_NAMESPACES) != "attachment":
            continue
        att_id = i.findtext("wp:post_id", default="", namespaces=WXR_NAMESPACES)
        attached = parse_wxr_postmeta(i, "_wp_attached_file")
        if att_id and attached:
            thumb_files[att_id] = attached

    print(f"WXR loaded: {len(posts)} posts, {len(thumb_files)} attachments with files.")
    db = SessionLocal()
    created = updated = skipped = 0
    log = []
    try:
        for item in posts:
            post_id = item.findtext("wp:post_id", default="", namespaces=WXR_NAMESPACES)
            title = item.findtext("title", default="(untitled)").strip()
            slug = item.findtext("wp:post_name", default="", namespaces=WXR_NAMESPACES).strip()
            try:
                payload = build_payload(item, thumb_files)
            except Exception as exc:  # never let one post kill the import
                log.append(f"[error] '{title}' (id={post_id}): {exc}")
                skipped += 1
                continue

            if payload is None:
                log.append(f"[skip] '{title}' (id={post_id}): no recipe data found")
                skipped += 1
                continue

            if args.publish:
                payload.status = "published"

            existing = db.query(Recipe).filter(Recipe.slug == payload.slug).first() if payload.slug else None
            if existing is None and post_id:
                existing = db.query(Recipe).filter(Recipe.legacy_wp_post_id == int(post_id)).first()

            thumb_id = parse_wxr_postmeta(item, "_thumbnail_id")
            attached_file = thumb_files.get(thumb_id or "") if thumb_id else None

            if args.dry_run:
                action = "update" if existing else "create"
                log.append(f"[dry-run {action}] '{payload.title}' slug={payload.slug} "
                           f"ingredients={len(payload.ingredients)} steps={len(payload.steps)} "
                           f"image={attached_file or 'none'}")
                created += existing is None
                updated += existing is not None
                continue

            if existing is not None:
                apply_recipe_payload(db, existing, payload)
                existing.legacy_wp_post_id = int(post_id) if post_id else existing.legacy_wp_post_id
                existing.legacy_wp_slug = slug or existing.legacy_wp_slug
                existing.legacy_thumbnail_id = int(thumb_id) if thumb_id else existing.legacy_thumbnail_id
                existing.legacy_image_path = attached_file or existing.legacy_image_path
                db.commit()
                updated += 1
                log.append(f"[updated] '{payload.title}' (wp id={post_id})")
            else:
                recipe = Recipe()
                apply_recipe_payload(db, recipe, payload)
                if post_id:
                    recipe.legacy_wp_post_id = int(post_id)
                recipe.legacy_wp_slug = slug or None
                recipe.legacy_thumbnail_id = int(thumb_id) if thumb_id else None
                recipe.legacy_image_path = attached_file or None
                db.add(recipe)
                db.commit()
                created += 1
                log.append(f"[created] '{payload.title}' (wp id={post_id})")
    finally:
        db.close()

    for line in log:
        print(line)
    print(f"\nDone. created={created} updated={updated} skipped={skipped}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)