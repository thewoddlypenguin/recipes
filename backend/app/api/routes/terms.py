from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models.term import TERM_TYPES, Term
from app.schemas.term import TermCreate, TermOut
from app.services.recipes import get_or_create_term

router = APIRouter()


@router.get("", response_model=list[TermOut])
def list_terms(
    type: str | None = Query(None, description="Filter by term type"),
    db: Session = Depends(get_db),
) -> list[TermOut]:
    query = db.query(Term)
    if type:
        query = query.filter(Term.type == type)
    return query.order_by(Term.type, Term.name).all()


@router.post("", response_model=TermOut, status_code=status.HTTP_201_CREATED)
def create_term(
    payload: TermCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "editor")),
) -> TermOut:
    if payload.type not in TERM_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid term type. Allowed: {', '.join(TERM_TYPES)}",
        )
    term = get_or_create_term(db, payload.type, payload.name)
    db.commit()
    db.refresh(term)
    return TermOut.model_validate(term)