-- Reference queries for the WordPress -> Mikkelsen Family Recipes migration.
-- Run these against a COPY of the old WordPress database (read-only!).
-- They document how recipes map to featured images so the Python importers
-- can be verified/supplemented manually.

-- 1) Recipes (posts) with featured-image attachment info.
--    post -> _thumbnail_id -> attachment post -> _wp_attached_file
SELECT
  p.ID AS recipe_id,
  p.post_title AS recipe_title,
  p.post_name AS recipe_slug,
  p.post_status AS post_status,
  p.post_date AS post_date,
  p.post_content AS post_content,
  thumb.meta_value AS thumbnail_attachment_id,
  a.guid AS attachment_guid,
  file.meta_value AS attached_file
FROM wp_posts p
LEFT JOIN wp_postmeta thumb
  ON thumb.post_id = p.ID
  AND thumb.meta_key = '_thumbnail_id'
LEFT JOIN wp_posts a
  ON a.ID = thumb.meta_value
LEFT JOIN wp_postmeta file
  ON file.post_id = a.ID
  AND file.meta_key = '_wp_attached_file'
WHERE p.post_status IN ('publish', 'draft')
ORDER BY p.post_title;

-- 2) Attachment metadata (sizes, original filenames) for the featured images above.
SELECT
  att.ID AS attachment_id,
  att.guid AS attachment_guid,
  file.meta_value AS attached_file,
  meta.meta_value AS attachment_metadata_json
FROM wp_posts att
LEFT JOIN wp_postmeta file
  ON file.post_id = att.ID AND file.meta_key = '_wp_attached_file'
LEFT JOIN wp_postmeta meta
  ON meta.post_id = att.ID AND meta.meta_key = '_wp_attachment_metadata'
WHERE att.post_type = 'attachment';

-- 3) Taxonomy terms attached to recipe posts (course / cuisine / tags etc.).
SELECT
  tr.object_id AS recipe_id,
  tt.taxonomy AS taxonomy,
  t.name AS term_name,
  t.slug AS term_slug
FROM wp_term_relationships tr
JOIN wp_term_taxonomy tt ON tt.term_taxonomy_id = tr.term_taxonomy_id
JOIN wp_terms t ON t.term_id = tt.term_id
JOIN wp_posts p ON p.ID = tr.object_id
WHERE p.post_status IN ('publish', 'draft')
ORDER BY tr.object_id, tt.taxonomy, t.name;

-- 4) WP Recipe Maker recipes (if present) with their JSON/serialized data.
SELECT
  p.ID AS recipe_id,
  p.post_title AS recipe_title,
  p.post_name AS recipe_slug,
  m.meta_value AS wprm_recipe_data
FROM wp_posts p
JOIN wp_postmeta m
  ON m.post_id = p.ID
  AND m.meta_key = 'wp_scale_recipe'
WHERE p.post_type = 'wp_recipe_maker_recipe'
  AND p.post_status IN ('publish', 'draft');

-- 5) Sanity check: count recipes missing a featured image (importer will log these).
SELECT COUNT(*) AS recipes_without_thumbnail
FROM wp_posts p
WHERE p.post_status IN ('publish', 'draft')
  AND NOT EXISTS (
    SELECT 1 FROM wp_postmeta thumb
    WHERE thumb.post_id = p.ID AND thumb.meta_key = '_thumbnail_id'
  );