from typing import Any

from pydantic import BaseModel


class MatchResultResponse(BaseModel):
    id: int
    job_id: int
    job_title: str
    job_category: str
    score: float
    breakdown: dict[str, Any]
    reason: str
    is_beyond_cognition: bool

    model_config = {"from_attributes": True}


class MatchListResponse(BaseModel):
    results: list[MatchResultResponse]
