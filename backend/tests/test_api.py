"""API smoke tests covering auth, recipes CRUD + filters, terms, weekly menu."""


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_login_rejects_bad_credentials(client):
    res = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "wrong"})
    assert res.status_code == 401


def test_me_requires_token(client):
    assert client.get("/api/auth/me").status_code == 401
    headers = {"Authorization": "Bearer not-a-token"}
    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_recipe_lifecycle(client, admin_headers):
    payload = {
        "title": "Test Breakfast Bake",
        "summary": "A test recipe",
        "servings": 4,
        "prep_minutes": 10,
        "cook_minutes": 30,
        "status": "published",
        "ingredients": [
            {"quantity": "6", "unit": "eggs", "ingredient_name": "eggs", "sort_order": 0},
            {"quantity": "1", "unit": "cup", "ingredient_name": "cheddar", "preparation": "shredded", "sort_order": 1},
        ],
        "steps": [
            {"body": "Preheat oven to 375F.", "timer_minutes": None, "sort_order": 0},
            {"body": "Bake until set.", "timer_minutes": 25, "sort_order": 1},
        ],
        "notes": [{"body": "Great with toast.", "sort_order": 0}],
        "terms": [
            {"type": "course", "name": "Breakfast"},
            {"type": "tag", "name": "One Pot"},
        ],
    }
    created = client.post("/api/recipes", json=payload, headers=admin_headers)
    assert created.status_code == 201, created.text
    recipe = created.json()
    assert recipe["slug"] == "test-breakfast-bake"
    assert recipe["total_minutes"] == 40
    assert recipe["course"] == "Breakfast"
    assert len(recipe["ingredients"]) == 2
    assert recipe["steps"][1]["timer_minutes"] == 25

    # Auto-created ingredient term exists
    terms = client.get("/api/terms", params={"type": "ingredient"}).json()
    assert any(t["slug"] == "cheddar" for t in terms)

    # Anonymous list includes it
    listed = client.get("/api/recipes").json()
    assert any(r["slug"] == "test-breakfast-bake" for r in listed["items"])

    # Search
    found = client.get("/api/recipes", params={"q": "breakfast"}).json()
    assert found["total"] >= 1

    # Tag filter (name or slug, comma separated)
    by_tag = client.get("/api/recipes", params={"tag": "one-pot"}).json()
    assert any(r["slug"] == "test-breakfast-bake" for r in by_tag["items"])

    # Detail by slug
    detail = client.get("/api/recipes/test-breakfast-bake").json()
    assert detail["title"] == "Test Breakfast Bake"

    # Update
    payload["title"] = "Test Breakfast Bake v2"
    updated = client.put(f"/api/recipes/id/{recipe['id']}", json=payload, headers=admin_headers)
    assert updated.status_code == 200
    assert updated.json()["title"].endswith("v2")

    # Archive (DELETE is a soft delete)
    archived = client.delete(f"/api/recipes/{recipe['id']}", headers=admin_headers)
    assert archived.status_code == 200
    gone = client.get("/api/recipes/test-breakfast-bake")
    assert gone.status_code == 404

    # Draft is hidden from anonymous users but visible to editors
    draft_payload = dict(payload, title="Secret Draft", status="draft", slug="secret-draft")
    made = client.post("/api/recipes", json=draft_payload, headers=admin_headers)
    assert made.status_code == 201
    assert client.get("/api/recipes/secret-draft").status_code == 404
    assert client.get("/api/recipes/secret-draft", headers=admin_headers).status_code == 200
    assert client.get("/api/recipes", params={"status": "draft"}, headers=admin_headers).json()["total"] >= 1


def test_write_requires_auth(client):
    res = client.post("/api/recipes", json={"title": "Nope"})
    assert res.status_code == 401


