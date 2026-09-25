"""Pytest fixtures: isolated SQLite database + TestClient."""

import os
import sys
from pathlib import Path

# Ensure backend/ is importable and settings resolve to a test database
# before any app module is imported.
BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
os.environ["DATABASE_URL"] = "sqlite:///./test_api.db"
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["UPLOAD_DIR"] = str(BACKEND_DIR / "test_uploads")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture(scope="session")
def client():
    from app.core.database import Base, SessionLocal, engine
    from app.core.security import hash_password
    from app.main import app
    from app.models.user import User

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    if db.query(User).count() == 0:
        db.add(
            User(
                email="admin@test.com",
                password_hash=hash_password("secret123"),
                display_name="Test Admin",
                role="admin",
                is_active=True,
            )
        )
        db.commit()
    db.close()

    with TestClient(app) as c:
        yield c

    # cleanup local artifacts
    db_file = BACKEND_DIR / "test_api.db"
    if db_file.exists():
        db_file.unlink()


@pytest.fixture(scope="session")
def admin_headers(client):
    res = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "secret123"})
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}