from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.matching import MatchResultResponse, MatchListResponse
from app.api.deps import get_db, get_current_user
from app.services import matching_service

router = APIRouter(prefix="/api/matching", tags=["matching"])


@router.post("/match", response_model=MatchListResponse)
async def match(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        results = await matching_service.match(current_user.id, db)
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
