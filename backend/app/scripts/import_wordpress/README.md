# WordPress Import Tools

Scripts for migrating the old WordPress site (Elementor + ACF + WP Recipe Maker)
into Mikkelsen Family Recipes. They are safe to re-run: existing recipes are
matched by `legacy_wp_post_id` / slug and skipped.

## Staging image layout

WordPress upload-year folders are copied to the staging server as:

```
uploads/wordpress-import/2025/...   (from wp-content/uploads/2025/...)
uploads/wordpress-import/2026/...   (from wp-content/uploads/2026/...)
```

WP attachment records reference files like `2025/02/example-image.jpg`, which
resolve to `uploads/wordpress-import/2025/02/example-image.jpg`.

**Never reference those paths from live recipe data.** The importer copies each
image into the app's own media structure first:

```
uploads/recipes/{recipe_slug}/example-image.jpg
```

…then stores the new public URL in `recipes.image_url` and keeps the original
path in `recipes.legacy_image_path` for traceability. Missing files are logged
and skipped — the import never crashes on one bad image.

## Scripts

| Script | Purpose |
| --- | --- |
| `import_images.py` | Copy staged WP images into `uploads/recipes/{slug}/` and update recipe records. Reads a JSON mapping file (see below). |
| `import_recipes.py` | Parse a WordPress WXR export (`wp-admin/export.php`), extract recipe content from the legacy `<!--R_*_START-->` comment markers + WP Recipe Maker blocks, and create recipes with `legacy_*` fields populated. |
| `wordpress_queries.sql` | Reference SQL for mapping posts → featured images → attachment files. |

## Running

From `backend/` (with the venv active and `DATABASE_URL` set):

```bash
# 1. Export from WP admin: Tools -> Export -> All content, save as wxr.xml

# 2. Import recipes (dry run first!)
python -m app.scripts.import_wordpress.import_recipes --wxr /path/to/wxr.xml --dry-run
python -m app.scripts.import_wordpress.import_recipes --wxr /path/to/wxr.xml

# 3. Import featured images for imported recipes
python -m app.scripts.import_wordpress.import_images --mapping /path/to/mapping.json
```

## Image mapping file format

`mapping.json` (a list, one entry per recipe):

```json
[
  {
    "slug": "one-pot-lemon-ricotta-pasta",
    "wp_post_id": 412,
    "thumbnail_id": 415,
    "attached_file": "2025/02/lemon-ricotta-pasta.jpg"
  }
]
```

Fields:

- `slug` (required) — destination recipe slug
- `attached_file` (required) — WP `_wp_attached_file` meta value
- `wp_post_id`, `thumbnail_id` (optional) — stored in `legacy_wp_post_id` /
  `legacy_thumbnail_id`

## Legacy content markers

Old Code Snippets injected these markers into post content; the importer parses
them first, then falls back to WP Recipe Maker data, then to plain text:

```
<!--R_SUMMARY_START--> ... <!--R_SUMMARY_END-->
<!--R_QUICKFACTS_START--> ... <!--R_QUICKFACTS_END-->
<!--R_INGREDIENTS_START--> ... <!--R_INGREDIENTS_END-->
<!--R_INSTRUCTIONS_START--> ... <!--R_INSTRUCTIONS_END-->
<!--R_NOTES_START--> ... <!--R_NOTES_END-->
```

## Notes

- Recipes import as `status=draft` by default so nothing half-converted goes
  live; pass `--publish` to publish imported recipes.
- All `legacy_*` columns are filled for traceability back to WP IDs.
- If a recipe has no recognizable recipe data, it is logged to `import.log`
  and skipped (no empty recipes created).
