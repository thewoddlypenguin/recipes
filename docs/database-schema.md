# Database Schema

PostgreSQL via SQLAlchemy 2.x models (`backend/app/models/`). The initial
Alembic migration creates every table; timestamps are naive UTC.

## Entity overview

```
users ──< recipes ──< recipe_ingredients
              │   ──< recipe_instruction_steps
              │   ──< recipe_notes
              │   ──< recipe_terms >── terms
              └──< weekly_menu_items >── weekly_menus
```

## users

| Column | Type | Notes |
| --- | --- | --- |
| id | int PK | |
| email | varchar(255) | unique, indexed |
| password_hash | varchar(255) | bcrypt |
| display_name | varchar(120) | |
| role | varchar(20) | `admin` \| `editor` \| `viewer` |
| is_active | boolean | |
| created_at / updated_at | datetime | |

## recipes

| Column | Type | Notes |
| --- | --- | --- |
| id | int PK | |
| title | varchar(255) | indexed |
| slug | varchar(255) | unique — used in URLs (`/recipes/:slug`) |
| summary | text | card + hero summary |
| description | text | longer description |
| servings | int, nullable | |
| prep_minutes / cook_minutes / total_minutes | int, nullable | |
| source_url | varchar(500), nullable | |
| family_note | text, nullable | family context shown on detail page |
| status | varchar(20) | `draft` \| `published` \| `archived`; anon sees only published |
| image_url | varchar(500), nullable | app-owned `/uploads/recipes/{slug}/…` |
| image_alt | varchar(300), nullable | |
| legacy_wp_post_id | int, nullable | WP `wp_posts.ID` |
| legacy_wp_slug | varchar(255), nullable | WP `post_name` |
| legacy_thumbnail_id | int, nullable | WP `_thumbnail_id` |
| legacy_image_path | varchar(500), nullable | WP `_wp_attached_file` (e.g. `2025/02/x.jpg`) |
| legacy_image_url | varchar(500), nullable | WP `guid` |
| import_notes | text, nullable | importer warnings/traceability |
| created_by_id | int FK → users.id, nullable | |
| published_at / archived_at | datetime, nullable | |
| created_at / updated_at | datetime | |

Index: `(status, updated_at)` for the browse listing.

## recipe_ingredients

| Column | Type |
| --- | --- |
| id | int PK |
| recipe_id | int FK → recipes.id (CASCADE) |
| section | varchar(120), nullable — e.g. "Glaze" (groups the checklist) |
| quantity | varchar(50), nullable — string by design (`"1 1/2"`, `"2"`) |
| unit | varchar(50), nullable |
| ingredient_name | varchar(255) |
| preparation | varchar(255), nullable — "zested and juiced" |
| notes | text, nullable |
| original_text | text, nullable — raw line from WP/paste import |
| sort_order | int |
| created_at / updated_at | datetime |

## recipe_instruction_steps

| Column | Type |
| --- | --- |
| id | int PK |
| recipe_id | int FK → recipes.id (CASCADE) |
| step_number | int, nullable (defaults to position) |
| body | text |
| timer_minutes | int, nullable — drives the timer button in Cooking Mode |
| sort_order | int |
| created_at / updated_at | datetime |

## recipe_notes

| Column | Type |
| --- | --- |
| id | int PK |
| recipe_id | int FK → recipes.id (CASCADE) |
| body | text |
| sort_order | int |
| created_at / updated_at | datetime |

## terms

One table for all taxonomy-style labels.

| Column | Type |
| --- | --- |
| id | int PK |
| name | varchar(120) — display, e.g. "One Pot" |
| slug | varchar(140) — `one-pot` |
| type | varchar(20) — `course` \| `cuisine` \| `diet` \| `equipment` \| `ingredient` \| `tag` |
| created_at / updated_at | datetime |

Unique: `(slug, type)`.

## recipe_terms

Join table. Unique `(recipe_id, term_id)`.

## weekly_menus

| Column | Type |
| --- | --- |
| id | int PK |
| week_start_date | date — always the Monday; unique |
| title | varchar(200) |
| created_at / updated_at | datetime |

## weekly_menu_items

| Column | Type |
| --- | --- |
| id | int PK |
| weekly_menu_id | int FK → weekly_menus.id (CASCADE) |
| day_of_week | int — 0 = Monday … 6 = Sunday |
| meal_type | varchar(20), default `dinner` |
| recipe_id | int FK → recipes.id (SET NULL), nullable |
| note | text, default "" |
| sort_order | int |
| created_at / updated_at | datetime |

## Conventions

- All children cascade-delete with their recipe; `recipe_terms` and
  `weekly_menu_items.recipe_id` use `ON DELETE` rules at the DB level.
- Ingredient names auto-create `ingredient`-type terms on save (that is what
  powers the ingredient filter).
- Deleting a recipe via `DELETE /api/recipes/{id}` is a soft delete
  (`status=archived`) — family data is never hard-removed.
