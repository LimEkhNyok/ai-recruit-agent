from datetime import datetime

from sqlalchemy import Integer, Float, Text, DateTime, ForeignKey, JSON, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class MatchResult(Base):
    __tablename__ = "match_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    profile_id: Mapped[int] = mapped_column(Integer, ForeignKey("talent_profiles.id"), nullable=False)
    job_id: Mapped[int] = mapped_column(Integer, ForeignKey("job_positions.id"), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    breakdown: Mapped[dict] = mapped_column(JSON, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    is_beyond_cognition: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
