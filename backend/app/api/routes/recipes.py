from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.core.utils import parse_term_names
from app.models.recipe import (
    Recipe,
    STATUS_ARCHIVED,
    STATUS_PUBLISHED,
    STATUSES,
)
from app.models.term import Term
from app.models.user import User
from app.schemas.recipe import (
    RecipeDetail,
    RecipeIn,
    RecipeListItem,
    RecipeListResponse,
    RecipeUpdate,
)
from app.services.recipes import apply_recipe_payload

router = APIRouter()

EDITOR_ROLES = ("admin", "editor")

TERM_FILTER_PARAMS = {
    "course": "course",
    "cuisine": "cuisine",
    "diet": "diet",
    "equipment": "equipment",
    "ingredient": "ingredient",
    "tag": "tag",
}


def _is_editor(user: User | None) -> bool:
    return user is not None and user.role in EDITOR_ROLES


def _group_terms(terms: list[Term]) -> dict[str, list[str]]:
    grouped: dict[str, list[str]] = {}
    for t in sorted(terms, key=lambda t: (t.type, t.name)):
        grouped.setdefault(t.type, []).append(t.name)
    return grouped


def _course_of(recipe: Recipe) -> str | None:
    return next((t.name for t in recipe.terms if t.type == "course"), None)


def _tags_of(recipe: Recipe) -> list[str]:
    return [t.name for t in recipe.terms if t.type == "tag"][:3]


def _to_list_item(recipe: Recipe) -> RecipeListItem:
    item = RecipeListItem.model_validate(recipe)
    item.course = _course_of(recipe)
    item.tags = _tags_of(recipe)
    return item


def _to_detail(recipe: Recipe) -> RecipeDetail:
    item = RecipeListItem.model_validate(recipe)
    item.course = _course_of(recipe)
    item.tags = _tags_of(recipe)
    detail = RecipeDetail(
        **item.model_dump(),
        description=recipe.description or "",
        source_url=recipe.source_url,
        family_note=recipe.family_note,
        legacy_wp_post_id=recipe.legacy_wp_post_id,
        legacy_wp_slug=recipe.legacy_wp_slug,
        legacy_thumbnail_id=recipe.legacy_thumbnail_id,
        legacy_image_path=recipe.legacy_image_path,
        legacy_image_url=recipe.legacy_image_url,
        import_notes=recipe.import_notes,
        ingredients=recipe.ingredients,
        steps=recipe.steps,
        notes=recipe.notes,
        created_at=recipe.created_at.isoformat() if recipe.created_at else None,
        updated_at=recipe.updated_at.isoformat() if recipe.updated_at else None,
    )
    detail.terms = _group_terms(recipe.terms)
    return detail


@router.get("", response_model=RecipeListResponse)
def list_recipes(
    q: str | None = None,
    course: str | None = None,
    cuisine: str | None = None,
    diet: str | None = None,
    equipment: str | None = None,
    ingredient: str | None = None,
    tag: str | None = None,
    status: str | None = None,
    limit: int = Query(24, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
) -> RecipeListResponse:
    query = db.query(Recipe)

    # Anonymous visitors only see published recipes. Editors/admins may pass
    # ?status=draft|published|archived|all to manage content.
    if _is_editor(user) and status == "all":
        pass
    elif _is_editor(user) and status in STATUSES:
        query = query.filter(Recipe.status == status)
    else:
        query = query.filter(Recipe.status == STATUS_PUBLISHED)

    if q and q.strip():
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Recipe.title.ilike(like),
                Recipe.summary.ilike(like),
                Recipe.description.ilike(like),
            )
        )

    provided = {
        "course": course,
        "cuisine": cuisine,
        "diet": diet,
        "equipment": equipment,
        "ingredient": ingredient,
        "tag": tag,
    }
    for term_type, raw in provided.items():
        values = parse_term_names(raw)
        if not values:
            continue
        slugs = [v.lower() for v in values]
        names = [v.lower() for v in values]
        query = query.filter(
            Recipe.terms.any(
                and_(
                    Term.type == term_type,
                    or_(Term.slug.in_(slugs), func.lower(Term.name).in_(names)),
                )
            )
        )

    total = query.count()
    recipes = query.order_by(Recipe.updated_at.desc()).offset(offset).limit(limit).all()
    return RecipeListResponse(
        items=[_to_list_item(r) for r in recipes], total=total, limit=limit, offset=offset
    )


@router.post("", response_model=RecipeDetail, status_code=status.HTTP_201_CREATED)
def create_recipe(
    data: RecipeIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*EDITOR_ROLES)),
) -> RecipeDetail:
    recipe = Recipe()
    try:
        apply_recipe_payload(db, recipe, data)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    recipe.created_by_id = user.id
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return _to_detail(recipe)


@router.get("/id/{recipe_id}", response_model=RecipeDetail)
def get_recipe_by_id(
    recipe_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*EDITOR_ROLES)),
) -> RecipeDetail:
    recipe = db.get(Recipe, recipe_id)
    if recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    return _to_detail(recipe)


@router.get("/{slug}", response_model=RecipeDetail)
def get_recipe(
    slug: str,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
) -> RecipeDetail:
    recipe = db.query(Recipe).filter(Recipe.slug == slug).first()
    if recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    if recipe.status != STATUS_PUBLISHED and not _is_editor(user):
        # Unpublished recipes are only visible to editors/admins.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    return _to_detail(recipe)


@router.put("/id/{recipe_id}", response_model=RecipeDetail)
def update_recipe(
    recipe_id: int,
    data: RecipeUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*EDITOR_ROLES)),
) -> RecipeDetail:
    recipe = db.get(Recipe, recipe_id)
    if recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    try:
        apply_recipe_payload(db, recipe, data)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    db.commit()
    db.refresh(recipe)
    return _to_detail(recipe)


@router.delete("/{recipe_id}")
def archive_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*EDITOR_ROLES)),
) -> dict:
    """Soft-delete: archive the recipe so family data is never lost by accident."""
    from datetime import datetime

    recipe = db.get(Recipe, recipe_id)
    if recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    recipe.status = STATUS_ARCHIVED
    if recipe.archived_at is None:
        recipe.archived_at = datetime.utcnow()
    db.commit()
    return {"ok": True, "id": recipe_id, "status": STATUS_ARCHIVED}