from typing import Any

from pydantic import BaseModel


class ModelConfigSaveRequest(BaseModel):
    mode: str = "platform"
    base_url: str | None = None
    model: str | None = None
    api_key: str | None = None


class ModelConfigResponse(BaseModel):
    mode: str
    base_url: str | None = None
    model: str | None = None
    api_key_masked: str | None = None
    supports_chat: bool = False
    supports_stream: bool = False
    supports_json: bool = False
    supports_embedding: bool = False
    last_test_status: str | None = None
    last_test_error: str | None = None

    model_config = {"from_attributes": True}


class ModelConfigTestRequest(BaseModel):
    base_url: str
    model: str
    api_key: str


class ModelConfigTestResponse(BaseModel):
    supports_chat: bool = False
    supports_stream: bool = False
    supports_json: bool = False
    supports_embedding: bool = False
    errors: dict[str, str] = {}


class FeatureAvailabilityResponse(BaseModel):
    assessment: bool = False
    matching: bool = False
    interview: bool = False
    career: bool = False
    resume: bool = False
    quiz: bool = False
