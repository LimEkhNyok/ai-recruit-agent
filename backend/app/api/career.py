from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.career import CareerPlanResponse
from app.api.deps import get_db, get_current_user
from app.services import career_service

router = APIRouter(prefix="/api/career", tags=["career"])


@router.post("/generate", response_model=CareerPlanResponse)
async def generate(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        plan = await career_service.generate_plan(current_user.id, db)
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