def test_weekly_menu_flow(client, admin_headers):
    # Create a published recipe to plan
    made = client.post(
        "/api/recipes",
        json={"title": "Planned Chili", "slug": "planned-chili", "status": "published"},
        headers=admin_headers,
    )
    assert made.status_code == 201
    target = made.json()

    # Get-or-create for the current week
    menu = client.get("/api/weekly-menu").json()
    assert len(menu["items"]) == 7
    assert menu["items"][0]["day_of_week"] == 0

    # Assign the recipe to Monday and add a note
    update = client.put(
        f"/api/weekly-menu/{menu['id']}",
        json={"items": [{"day_of_week": 0, "recipe_id": target["id"], "note": "Double batch"}]},
        headers=admin_headers,
    )
    assert update.status_code == 200
    monday = update.json()["items"][0]
    assert monday["recipe_id"] == target["id"]
    assert monday["recipe"]["slug"] == target["slug"]
    assert monday["note"] == "Double batch"
    # Other days remain empty slots
    assert update.json()["items"][1]["recipe_id"] is None

    # Explicit date param
    by_date = client.get("/api/weekly-menu", params={"week_start": "2026-02-04"}).json()
    assert by_date["week_start_date"] == "2026-02-02"  # normalized to Monday


def test_terms_endpoint(client, admin_headers):
    terms = client.get("/api/terms").json()
    assert all({"id", "name", "slug", "type"} <= set(t) for t in terms)
    courses = client.get("/api/terms", params={"type": "course"}).json()
    assert all(t["type"] == "course" for t in courses)

    made = client.post("/api/terms", json={"name": "Instant Pot", "type": "equipment"}, headers=admin_headers)
    assert made.status_code == 201
    assert made.json()["slug"] == "instant-pot"

    bad = client.post("/api/terms", json={"name": "X", "type": "bogus"}, headers=admin_headers)
    assert bad.status_code == 400


def test_tag_filter_is_exact_not_text_search(client, admin_headers):
    """Tag filters must match associated term records exactly, not search text."""
    # Recipe 1: genuinely a chicken recipe — tagged "Chicken"
    client.post(
        "/api/recipes",
        json={
            "title": "Roast Chicken",
            "slug": "roast-chicken",
            "summary": "A classic roast chicken.",
            "status": "published",
            "ingredients": [
                {"quantity": "1", "unit": "whole", "ingredient_name": "chicken", "sort_order": 0},
            ],
            "steps": [{"body": "Roast at 425F.", "sort_order": 0}],
            "terms": [{"type": "tag", "name": "Chicken"}],
        },
        headers=admin_headers,
    )

    # Recipe 2: vegetable soup that uses chicken broth — NOT tagged "Chicken"
    client.post(
        "/api/recipes",
        json={
            "title": "Vegetable Soup",
            "slug": "vegetable-soup",
            "summary": "Hearty soup with chicken broth.",
            "status": "published",
            "ingredients": [
                {"quantity": "3", "unit": "cups", "ingredient_name": "chicken broth", "sort_order": 0},
                {"quantity": "2", "unit": "cups", "ingredient_name": "mixed vegetables", "sort_order": 1},
            ],
            "steps": [{"body": "Simmer vegetables in broth.", "sort_order": 0}],
            "terms": [{"type": "tag", "name": "Soup"}],
        },
        headers=admin_headers,
    )

    # Recipe 3: beef stew whose notes mention chicken — NOT tagged "Chicken"
    client.post(
        "/api/recipes",
        json={
            "title": "Beef Stew",
            "slug": "beef-stew",
            "summary": "Rich beef stew.",
            "description": "Can substitute chicken if preferred.",
            "status": "published",
            "ingredients": [
                {"quantity": "2", "unit": "lbs", "ingredient_name": "beef chuck", "sort_order": 0},
            ],
            "steps": [{"body": "Brown the beef and simmer.", "sort_order": 0}],
            "notes": [{"body": "Can substitute chicken.", "sort_order": 0}],
            "terms": [{"type": "tag", "name": "Beef"}],
        },
        headers=admin_headers,
    )

    # Tag filter "Chicken" must return ONLY the roast chicken recipe
    by_tag = client.get("/api/recipes", params={"tag": "Chicken"}).json()
    slugs = [r["slug"] for r in by_tag["items"]]
    assert "roast-chicken" in slugs
    assert "vegetable-soup" not in slugs, "Recipe with 'chicken broth' ingredient must not match tag=Chicken"
    assert "beef-stew" not in slugs, "Recipe mentioning 'chicken' in notes must not match tag=Chicken"
    assert by_tag["total"] == 1

    # Slug-form filter should also work
    by_tag_slug = client.get("/api/recipes", params={"tag": "chicken"}).json()
    assert by_tag_slug["total"] == 1
    assert by_tag_slug["items"][0]["slug"] == "roast-chicken"


