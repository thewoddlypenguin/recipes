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