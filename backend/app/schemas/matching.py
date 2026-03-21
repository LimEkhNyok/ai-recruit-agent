from typing import Any

from pydantic import BaseModel, Field


class JDAnalyzeRequest(BaseModel):
    jd_text: str = Field(..., min_length=10, max_length=10000)


class JDAnalyzeResponse(BaseModel):
    title: str
    tech_stack: list[str]
    key_points: list[str]
    requirements: list[str]
    bonus: list[str]
    responsibilities: str


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
