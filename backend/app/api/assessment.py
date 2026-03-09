from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.assessment import (
    StartResponse,
    ChatRequest,
    ChatResponse,
    FinishRequest,
    ProfileResponse,
)
from app.api.deps import get_db, get_current_user
from app.services import assessment_service

router = APIRouter(prefix="/api/assessment", tags=["assessment"])


@router.post("/start", response_model=StartResponse)
async def start(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    assessment_id, message = await assessment_service.start_assessment(current_user.id, db)
    return StartResponse(assessment_id=assessment_id, message=message)


@router.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        reply, is_complete = await assessment_service.chat(req.assessment_id, req.message, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return ChatResponse(reply=reply, is_complete=is_complete)


@router.post("/finish", response_model=ProfileResponse)
async def finish(
    req: FinishRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        profile = await assessment_service.finish_assessment(req.assessment_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return profile


@router.get("/profile", response_model=ProfileResponse)
async def profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await assessment_service.get_latest_profile(current_user.id, db)
    if result is None:
        raise HTTPException(status_code=404, detail="No profile found. Please complete an assessment first.")
    return result
