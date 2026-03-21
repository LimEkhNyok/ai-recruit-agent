import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.model_service import ModelService
from app.schemas.interview import (
    InterviewStartRequest,
    InterviewStartResponse,
    InterviewChatRequest,
    InterviewEndRequest,
    EvaluationResponse,
    InterviewHistoryResponse,
)
from app.api.deps import get_db, get_current_user, get_model_service, require_feature, require_billing
from app.services import interview_service

router = APIRouter(prefix="/api/interview", tags=["interview"])

_interview_sessions: dict[int, str] = {}


@router.post("/start", response_model=InterviewStartResponse)
async def start(
    req: InterviewStartRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    model_service: ModelService = Depends(get_model_service),
    _=Depends(require_feature("interview")),
    __=Depends(require_billing("interview")),
):
    sid = str(uuid.uuid4())
    _interview_sessions[current_user.id] = sid
    model_service._feature = "interview"
    model_service.set_session(sid)
    if not req.job_id and not req.jd_context:
        raise HTTPException(status_code=400, detail="job_id or jd_context is required")
    try:
        interview_id, job_title, message = await interview_service.start_interview(
            current_user.id, req.job_id, db, model_service, jd_context=req.jd_context
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return InterviewStartResponse(interview_id=interview_id, job_title=job_title, message=message)


@router.post("/chat")
async def chat(
    req: InterviewChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    model_service: ModelService = Depends(get_model_service),
    _=Depends(require_feature("interview")),
):
    model_service._feature = "interview"
    sid = _interview_sessions.get(current_user.id)
    if sid:
        model_service.set_session(sid)
    async def event_generator():
        try:
            async for chunk in interview_service.chat_stream(req.interview_id, req.message, db, model_service):
                data = json.dumps({"text": chunk}, ensure_ascii=False)
                yield f"data: {data}\n\n"
            yield "data: [DONE]\n\n"
        except ValueError as e:
            error = json.dumps({"error": str(e)}, ensure_ascii=False)
            yield f"data: {error}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/end", response_model=EvaluationResponse)
async def end(
    req: InterviewEndRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    model_service: ModelService = Depends(get_model_service),
    _=Depends(require_feature("interview")),
):
    model_service._feature = "interview"
    sid = _interview_sessions.pop(current_user.id, None)
    if sid:
        model_service.set_session(sid)
    try:
        job_title, evaluation = await interview_service.end_interview(req.interview_id, db, model_service)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return EvaluationResponse(interview_id=req.interview_id, job_title=job_title, evaluation=evaluation)


@router.get("/history", response_model=InterviewHistoryResponse)
async def history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    model_service: ModelService = Depends(get_model_service),
):
    data = await interview_service.get_history(current_user.id, db, language=model_service.language)
    return InterviewHistoryResponse(interviews=data)
