from typing import Any

from pydantic import BaseModel


class CareerPlanResponse(BaseModel):
    id: int
    user_id: int
    profile_id: int
    plan_content: dict[str, Any]
    resume_advice: str

    model_config = {"from_attributes": True}
