from datetime import date
from typing import Optional

from sqlalchemy import Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.user import TimestampMixin

DAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")


class WeeklyMenu(Base, TimestampMixin):
    __tablename__ = "weekly_menus"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    week_start_date: Mapped[date] = mapped_column(Date, unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), default="", nullable=False)

    items: Mapped[list["WeeklyMenuItem"]] = relationship(
        back_populates="menu",
        cascade="all, delete-orphan",
        order_by="WeeklyMenuItem.day_of_week",
        lazy="selectin",
    )


class WeeklyMenuItem(Base, TimestampMixin):
    __tablename__ = "weekly_menu_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    weekly_menu_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("weekly_menus.id", ondelete="CASCADE"), nullable=False, index=True
    )
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Monday .. 6=Sunday
    meal_type: Mapped[str] = mapped_column(String(20), default="dinner", nullable=False)
    recipe_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("recipes.id", ondelete="SET NULL"))
    note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    menu: Mapped["WeeklyMenu"] = relationship(back_populates="items")
    recipe: Mapped[Optional["app.models.recipe.Recipe"]] = relationship(lazy="selectin")  # type: ignore[name-defined]