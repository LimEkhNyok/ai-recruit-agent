from typing import AsyncGenerator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.config import get_settings
from app.models.user import User
from app.models.model_config import UserModelConfig
from app.services.model_service import ModelService, get_model_service_for_user
from app.services.capability_test import FEATURE_REQUIREMENTS, get_available_features
from app.services.billing_service import check_access

security = HTTPBearer()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    settings = get_settings()
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: int | None = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def get_model_service(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ModelService:
    return await get_model_service_for_user(current_user, db)


def require_feature(feature_name: str):
    """Factory that returns a FastAPI dependency checking feature availability."""

    CAPABILITY_LABELS = {
        "chat": "Chat 对话",
        "stream": "流式对话",
        "json": "JSON 结构化输出",
        "embedding": "向量嵌入 (Embedding)",
    }

    async def _guard(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ):
        result = await db.execute(
            select(UserModelConfig).where(UserModelConfig.user_id == current_user.id)
        )
        config = result.scalar_one_or_none()

        if config is None:
            features = get_available_features(True, True, True, False)
        else:
            features = get_available_features(
                config.supports_chat, config.supports_stream,
                config.supports_json, config.supports_embedding,
            )

        if not features.get(feature_name, False):
            required = FEATURE_REQUIREMENTS.get(feature_name, [])
            missing = []
            caps = {
                "chat": config.supports_chat if config else True,
                "stream": config.supports_stream if config else True,
                "json": config.supports_json if config else True,
                "embedding": config.supports_embedding if config else False,
            }
            for req in required:
                if not caps.get(req, False):
                    missing.append(CAPABILITY_LABELS.get(req, req))

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"当前模型配置不支持此功能（缺少：{', '.join(missing)}），请在模型设置中更换 provider/model",
            )

    return _guard


def require_billing(feature_name: str):
    """Factory that returns a dependency enforcing billing access for platform-mode users."""

    async def _guard(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ):
        result = await db.execute(
            select(UserModelConfig).where(UserModelConfig.user_id == current_user.id)
        )
        config = result.scalar_one_or_none()
        mode = config.mode if config else "platform"

        allowed, reason = await check_access(current_user.id, feature_name, mode, db)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=reason,
            )

    return _guard
