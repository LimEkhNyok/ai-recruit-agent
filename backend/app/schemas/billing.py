from pydantic import BaseModel


class WalletResponse(BaseModel):
    balance: int = 0
    free_quiz_remaining: int = 3
    subscription_active: bool = False
    subscription_plan: str | None = None
    subscription_expires_at: str | None = None

    model_config = {"from_attributes": True}


class RechargeRequest(BaseModel):
    tier: str


class SubscribeRequest(BaseModel):
    plan_type: str


class RechargeResponse(BaseModel):
    balance: int
    credits_gained: int
    amount_yuan: float


class SubscribeResponse(BaseModel):
    plan_type: str
    starts_at: str
    expires_at: str


class BillingRecordItem(BaseModel):
    id: int
    type: str
    amount_yuan: float | None = None
    credits: int | None = None
    description: str
    created_at: str


class BillingRecordsResponse(BaseModel):
    records: list[BillingRecordItem]
