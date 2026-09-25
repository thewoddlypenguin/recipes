from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------- Input ----------
class IngredientIn(BaseModel):
    section: Optional[str] = None
    quantity: Optional[str] = None
    unit: Optional[str] = None
    ingredient_name: str = Field(min_length=1, max_length=255)
    preparation: Optional[str] = None
    notes: Optional[str] = None
    original_text: Optional[str] = None
    sort_order: int = 0


class StepIn(BaseModel):
    body: str = Field(min_length=1)
    step_number: Optional[int] = None
    timer_minutes: Optional[int] = None
    sort_order: Optional[int] = None


class NoteIn(BaseModel):
    body: str = Field(min_length=1)
    sort_order: int = 0


class TermRefIn(BaseModel):
    type: str  # course|cuisine|diet|equipment|ingredient|tag
    name: str = Field(min_length=1, max_length=120)


class RecipeIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    slug: Optional[str] = None
    summary: str = ""
    description: str = ""
    servings: Optional[int] = None
    prep_minutes: Optional[int] = None
    cook_minutes: Optional[int] = None
    total_minutes: Optional[int] = None
    source_url: Optional[str] = None
    family_note: Optional[str] = None
    status: str = "draft"  # draft|published|archived
    image_url: Optional[str] = None
    image_alt: Optional[str] = None
    ingredients: list[IngredientIn] = []
    steps: list[StepIn] = []
    notes: list[NoteIn] = []
    terms: list[TermRefIn] = []


class RecipeUpdate(RecipeIn):
    pass


# ---------- Output ----------
class IngredientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    section: Optional[str] = None
    quantity: Optional[str] = None
    unit: Optional[str] = None
    ingredient_name: str
    preparation: Optional[str] = None
    notes: Optional[str] = None
    original_text: Optional[str] = None
    sort_order: int


class StepOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    step_number: Optional[int] = None
    body: str
    timer_minutes: Optional[int] = None
    sort_order: int


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    body: str
    sort_order: int


class RecipeListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    slug: str
    summary: str
    image_url: Optional[str] = None
    image_alt: Optional[str] = None
    servings: Optional[int] = None
    prep_minutes: Optional[int] = None
    cook_minutes: Optional[int] = None
    total_minutes: Optional[int] = None
    status: str
    course: Optional[str] = None
    tags: list[str] = []


class RecipeDetail(RecipeListItem):
    description: str = ""
    source_url: Optional[str] = None
    family_note: Optional[str] = None
    image_url: Optional[str] = None
    legacy_wp_post_id: Optional[int] = None
    legacy_wp_slug: Optional[str] = None
    legacy_thumbnail_id: Optional[int] = None
    legacy_image_path: Optional[str] = None
    legacy_image_url: Optional[str] = None
    import_notes: Optional[str] = None
    created_at: str | None = None
    updated_at: str | None = None
    ingredients: list[IngredientOut] = []
    steps: list[StepOut] = []
    notes: list[NoteOut] = []
    terms: dict[str, list[str]] = {}


class RecipeListResponse(BaseModel):
    items: list[RecipeListItem]
    total: int
    limit: int
    offset: int