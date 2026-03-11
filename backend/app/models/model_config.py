from datetime import datetime

from sqlalchemy import Integer, String, Text, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UserModelConfig(Base):
    __tablename__ = "user_model_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    mode: Mapped[str] = mapped_column(String(20), nullable=False, default="platform")
    base_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    api_key_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    supports_chat: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    supports_stream: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    supports_json: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    supports_embedding: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    last_test_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    last_test_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
