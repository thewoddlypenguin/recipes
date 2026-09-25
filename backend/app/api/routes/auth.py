from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, require_roles, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserOut

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return TokenResponse(access_token=create_access_token(user), user=UserOut.model_validate(user))


@router.post("/logout")
def logout() -> dict:
    # JWT auth is stateless; the client drops its token.
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(require_roles("admin", "editor", "viewer"))) -> UserOut:
    return UserOut.model_validate(user)