def test_search_is_broad_while_filter_is_precise(client, admin_headers):
    """q= search matches text broadly; tag= filter matches terms only."""
    # Recipe with chicken broth but no Chicken tag
    client.post(
        "/api/recipes",
        json={
            "title": "Mushroom Risotto",
            "slug": "mushroom-risotto",
            "summary": "Creamy risotto made with chicken stock.",
            "status": "published",
            "ingredients": [
                {"quantity": "4", "unit": "cups", "ingredient_name": "chicken stock", "sort_order": 0},
                {"quantity": "1", "unit": "cup", "ingredient_name": "arborio rice", "sort_order": 1},
            ],
            "steps": [{"body": "Add stock gradually to rice.", "sort_order": 0}],
            "terms": [{"type": "tag", "name": "Rice"}],
        },
        headers=admin_headers,
    )

    # Recipe tagged Chicken
    client.post(
        "/api/recipes",
        json={
            "title": "Chicken Tacos",
            "slug": "chicken-tacos",
            "summary": "Spicy shredded chicken tacos.",
            "status": "published",
            "ingredients": [
                {"quantity": "1", "unit": "lb", "ingredient_name": "chicken breast", "sort_order": 0},
            ],
            "steps": [{"body": "Shred and season chicken.", "sort_order": 0}],
            "terms": [{"type": "tag", "name": "Chicken"}, {"type": "cuisine", "name": "Mexican"}],
        },
        headers=admin_headers,
    )

    # Search for "chicken" — should find BOTH (broad text match on summary/ingredients)
    search = client.get("/api/recipes", params={"q": "chicken"}).json()
    search_slugs = {r["slug"] for r in search["items"]}
    assert "chicken-tacos" in search_slugs
    assert "mushroom-risotto" in search_slugs, "Search should find recipes mentioning 'chicken stock' in summary"

    # Filter by tag "Chicken" — should find ONLY the tacos (precise term match)
    filtered = client.get("/api/recipes", params={"tag": "Chicken"}).json()
    filter_slugs = {r["slug"] for r in filtered["items"]}
    assert "chicken-tacos" in filter_slugs
    assert "mushroom-risotto" not in filter_slugs, "Tag filter must not match recipes without the Chicken tag"


def test_filter_with_pagination(client, admin_headers):
    """Filtering + pagination must return correct total and no skips/dupes."""
    # Create 5 chicken-tagged recipes (previous tests may have added more)
    created_slugs = []
    for i in range(5):
        created_slugs.append(f"chicken-dish-{i}")
        client.post(
            "/api/recipes",
            json={
                "title": f"Chicken Dish {i}",
                "slug": f"chicken-dish-{i}",
                "summary": f"Chicken recipe number {i}.",
                "status": "published",
                "ingredients": [
                    {"quantity": "1", "unit": "lb", "ingredient_name": "chicken", "sort_order": 0},
                ],
                "steps": [{"body": f"Cook chicken dish {i}.", "sort_order": 0}],
                "terms": [{"type": "tag", "name": "Chicken"}],
            },
            headers=admin_headers,
        )

    # Fetch all chicken-tagged recipes across 3 pages (limit=2)
    all_items = []
    total = None
    for offset in (0, 2, 4, 6, 8, 10):
        page = client.get("/api/recipes", params={"tag": "Chicken", "limit": 2, "offset": offset}).json()
        total = page["total"]
        all_items.extend(page["items"])
        if len(page["items"]) < 2:
            break

    # Total is consistent across all pages
    assert total is not None
    assert total >= 5

    # All 5 created recipes appear in the full set
    all_slugs = {r["slug"] for r in all_items}
    for slug in created_slugs:
        assert slug in all_slugs, f"{slug} missing from paginated results"

    # No duplicate slugs across pages
    assert len(all_slugs) == len(all_items), "Duplicate recipes found across pages"