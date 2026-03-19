from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.model_config import UserModelConfig
from app.schemas.model_config import (
    ModelConfigSaveRequest,
    ModelConfigResponse,
    ModelConfigTestRequest,
    ModelConfigTestResponse,
    FeatureAvailabilityResponse,
)
from app.api.deps import get_db, get_current_user
from app.utils.crypto import encrypt_key, decrypt_key, mask_key
from app.services.capability_test import run_all_tests, get_available_features
from app.config import get_settings

router = APIRouter(prefix="/api/model-config", tags=["model-config"])


async def _get_user_config(user_id: int, db: AsyncSession) -> UserModelConfig | None:
    result = await db.execute(
        select(UserModelConfig).where(UserModelConfig.user_id == user_id)
    )
    return result.scalar_one_or_none()


@router.get("", response_model=ModelConfigResponse)
async def get_config(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    config = await _get_user_config(current_user.id, db)
    if config is None:
        return ModelConfigResponse(mode="byok")

    api_key_masked = None
    if config.api_key_encrypted:
        try:
            plain = decrypt_key(config.api_key_encrypted)
            api_key_masked = mask_key(plain)
        except Exception:
            api_key_masked = "***"

    return ModelConfigResponse(
        mode=config.mode,
        base_url=config.base_url,
        model=config.model,
        api_key_masked=api_key_masked,
        supports_chat=config.supports_chat,
        supports_stream=config.supports_stream,
        supports_json=config.supports_json,
        supports_embedding=config.supports_embedding,
        last_test_status=config.last_test_status,
        last_test_error=config.last_test_error,
    )


@router.post("", response_model=ModelConfigResponse)
async def save_config(
    req: ModelConfigSaveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    config = await _get_user_config(current_user.id, db)

    if req.mode == "platform":
        if config is None:
            config = UserModelConfig(user_id=current_user.id, mode="platform")
            db.add(config)
        else:
            config.mode = "platform"

        settings = get_settings()
        config.base_url = settings.GEMINI_BASE_URL
        config.model = settings.GEMINI_MODEL
        config.supports_chat = True
        config.supports_stream = True
        config.supports_json = True
        config.supports_embedding = True
        config.last_test_status = "ok"
        config.last_test_error = None
        await db.commit()
        await db.refresh(config)
        return ModelConfigResponse(
            mode=config.mode, base_url=config.base_url, model=config.model,
            supports_chat=True, supports_stream=True, supports_json=True,
            supports_embedding=True, last_test_status="ok",
        )

    if not req.base_url or not req.model or not req.api_key:
        raise HTTPException(status_code=400, detail="BYOK 模式需要填写 base_url、model 和 api_key")

    test_result = await run_all_tests(req.base_url, req.api_key, req.model)

    if not test_result["supports_chat"]:
        raise HTTPException(
            status_code=400,
            detail=f"基础 Chat 能力测试失败，无法保存：{test_result['errors'].get('chat', '未知错误')}",
        )

    if config is None:
        config = UserModelConfig(user_id=current_user.id)
        db.add(config)

    config.mode = "byok"
    config.base_url = req.base_url
    config.model = req.model
    config.api_key_encrypted = encrypt_key(req.api_key)
    config.supports_chat = test_result["supports_chat"]
    config.supports_stream = test_result["supports_stream"]
    config.supports_json = test_result["supports_json"]
    config.supports_embedding = test_result["supports_embedding"]
    config.last_test_status = "ok" if not test_result["errors"] else "partial"
    config.last_test_error = "; ".join(f"{k}: {v}" for k, v in test_result["errors"].items()) or None

    await db.commit()
    await db.refresh(config)

    return ModelConfigResponse(
        mode=config.mode,
        base_url=config.base_url,
        model=config.model,
        api_key_masked=mask_key(req.api_key),
        supports_chat=config.supports_chat,
        supports_stream=config.supports_stream,
        supports_json=config.supports_json,
        supports_embedding=config.supports_embedding,
        last_test_status=config.last_test_status,
        last_test_error=config.last_test_error,
    )


@router.post("/test", response_model=ModelConfigTestResponse)
async def test_config(
    req: ModelConfigTestRequest,
    current_user: User = Depends(get_current_user),
):
    result = await run_all_tests(req.base_url, req.api_key, req.model)
    return ModelConfigTestResponse(**result)


@router.get("/features", response_model=FeatureAvailabilityResponse)
async def get_features(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    config = await _get_user_config(current_user.id, db)
    if config is None:
        return FeatureAvailabilityResponse(
            assessment=True, matching=True, interview=True,
            career=True, resume=True, quiz=True,
        )

    features = get_available_features(
        config.supports_chat, config.supports_stream,
        config.supports_json, config.supports_embedding,
    )
    return FeatureAvailabilityResponse(**features)
