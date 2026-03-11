import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.model_service import ModelService
from app.schemas.assessment import (
    StartResponse,
    ChatRequest,
    ChatResponse,
    FinishRequest,
    ProfileResponse,
)
from app.api.deps import get_db, get_current_user, get_model_service, require_feature
from app.services import assessment_service

router = APIRouter(prefix="/api/assessment", tags=["assessment"])

_assessment_sessions: dict[int, str] = {}


@router.post("/start", response_model=StartResponse)
async def start(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    model_service: ModelService = Depends(get_model_service),
    _=Depends(require_feature("assessment")),
):
    sid = str(uuid.uuid4())
    _assessment_sessions[current_user.id] = sid
    model_service._feature = "assessment"
    model_service.set_session(sid)
    assessment_id, message = await assessment_service.start_assessment(current_user.id, db, model_service)
    return StartResponse(assessment_id=assessment_id, message=message)


@router.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    model_service: ModelService = Depends(get_model_service),
    _=Depends(require_feature("assessment")),
):
    try:
        model_service._feature = "assessment"
        sid = _assessment_sessions.get(current_user.id)
        if sid:
            model_service.set_session(sid)
        reply, is_complete = await assessment_service.chat(req.assessment_id, req.message, db, model_service)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return ChatResponse(reply=reply, is_complete=is_complete)


@router.post("/finish", response_model=ProfileResponse)
async def finish(
    req: FinishRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    model_service: ModelService = Depends(get_model_service),
    _=Depends(require_feature("assessment")),
):
    try:
        model_service._feature = "assessment"
        sid = _assessment_sessions.pop(current_user.id, None)
        if sid:
            model_service.set_session(sid)
        profile = await assessment_service.finish_assessment(req.assessment_id, db, model_service)
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
