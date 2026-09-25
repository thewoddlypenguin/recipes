from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.utils import utcnow
from app.models.user import TimestampMixin

STATUS_DRAFT = "draft"
STATUS_PUBLISHED = "published"
STATUS_ARCHIVED = "archived"
STATUSES = (STATUS_DRAFT, STATUS_PUBLISHED, STATUS_ARCHIVED)

# Association table: recipes <-> terms (course/cuisine/diet/equipment/ingredient/tag)
recipe_terms = Table(
    "recipe_terms",
    Base.metadata,
    Column("id", Integer, primary_key=True),
    Column("recipe_id", Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False),
    Column("term_id", Integer, ForeignKey("terms.id", ondelete="CASCADE"), nullable=False),
    Column("created_at", DateTime, default=utcnow, nullable=False),
    UniqueConstraint("recipe_id", "term_id", name="uq_recipe_terms"),
)


class Recipe(Base, TimestampMixin):
    __tablename__ = "recipes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)

    servings: Mapped[Optional[int]] = mapped_column(Integer)
    prep_minutes: Mapped[Optional[int]] = mapped_column(Integer)
    cook_minutes: Mapped[Optional[int]] = mapped_column(Integer)
    total_minutes: Mapped[Optional[int]] = mapped_column(Integer)

    source_url: Mapped[Optional[str]] = mapped_column(String(500))
    family_note: Mapped[Optional[str]] = mapped_column(Text)

    status: Mapped[str] = mapped_column(String(20), default=STATUS_DRAFT, nullable=False, index=True)

    image_url: Mapped[Optional[str]] = mapped_column(String(500))
    image_alt: Mapped[Optional[str]] = mapped_column(String(300))

    # Legacy WordPress traceability
    legacy_wp_post_id: Mapped[Optional[int]] = mapped_column(Integer)
    legacy_wp_slug: Mapped[Optional[str]] = mapped_column(String(255))
    legacy_thumbnail_id: Mapped[Optional[int]] = mapped_column(Integer)
    legacy_image_path: Mapped[Optional[str]] = mapped_column(String(500))
    legacy_image_url: Mapped[Optional[str]] = mapped_column(String(500))
    import_notes: Mapped[Optional[str]] = mapped_column(Text)

    created_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"))
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    archived_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    ingredients: Mapped[list["RecipeIngredient"]] = relationship(
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="RecipeIngredient.sort_order",
        lazy="selectin",
    )
    steps: Mapped[list["RecipeInstructionStep"]] = relationship(
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="RecipeInstructionStep.sort_order",
        lazy="selectin",
    )
    notes: Mapped[list["RecipeNote"]] = relationship(
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="RecipeNote.sort_order",
        lazy="selectin",
    )
    terms: Mapped[list["Term"]] = relationship(
        secondary=recipe_terms, lazy="selectin"
    )

    __table_args__ = (Index("ix_recipes_status_updated", "status", "updated_at"),)


class RecipeIngredient(Base, TimestampMixin):
    __tablename__ = "recipe_ingredients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    recipe_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    section: Mapped[Optional[str]] = mapped_column(String(120))
    quantity: Mapped[Optional[str]] = mapped_column(String(50))
    unit: Mapped[Optional[str]] = mapped_column(String(50))
    ingredient_name: Mapped[str] = mapped_column(String(255), nullable=False)
    preparation: Mapped[Optional[str]] = mapped_column(String(255))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    original_text: Mapped[Optional[str]] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    recipe: Mapped["Recipe"] = relationship(back_populates="ingredients")


class RecipeInstructionStep(Base, TimestampMixin):
    __tablename__ = "recipe_instruction_steps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    recipe_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    step_number: Mapped[Optional[int]] = mapped_column(Integer)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    timer_minutes: Mapped[Optional[int]] = mapped_column(Integer)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    recipe: Mapped["Recipe"] = relationship(back_populates="steps")


class RecipeNote(Base, TimestampMixin):
    __tablename__ = "recipe_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    recipe_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    recipe: Mapped["Recipe"] = relationship(back_populates="notes")