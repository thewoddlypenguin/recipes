"""Seed data for Mikkelsen Family Recipes.

Idempotent: creates the initial admin user (from env) and six published
family recipes with generated SVG placeholder images. Re-running never
duplicates: recipes are matched by slug, and only missing content is added.

Run inside backend/:
    python -m app.seed.seed_data
"""

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.recipe import Recipe
from app.models.user import User
from app.schemas.recipe import IngredientIn, NoteIn, RecipeIn, StepIn, TermRefIn
from app.services.images import write_placeholder_svg
from app.services.recipes import apply_recipe_payload

SEED_RECIPES: list[dict] = [
    {
        "title": "One Pot Lemon Ricotta Pasta",
        "slug": "one-pot-lemon-ricotta-pasta",
        "summary": "Quick, creamy weeknight pasta with lemon, ricotta, and parmesan — everything comes together in one pot.",
        "description": "The sauce is simply ricotta, cream, lemon, and pasta water emulsified into something silky. Keep the heat low after the ricotta goes in and it stays perfectly creamy.",
        "servings": 4,
        "prep_minutes": 10,
        "cook_minutes": 20,
        "emoji": "🍋",
        "course": "Main",
        "cuisine": "Italian",
        "diets": ["Vegetarian"],
        "equipment": ["Large pot"],
        "tags": ["One Pot", "Weeknight", "Kid Favorite"],
        "family_note": "Emma's favorite quick dinner — the go-to on busy swim-practice nights.",
        "ingredients": [
            {"quantity": "1", "unit": "lb", "ingredient_name": "linguine"},
            {"quantity": "1", "unit": "cup", "ingredient_name": "ricotta", "notes": "whole milk"},
            {"quantity": "1", "unit": "", "ingredient_name": "lemon", "preparation": "zested and juiced"},
            {"quantity": "1", "unit": "cup", "ingredient_name": "heavy cream"},
            {"quantity": "1/2", "unit": "cup", "ingredient_name": "grated parmesan", "notes": "plus more for serving"},
            {"quantity": "3", "unit": "cloves", "ingredient_name": "garlic", "preparation": "minced"},
            {"quantity": "2", "unit": "tbsp", "ingredient_name": "olive oil"},
            {"quantity": "2", "unit": "cups", "ingredient_name": "baby spinach", "notes": "optional"},
            {"quantity": "", "unit": "", "ingredient_name": "salt and black pepper", "notes": "to taste"},
        ],
        "steps": [
            {"body": "Bring a large pot of well-salted water to a boil. Cook the linguine until just shy of al dente. Reserve 1 cup of pasta water, then drain.", "timer_minutes": 9},
            {"body": "In the same pot, warm the olive oil over medium heat. Add the garlic and cook until fragrant, about 1 minute.", "timer_minutes": 1},
            {"body": "Add the ricotta, heavy cream, lemon zest, and lemon juice and stir until creamy.", "timer_minutes": 3},
            {"body": "Return the pasta to the pot with the parmesan. Toss, loosening with reserved pasta water until the sauce coats every strand.", "timer_minutes": None},
            {"body": "Fold in the spinach until wilted. Season with salt and pepper and serve with extra parmesan.", "timer_minutes": None},
        ],
        "notes": [
            "Keep the heat low after adding the ricotta — boiling makes the sauce grainy.",
            "Add red pepper flakes with the garlic for a little heat.",
        ],
    },
    {
        "title": "One Pot Creamy Garlic Pasta",
        "slug": "one-pot-creamy-garlic-pasta",
        "summary": "Silky garlic-butter fettuccine that cooks right in the sauce — one pot, under 30 minutes.",
        "description": "The noodles simmer directly in broth and cream, so every bite tastes like the sauce. Finish with parmesan off the heat so it never clumps.",
        "servings": 4,
        "prep_minutes": 5,
        "cook_minutes": 20,
        "emoji": "🧄",
        "course": "Main",
        "cuisine": "Italian",
        "diets": ["Vegetarian"],
        "equipment": ["Deep skillet"],
        "tags": ["One Pot", "Weeknight", "Comfort Food"],
        "family_note": "Made this so often in 2020 that the kids could recite the steps.",
        "ingredients": [
            {"quantity": "12", "unit": "oz", "ingredient_name": "fettuccine", "notes": "broken in half if needed"},
            {"quantity": "4", "unit": "tbsp", "ingredient_name": "butter"},
            {"quantity": "6", "unit": "cloves", "ingredient_name": "garlic", "preparation": "minced"},
            {"quantity": "2 1/2", "unit": "cups", "ingredient_name": "chicken or vegetable broth"},
            {"quantity": "1 1/2", "unit": "cups", "ingredient_name": "heavy cream"},
            {"quantity": "1", "unit": "cup", "ingredient_name": "grated parmesan"},
            {"quantity": "2", "unit": "tbsp", "ingredient_name": "fresh parsley", "preparation": "chopped"},
            {"quantity": "", "unit": "", "ingredient_name": "salt and black pepper", "notes": "to taste"},
        ],
        "steps": [
            {"body": "Melt the butter in a deep skillet over medium heat. Add the garlic and cook until fragrant, about 1 minute.", "timer_minutes": 1},
            {"body": "Pour in the broth and cream and bring to a gentle boil.", "timer_minutes": None},
            {"body": "Add the fettuccine, pressing it under the liquid. Simmer, stirring often, until the noodles are tender and the sauce has thickened.", "timer_minutes": 11},
            {"body": "Remove from heat. Stir in the parmesan until smooth, then season with salt and pepper.", "timer_minutes": None},
            {"body": "Let rest 2 minutes so the sauce clings, then top with parsley and serve.", "timer_minutes": 2},
        ],
        "notes": [
            "Stir often while the pasta simmers so it doesn't stick to the bottom.",
        ],
    },
    {
        "title": "Miso Chicken Ramen",
        "slug": "miso-chicken-ramen",
        "summary": "Weeknight ramen with miso-roasted chicken, jammy eggs, and sweet corn in a savory broth.",
        "description": "Roasting the miso-glazed chicken thighs while the broth simmers keeps this fast. Assemble bowls noodle-first so everything stays springy.",
        "servings": 4,
        "prep_minutes": 15,
        "cook_minutes": 35,
        "emoji": "🍜",
        "course": "Main",
        "cuisine": "Japanese",
        "diets": [],
        "equipment": ["Sheet pan", "Large pot"],
        "tags": ["Soup", "Weeknight", "Cozy"],
        "family_note": "Justin's late-night favorite — double the chicken for leftovers.",
        "ingredients": [
            {"quantity": "1 1/2", "unit": "lbs", "ingredient_name": "boneless skinless chicken thighs"},
            {"quantity": "3", "unit": "tbsp", "ingredient_name": "white miso paste"},
            {"quantity": "2", "unit": "tbsp", "ingredient_name": "soy sauce"},
            {"quantity": "2", "unit": "tsp", "ingredient_name": "sesame oil"},
            {"quantity": "6", "unit": "cups", "ingredient_name": "chicken broth"},
            {"quantity": "2", "unit": "cloves", "ingredient_name": "garlic", "preparation": "grated"},
            {"quantity": "1", "unit": "tbsp", "ingredient_name": "fresh ginger", "preparation": "grated"},
            {"quantity": "2", "unit": "", "ingredient_name": "ramen noodle cakes (3 oz each)", "notes": "discard seasoning packets"},
            {"quantity": "1", "unit": "cup", "ingredient_name": "corn kernels"},
            {"quantity": "2", "unit": "", "ingredient_name": "soft-boiled eggs", "preparation": "halved"},
            {"quantity": "4", "unit": "", "ingredient_name": "green onions", "preparation": "sliced"},
            {"quantity": "2", "unit": "tsp", "ingredient_name": "chili crisp", "notes": "optional"},
        ],
        "steps": [
            {"body": "Preheat the oven to 425°F. Whisk the miso, soy sauce, and sesame oil, then coat the chicken. Roast on a sheet pan until cooked through and glazed.", "timer_minutes": 22},
            {"body": "Meanwhile, simmer the broth with the garlic and ginger in a large pot.", "timer_minutes": None},
            {"body": "Cook the ramen noodles in the broth just until tender, about 3 minutes.", "timer_minutes": 3},
            {"body": "Divide the noodles between bowls and ladle the hot broth over them.", "timer_minutes": None},
            {"body": "Slice the chicken and arrange on top with eggs, corn, and green onions. Finish with chili crisp.", "timer_minutes": None},
        ],
        "notes": [
            "For jammy eggs: boil 6 1/2 minutes, then ice bath and peel.",
            "White miso is milder; red miso works but use half.",
        ],
    },
    {
        "title": "Absolutely Ultimate Potato Soup",
        "slug": "absolutely-ultimate-potato-soup",
        "summary": "Thick, creamy potato soup with bacon, cheddar, and chives — the family's most requested soup.",
        "description": "Mashing a scoop of the potatoes against the pot thickens the soup without extra flour. Top bowls with bacon, cheese, and chives at the table.",
        "servings": 6,
        "prep_minutes": 15,
        "cook_minutes": 40,
        "emoji": "🥣",
        "course": "Soup",
        "cuisine": "American",
        "diets": [],
        "equipment": ["Dutch oven"],
        "tags": ["Soup", "Comfort Food", "Cozy"],
        "family_note": "Grandma Ellen's recipe card just says 'potatoes enough' — 3 lbs is about right.",
        "ingredients": [
            {"quantity": "6", "unit": "slices", "ingredient_name": "bacon", "preparation": "chopped"},
            {"quantity": "1", "unit": "", "ingredient_name": "yellow onion", "preparation": "diced"},
            {"quantity": "3", "unit": "cloves", "ingredient_name": "garlic", "preparation": "minced"},
            {"quantity": "1/4", "unit": "cup", "ingredient_name": "all-purpose flour"},
            {"quantity": "3", "unit": "cups", "ingredient_name": "chicken broth"},
            {"quantity": "3", "unit": "lbs", "ingredient_name": "russet potatoes", "preparation": "peeled, cut into 1/2-inch cubes"},
            {"quantity": "2", "unit": "cups", "ingredient_name": "whole milk"},
            {"quantity": "1", "unit": "cup", "ingredient_name": "heavy cream"},
            {"quantity": "1 1/2", "unit": "cups", "ingredient_name": "shredded cheddar"},
            {"quantity": "1/2", "unit": "cup", "ingredient_name": "sour cream"},
            {"quantity": "", "unit": "", "ingredient_name": "chives", "preparation": "snipped, for serving"},
            {"quantity": "", "unit": "", "ingredient_name": "salt and black pepper", "notes": "to taste"},
        ],
        "steps": [
            {"body": "Cook the bacon in a Dutch oven until crisp, then remove, leaving 2 tbsp fat.", "timer_minutes": 8},
            {"body": "Cook the onion in the bacon fat until soft, then add the garlic for the last minute.", "timer_minutes": 5},
            {"body": "Sprinkle in the flour and stir for 1 minute, then whisk in the broth. Add the potatoes and simmer until fork-tender.", "timer_minutes": 15},
            {"body": "Mash some of the potatoes against the pot for a thicker soup, then stir in the milk and cream and warm through.", "timer_minutes": 10},
            {"body": "Off the heat, stir in the cheddar and sour cream until melted. Season and serve with bacon, chives, and extra cheese.", "timer_minutes": None},
        ],
        "notes": [
            "Don't boil after adding the cheese or it can break.",
        ],
    },
    {
        "title": "Sweet Cornbread",
        "slug": "sweet-cornbread",
        "summary": "Golden, lightly sweet cornbread with crisp buttery edges — perfect alongside chili or potato soup.",
        "description": "A 50/50 cornmeal-to-flour batter keeps it tender, and the buttermilk adds just enough tang to balance the sweetness.",
        "servings": 9,
        "prep_minutes": 10,
        "cook_minutes": 25,
        "emoji": "🌽",
        "course": "Side",
        "cuisine": "American",
        "diets": ["Vegetarian"],
        "equipment": ["8x8 baking pan"],
        "tags": ["Baking", "Kid Favorite"],
        "family_note": "Aunt Ruthie always doubled the sugar; we compromise at 3/4 cup.",
        "ingredients": [
            {"quantity": "1", "unit": "cup", "ingredient_name": "yellow cornmeal"},
            {"quantity": "1", "unit": "cup", "ingredient_name": "all-purpose flour"},
            {"quantity": "3/4", "unit": "cup", "ingredient_name": "sugar"},
            {"quantity": "1", "unit": "tbsp", "ingredient_name": "baking powder"},
            {"quantity": "1/2", "unit": "tsp", "ingredient_name": "salt"},
            {"quantity": "1", "unit": "cup", "ingredient_name": "buttermilk"},
            {"quantity": "2", "unit": "", "ingredient_name": "eggs"},
            {"quantity": "1/2", "unit": "cup", "ingredient_name": "butter", "preparation": "melted (1 stick)"},
            {"quantity": "", "unit": "", "ingredient_name": "honey", "notes": "for serving"},
        ],
        "steps": [
            {"body": "Preheat the oven to 400°F and grease an 8x8 baking pan.", "timer_minutes": None},
            {"body": "Whisk the cornmeal, flour, sugar, baking powder, and salt in a large bowl.", "timer_minutes": None},
            {"body": "In a separate bowl, whisk the buttermilk, eggs, and melted butter.", "timer_minutes": None},
            {"body": "Fold the wet ingredients into the dry until just combined — do not overmix. Pour into the pan.", "timer_minutes": None},
            {"body": "Bake until golden and a toothpick comes out clean.", "timer_minutes": 22},
            {"body": "Cool in the pan for 10 minutes before slicing. Serve warm with honey and butter.", "timer_minutes": 10},
        ],
        "notes": [
            "Warm the buttermilk slightly for a more tender crumb.",
        ],
    },
    {
        "title": "Almond Poppy Seed Bread",
        "slug": "almond-poppy-seed-bread",
        "summary": "Tender almond quick bread with a sweet almond glaze — the Mikkelsen holiday standard.",
        "description": "The glaze soaks in while the loaf is still warm, giving the top a crackly, almond-scented crust. Best made a day ahead.",
        "servings": 10,
        "prep_minutes": 15,
        "cook_minutes": 55,
        "emoji": "🍞",
        "course": "Dessert",
        "cuisine": "American",
        "diets": ["Vegetarian"],
        "equipment": ["Loaf pan", "Mixing bowls"],
        "tags": ["Baking", "Holiday", "Family Classic"],
        "family_note": "Baked every Christmas Eve since 1987 — Grandpa Al insisted on extra glaze.",
        "ingredients": [
            {"section": "Bread", "quantity": "2", "unit": "cups", "ingredient_name": "all-purpose flour"},
            {"section": "Bread", "quantity": "1 1/2", "unit": "cups", "ingredient_name": "sugar"},
            {"section": "Bread", "quantity": "1", "unit": "tbsp", "ingredient_name": "baking powder"},
            {"section": "Bread", "quantity": "3/4", "unit": "tsp", "ingredient_name": "salt"},
            {"section": "Bread", "quantity": "3", "unit": "tbsp", "ingredient_name": "poppy seeds"},
            {"section": "Bread", "quantity": "3", "unit": "", "ingredient_name": "eggs"},
            {"section": "Bread", "quantity": "1", "unit": "cup", "ingredient_name": "milk"},
            {"section": "Bread", "quantity": "3/4", "unit": "cup", "ingredient_name": "vegetable oil"},
            {"section": "Bread", "quantity": "1 1/2", "unit": "tsp", "ingredient_name": "almond extract"},
            {"section": "Bread", "quantity": "1", "unit": "tsp", "ingredient_name": "vanilla extract"},
            {"section": "Glaze", "quantity": "1", "unit": "cup", "ingredient_name": "powdered sugar"},
            {"section": "Glaze", "quantity": "2", "unit": "tbsp", "ingredient_name": "milk"},
            {"section": "Glaze", "quantity": "1/2", "unit": "tsp", "ingredient_name": "almond extract"},
        ],
        "steps": [
            {"body": "Preheat the oven to 350°F and grease a 9x5 loaf pan.", "timer_minutes": None},
            {"body": "Whisk the flour, sugar, baking powder, salt, and poppy seeds.", "timer_minutes": None},
            {"body": "Beat the eggs with the milk, oil, and extracts, then fold into the dry ingredients until just combined.", "timer_minutes": None},
            {"body": "Pour into the pan and bake until a toothpick comes out clean and the top is deep golden.", "timer_minutes": 50},
            {"body": "Cool in the pan for 15 minutes, then whisk the glaze and drizzle over the warm loaf.", "timer_minutes": 15},
        ],
        "notes": [
            "Even better the next day once the glaze has soaked in.",
            "Bake as mini loaves (about 35 minutes) for gift-giving.",
        ],
    },
]


