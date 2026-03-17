from datetime import datetime

from sqlalchemy import Integer, Text, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CareerPlan(Base):
    __tablename__ = "career_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    profile_id: Mapped[int] = mapped_column(Integer, ForeignKey("talent_profiles.id"), nullable=False)
    plan_content: Mapped[dict] = mapped_column(JSON, nullable=False)
    resume_advice: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
