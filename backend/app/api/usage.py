from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.api.deps import get_db, get_current_user
from app.services import usage_service

router = APIRouter(prefix="/api/usage", tags=["usage"])


@router.get("/stats")
async def stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await usage_service.get_user_stats(current_user.id, db)


@router.get("/recent")
async def recent(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=20, le=100),
):
    return await usage_service.get_user_recent(current_user.id, db, limit)
