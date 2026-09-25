# WordPress Migration Notes

The old site (`recipes.justinmikkelsen.com`) is WordPress with:

- **Elementor / Elementor Pro** — page layout, custom post HTML
- **Advanced Custom Fields (ACF)** — extra recipe fields
- **WP Recipe Maker (WPRM)** — structured recipes
- **Search & Filter** + **The Post Grid** — browse/filter UI
- **Code Snippets** — injected the legacy `<!--R_*_*-->` comment markers

## Source-of-truth mappings

WordPress featured-image chain (see `wordpress_queries.sql` for runnable SQL):

```
recipe post ID
  → wp_postmeta._thumbnail_id
  → attachment post ID
  → wp_postmeta._wp_attached_file      e.g. "2025/02/example-image.jpg"
  → uploads/wordpress-import/YYYY/MM/example-image.jpg   (staged copy)
  → uploads/recipes/{recipe_slug}/example-image.jpg      (imported copy)
```

`_wp_attachment_metadata` holds serialized size data for each attachment.

## Non-negotiables

1. **The new app never references WordPress paths at runtime.** Importers copy
   files into `uploads/recipes/{slug}/` and store the new public URL in
   `recipes.image_url`.
2. **Legacy fields are kept for traceability** — `legacy_wp_post_id`,
   `legacy_wp_slug`, `legacy_thumbnail_id`, `legacy_image_path`,
   `legacy_image_url`, `import_notes`.
3. **Missing images never crash the import** — they are logged (`[missing] …`)
   and the recipe still imports; re-running the importer fills gaps.

## Staging image layout

```
uploads/wordpress-import/2025/…   ← copy of wp-content/uploads/2025/…
uploads/wordpress-import/2026/…   ← copy of wp-content/uploads/2026/…
```

Resolve `2025/02/example.jpg` as
`uploads/wordpress-import/2025/02/example.jpg`.

## Legacy content markers

Old snippets wrapped recipe parts in post content:

```
<!--R_SUMMARY_START--> … <!--R_SUMMARY_END-->
<!--R_QUICKFACTS_START--> … <!--R_QUICKFACTS_END-->
<!--R_INGREDIENTS_START--> … <!--R_INGREDIENTS_END-->
<!--R_INSTRUCTIONS_START--> … <!--R_INSTRUCTIONS_END-->
<!--R_NOTES_START--> … <!--R_NOTES_END-->
```

`import_recipes.py` parses these first; `R_QUICKFACTS` lines like
`Prep Time: 10 minutes` / `Servings: 4` map to the time/servings columns.

## WP Recipe Maker fallback

If markers are absent, the importer falls back to WPRM postmeta
(`_wprm_recipe_meta` and friends). WPRM's format varies across versions, so
treat imported ingredient rows as a *starting point* — review each recipe after
import.

## Recommended migration order

1. Export content: WP admin → Tools → Export → All content (`wxr.xml`).
2. Stage images on the server (see deployment guide §5).
3. Dry run: `python -m app.scripts.import_wordpress.import_recipes --wxr wxr.xml --dry-run`
4. Import: same command without `--dry-run` (recipes import as drafts).
5. Build `mapping.json` (slug + `_wp_attached_file` per recipe; the SQL in
   `wordpress_queries.sql` produces exactly these columns).
6. Import images: `python -m app.scripts.import_wordpress.import_images --mapping mapping.json`
7. Review each draft in `/admin/recipes/:id/edit`, fix anything the importer
   couldn't infer, publish when happy.
8. Once live, optionally add redirect rules from old WP slugs — legacy WP URLs
   match the new `/recipes/{slug}` structure because slugs are preserved via
   `legacy_wp_slug`/`slug`.

## Importer guarantees

- Idempotent: matched by `legacy_wp_post_id` / slug; re-runs update, not duplicate.
- One bad post/attachment logs a `[error]`/`[missing]` line and continues.
- Recipes without recognizable recipe data are skipped, not created empty.
