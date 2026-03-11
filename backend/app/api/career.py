import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.model_service import ModelService
from app.schemas.career import CareerPlanResponse
from app.api.deps import get_db, get_current_user, get_model_service, require_feature, require_billing
from app.services import career_service

router = APIRouter(prefix="/api/career", tags=["career"])


@router.post("/generate", response_model=CareerPlanResponse)
async def generate(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    model_service: ModelService = Depends(get_model_service),
    _=Depends(require_feature("career")),
    __=Depends(require_billing("career")),
):
    model_service._feature = "career"
    model_service.set_session(str(uuid.uuid4()))
    try:
        plan = await career_service.generate_plan(current_user.id, db, model_service)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return plan


@router.get("/plan", response_model=CareerPlanResponse)
async def plan(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await career_service.get_latest_plan(current_user.id, db)
    if result is None:
        raise HTTPException(status_code=404, detail="No career plan found. Please generate one first.")
    return result
