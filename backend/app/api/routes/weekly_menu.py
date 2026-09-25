from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models.menu import WeeklyMenu, WeeklyMenuItem
from app.schemas.menu import MenuCreate, MenuOut, MenuUpdate, MenuItemOut, MenuItemRecipe
from app.models.recipe import Recipe

router = APIRouter()


def monday_of(day: date) -> date:
    return day - timedelta(days=day.weekday())


def parse_week_start(raw: str | None) -> date:
    if not raw:
        return monday_of(date.today())
    try:
        return monday_of(date.fromisoformat(raw))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid week_start; use YYYY-MM-DD")


def get_or_create_menu(db: Session, week_start: date, title: str = "") -> WeeklyMenu:
    menu = db.query(WeeklyMenu).filter(WeeklyMenu.week_start_date == week_start).first()
    if menu is not None:
        return menu
    menu = WeeklyMenu(week_start_date=week_start, title=title or f"Week of {week_start.isoformat()}")
    db.add(menu)
    db.flush()
    for i in range(7):
        db.add(
            WeeklyMenuItem(
                weekly_menu_id=menu.id,
                day_of_week=i,
                meal_type="dinner",
                recipe_id=None,
                note="",
                sort_order=i,
            )
        )
    db.commit()
    db.refresh(menu)
    return menu


def to_menu_out(menu: WeeklyMenu) -> MenuOut:
    items = []
    for item in sorted(menu.items, key=lambda i: i.day_of_week):
        items.append(
            MenuItemOut(
                id=item.id,
                day_of_week=item.day_of_week,
                meal_type=item.meal_type,
                recipe_id=item.recipe_id,
                note=item.note or "",
                recipe=MenuItemRecipe.model_validate(item.recipe) if item.recipe else None,
            )
        )
    return MenuOut(id=menu.id, week_start_date=menu.week_start_date, title=menu.title, items=items)


def ensure_day_slots(db: Session, menu: WeeklyMenu) -> None:
    """Guarantee the menu always has one slot per day (0..6)."""
    existing_days = {item.day_of_week for item in menu.items}
    added = False
    for day in range(7):
        if day not in existing_days:
            db.add(
                WeeklyMenuItem(
                    weekly_menu_id=menu.id,
                    day_of_week=day,
                    meal_type="dinner",
                    recipe_id=None,
                    note="",
                    sort_order=day,
                )
            )
            added = True
    if added:
        db.commit()
        db.refresh(menu)


@router.get("", response_model=MenuOut)
def get_menu(
    week_start: str | None = None,
    db: Session = Depends(get_db),
) -> MenuOut:
    """Fetch (or lazily create) the menu for the week containing week_start."""
    menu = get_or_create_menu(db, parse_week_start(week_start))
    return to_menu_out(menu)


@router.post("", response_model=MenuOut, status_code=status.HTTP_201_CREATED)
def create_menu(
    payload: MenuCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "editor")),
) -> MenuOut:
    menu = get_or_create_menu(db, monday_of(payload.week_start_date), payload.title)
    return to_menu_out(menu)


@router.put("/{menu_id}", response_model=MenuOut)
def update_menu(
    menu_id: int,
    payload: MenuUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "editor")),
) -> MenuOut:
    menu = db.get(WeeklyMenu, menu_id)
    if menu is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu not found")

    if payload.title is not None:
        menu.title = payload.title

    # Validate recipe ids up front so one bad row cannot wipe the week.
    recipe_ids = {item.recipe_id for item in payload.items if item.recipe_id is not None}
    if recipe_ids:
        found = db.query(Recipe.id).filter(Recipe.id.in_(recipe_ids)).all()
        missing = recipe_ids - {row[0] for row in found}
        if missing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown recipe ids: {sorted(missing)}")

    db.query(WeeklyMenuItem).filter(WeeklyMenuItem.weekly_menu_id == menu.id).delete()
    for item in sorted(payload.items, key=lambda i: i.day_of_week):
        db.add(
            WeeklyMenuItem(
                weekly_menu_id=menu.id,
                day_of_week=item.day_of_week,
                meal_type=item.meal_type or "dinner",
                recipe_id=item.recipe_id,
                note=item.note or "",
                sort_order=item.day_of_week,
            )
        )
    db.commit()
    db.refresh(menu)
    ensure_day_slots(db, menu)
    return to_menu_out(menu)