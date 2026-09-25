from sqlalchemy import Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.user import TimestampMixin

TERM_TYPES = ("course", "cuisine", "diet", "equipment", "ingredient", "tag")


class Term(Base, TimestampMixin):
    __tablename__ = "terms"
    __table_args__ = (UniqueConstraint("slug", "type", name="uq_terms_slug_type"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(140), index=True, nullable=False)
    type: Mapped[str] = mapped_column(String(20), index=True, nullable=False)