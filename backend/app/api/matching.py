import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.model_service import ModelService
from app.schemas.matching import MatchResultResponse, MatchListResponse, JDAnalyzeRequest, JDAnalyzeResponse
from app.api.deps import get_db, get_current_user, get_model_service, require_feature, require_billing
from app.services import matching_service
from app.prompts.jd_analysis import get_jd_analysis_prompt

router = APIRouter(prefix="/api/matching", tags=["matching"])


@router.post("/match", response_model=MatchListResponse)
async def match(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    model_service: ModelService = Depends(get_model_service),
    _=Depends(require_feature("matching")),
    __=Depends(require_billing("matching")),
):
    model_service._feature = "matching"
    model_service.set_session(str(uuid.uuid4()))
    try:
        results = await matching_service.match(current_user.id, db, model_service)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return MatchListResponse(results=results)


@router.post("/analyze-jd", response_model=JDAnalyzeResponse)
async def analyze_jd(
    req: JDAnalyzeRequest,
    current_user: User = Depends(get_current_user),
    model_service: ModelService = Depends(get_model_service),
    _=Depends(require_feature("matching")),
    __=Depends(require_billing("matching")),
):
    model_service._feature = "matching"
    model_service.set_session(str(uuid.uuid4()))
    try:
        prompt = get_jd_analysis_prompt(model_service.language)
        result = await model_service.generate_json(prompt, req.jd_text)
        return JDAnalyzeResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/results", response_model=MatchListResponse)
async def results(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    model_service: ModelService = Depends(get_model_service),
):
    data = await matching_service.get_results(current_user.id, db, language=model_service.language)
    return MatchListResponse(results=data)
