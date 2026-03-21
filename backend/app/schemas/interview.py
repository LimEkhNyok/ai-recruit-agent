from typing import Any

from pydantic import BaseModel


class InterviewStartRequest(BaseModel):
    job_id: int | None = None
    jd_context: dict[str, Any] | None = None


class InterviewStartResponse(BaseModel):
    interview_id: int
    job_title: str
    message: str


class InterviewChatRequest(BaseModel):
    interview_id: int
    message: str


class EvaluationResponse(BaseModel):
    interview_id: int
    job_title: str
    evaluation: dict[str, Any]

    model_config = {"from_attributes": True}


class InterviewEndRequest(BaseModel):
    interview_id: int


class InterviewHistoryItem(BaseModel):
    id: int
    job_id: int | None = None
    job_title: str
    status: str
    created_at: str
    evaluation: dict[str, Any] | None = None

    model_config = {"from_attributes": True}


class InterviewHistoryResponse(BaseModel):
    interviews: list[InterviewHistoryItem]
