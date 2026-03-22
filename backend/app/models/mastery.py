from datetime import datetime

from sqlalchemy import Integer, String, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class KnowledgeMastery(Base):
    __tablename__ = "knowledge_mastery"
    __table_args__ = (
        UniqueConstraint("user_id", "domain", "knowledge_point", name="uq_user_domain_kp"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    domain: Mapped[str] = mapped_column(String(50), nullable=False)
    knowledge_point: Mapped[str] = mapped_column(String(100), nullable=False)
    mastery_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    floor_level: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
