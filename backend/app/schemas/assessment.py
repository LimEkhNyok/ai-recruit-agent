from typing import Any

from pydantic import BaseModel


class StartResponse(BaseModel):
    assessment_id: int
    message: str


class ChatRequest(BaseModel):
    assessment_id: int
    message: str


class ChatResponse(BaseModel):
    reply: str
    is_complete: bool


class FinishRequest(BaseModel):
    assessment_id: int


class ProfileResponse(BaseModel):
    id: int
    user_id: int
    assessment_id: int
    personality: dict[str, Any]
    abilities: dict[str, Any]
    interests: dict[str, Any]
    values: dict[str, Any]
    work_style: dict[str, Any]
    summary: str

    model_config = {"from_attributes": True}
