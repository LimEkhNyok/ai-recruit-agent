from datetime import datetime

from sqlalchemy import Integer, String, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UserAchievement(Base):
    __tablename__ = "user_achievements"
    __table_args__ = (
        UniqueConstraint("user_id", "achievement_id", name="uq_user_achievement"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    achievement_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    unlocked_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
