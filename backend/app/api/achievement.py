from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.api.deps import get_db, get_current_user, get_model_service
from app.services.model_service import ModelService
from app.services.achievement_service import (
    check_achievements,
    get_achievements_with_progress,
)

router = APIRouter(prefix="/api/achievements", tags=["achievements"])


@router.get("")
async def get_achievements(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    model_service: ModelService = Depends(get_model_service),
):
    lang = model_service.language
    return await get_achievements_with_progress(current_user.id, db, lang)


@router.post("/check")
async def check(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    model_service: ModelService = Depends(get_model_service),
):
    lang = model_service.language
    newly_unlocked = await check_achievements(current_user.id, db, lang)
    return {"newly_unlocked": newly_unlocked}
