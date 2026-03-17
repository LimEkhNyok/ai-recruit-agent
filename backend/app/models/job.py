from datetime import datetime

from sqlalchemy import Integer, String, Text, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class JobPosition(Base):
    __tablename__ = "job_positions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    requirements: Mapped[dict | list] = mapped_column(JSON, nullable=False)
    culture_keywords: Mapped[list] = mapped_column(JSON, nullable=False)
    personality_fit: Mapped[dict] = mapped_column(JSON, nullable=False)
    ability_requirements: Mapped[dict] = mapped_column(JSON, nullable=False)
    interest_tags: Mapped[list] = mapped_column(JSON, nullable=False)
    embedding: Mapped[list] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
