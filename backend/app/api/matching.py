import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.model_service import ModelService
from app.schemas.matching import MatchResultResponse, MatchListResponse
from app.api.deps import get_db, get_current_user, get_model_service, require_feature
from app.services import matching_service

router = APIRouter(prefix="/api/matching", tags=["matching"])


@router.post("/match", response_model=MatchListResponse)
async def match(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    model_service: ModelService = Depends(get_model_service),
    _=Depends(require_feature("matching")),
):
    model_service._feature = "matching"
    model_service.set_session(str(uuid.uuid4()))
    try:
        results = await matching_service.match(current_user.id, db, model_service)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return MatchListResponse(results=results)


@router.get("/results", response_model=MatchListResponse)
async def results(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await matching_service.get_results(current_user.id, db)
    return MatchListResponse(results=data)
