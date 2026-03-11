from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.billing import (
    WalletResponse,
    RechargeRequest,
    RechargeResponse,
    SubscribeRequest,
    SubscribeResponse,
    BillingRecordsResponse,
)
from app.api.deps import get_db, get_current_user
from app.services.billing_service import (
    get_wallet_info,
    recharge,
    subscribe,
    get_billing_records,
)
from app.config import RECHARGE_TIERS, SUBSCRIPTION_PLANS, FEATURE_CREDITS_COST

router = APIRouter(prefix="/api/billing", tags=["billing"])


@router.get("/wallet", response_model=WalletResponse)
async def wallet(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    info = await get_wallet_info(current_user.id, db)
    return WalletResponse(**info)


@router.post("/recharge", response_model=RechargeResponse)
async def do_recharge(
    req: RechargeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await recharge(current_user.id, req.tier, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return RechargeResponse(**result)


@router.post("/subscribe", response_model=SubscribeResponse)
async def do_subscribe(
    req: SubscribeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await subscribe(current_user.id, req.plan_type, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return SubscribeResponse(**result)


@router.get("/records", response_model=BillingRecordsResponse)
async def records(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items = await get_billing_records(current_user.id, db)
    return BillingRecordsResponse(records=items)


@router.get("/pricing")
async def pricing():
    return {
        "credits_per_yuan": 100,
        "recharge_tiers": RECHARGE_TIERS,
        "subscription_plans": SUBSCRIPTION_PLANS,
        "feature_costs": {k: {"credits": v, "yuan": v / 100} for k, v in FEATURE_CREDITS_COST.items()},
    }