def ensure_admin(db) -> User | None:
    email = settings.initial_admin_email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if user is not None:
        return user
    user = User(
        email=email,
        password_hash=hash_password(settings.initial_admin_password),
        display_name="Justin",
        role="admin",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"Created admin user: {email}")
    return user


def recipe_payload(spec: dict) -> RecipeIn:
    terms = [TermRefIn(type="course", name=spec["course"])] if spec.get("course") else []
    if spec.get("cuisine"):
        terms.append(TermRefIn(type="cuisine", name=spec["cuisine"]))
    terms += [TermRefIn(type="diet", name=d) for d in spec.get("diets", [])]
    terms += [TermRefIn(type="equipment", name=e) for e in spec.get("equipment", [])]
    terms += [TermRefIn(type="tag", name=t) for t in spec.get("tags", [])]

    return RecipeIn(
        title=spec["title"],
        slug=spec["slug"],
        summary=spec["summary"],
        description=spec.get("description", ""),
        servings=spec.get("servings"),
        prep_minutes=spec.get("prep_minutes"),
        cook_minutes=spec.get("cook_minutes"),
        status="published",
        family_note=spec.get("family_note"),
        ingredients=[IngredientIn(**ing, sort_order=i) for i, ing in enumerate(spec["ingredients"])],
        steps=[StepIn(body=s["body"], timer_minutes=s.get("timer_minutes"), sort_order=i) for i, s in enumerate(spec["steps"])],
        notes=[NoteIn(body=n, sort_order=i) for i, n in enumerate(spec.get("notes", []))],
        terms=terms,
    )


def seed_recipe(db, spec: dict) -> Recipe:
    existing = db.query(Recipe).filter(Recipe.slug == spec["slug"]).first()
    if existing is not None:
        print(f"Recipe exists, skipping: {spec['title']}")
        return existing

    recipe = Recipe()
    apply_recipe_payload(db, recipe, recipe_payload(spec))

    # Generate a graceful placeholder image unless a real one is already set.
    if not recipe.image_url:
        recipe.image_url = write_placeholder_svg(spec["slug"], spec["title"], spec.get("emoji", "🍽️"))
        recipe.image_alt = spec["title"]

    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    print(f"Seeded recipe: {spec['title']}")
    return recipe


def main() -> None:
    db = SessionLocal()
    try:
        ensure_admin(db)
        for spec in SEED_RECIPES:
            seed_recipe(db, spec)
        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    main()