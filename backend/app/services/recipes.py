"""Recipe persistence helpers shared by API routes and seed/import scripts."""

from sqlalchemy.orm import Session

from app.core.utils import slugify, unique_slug, utcnow
from app.models.recipe import (
    Recipe,
    RecipeIngredient,
    RecipeInstructionStep,
    RecipeNote,
    STATUS_ARCHIVED,
    STATUS_PUBLISHED,
)
from app.models.term import TERM_TYPES, Term
from app.schemas.recipe import RecipeIn


def get_or_create_term(db: Session, term_type: str, name: str) -> Term:
    slug = slugify(name)
    term = db.query(Term).filter(Term.slug == slug, Term.type == term_type).first()
    if term is None:
        term = Term(name=name.strip(), slug=slug, type=term_type)
        db.add(term)
        db.flush()
    return term


def apply_recipe_payload(db: Session, recipe: Recipe, data: RecipeIn) -> Recipe:
    """Create or update a recipe (and children) from a RecipeIn payload.

    Raises ValueError for invalid status values.
    """
    if data.status not in ("draft", STATUS_PUBLISHED, STATUS_ARCHIVED):
        raise ValueError(f"Invalid status: {data.status}")

    recipe.title = data.title.strip()
    recipe.slug = unique_slug(db, Recipe, data.slug or data.title, exclude_id=recipe.id)
    recipe.summary = data.summary or ""
    recipe.description = data.description or ""
    recipe.servings = data.servings
    recipe.prep_minutes = data.prep_minutes
    recipe.cook_minutes = data.cook_minutes
    if data.total_minutes is not None:
        recipe.total_minutes = data.total_minutes
    elif data.prep_minutes is not None and data.cook_minutes is not None:
        recipe.total_minutes = data.prep_minutes + data.cook_minutes
    else:
        recipe.total_minutes = None
    recipe.source_url = data.source_url
    recipe.family_note = data.family_note
    recipe.image_url = data.image_url
    recipe.image_alt = data.image_alt

    now = utcnow()
    if data.status == STATUS_PUBLISHED and recipe.published_at is None:
        recipe.published_at = now
    if data.status == STATUS_ARCHIVED and recipe.archived_at is None:
        recipe.archived_at = now
    recipe.status = data.status

    # Children are replaced wholesale on each save.
    recipe.ingredients = [
        RecipeIngredient(**ing.model_dump(exclude={"sort_order"}), sort_order=i)
        for i, ing in enumerate(data.ingredients)
    ]
    recipe.steps = [
        RecipeInstructionStep(
            body=step.body,
            timer_minutes=step.timer_minutes,
            step_number=(step.step_number if step.step_number is not None else i + 1),
            sort_order=(step.sort_order if step.sort_order is not None else i),
        )
        for i, step in enumerate(data.steps)
    ]
    recipe.notes = [
        RecipeNote(**note.model_dump(exclude={"sort_order"}), sort_order=i)
        for i, note in enumerate(data.notes)
    ]

    # Terms: explicit refs plus auto-created ingredient terms from ingredient rows.
    refs: dict[tuple[str, str], str] = {}
    for ref in data.terms:
        if ref.type in TERM_TYPES and ref.name.strip():
            refs.setdefault((ref.type, slugify(ref.name)), ref.name.strip())
    for ing in data.ingredients:
        name = (ing.ingredient_name or "").strip()
        if name:
            refs.setdefault(("ingredient", slugify(name)), name)
    recipe.terms = [get_or_create_term(db, term_type, name) for (term_type, _), name in refs.items()]

    return recipe