from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class MenuItemIn(BaseModel):
    day_of_week: int = Field(ge=0, le=6)  # 0=Monday .. 6=Sunday
    recipe_id: Optional[int] = None
    note: str = ""
    meal_type: str = "dinner"


class MenuCreate(BaseModel):
    week_start_date: date
    title: str = ""


class MenuUpdate(BaseModel):
    title: Optional[str] = None
    items: list[MenuItemIn] = []


class MenuItemRecipe(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    slug: str
    image_url: Optional[str] = None
    total_minutes: Optional[int] = None


class MenuItemOut(BaseModel):
    id: int
    day_of_week: int
    meal_type: str
    recipe_id: Optional[int] = None
    note: str
    recipe: Optional[MenuItemRecipe] = None


class MenuOut(BaseModel):
    id: int
    week_start_date: date
    title: str
    items: list[MenuItemOut] = []