from datetime import datetime, date, timedelta

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.billing import UserWallet, Subscription, RechargeRecord
from app.config import (
    FREE_QUIZ_ROUNDS,
    FEATURE_CREDITS_COST,
    RECHARGE_TIERS,
    SUBSCRIPTION_PLANS,
)


async def get_or_create_wallet(user_id: int, db: AsyncSession) -> UserWallet:
    result = await db.execute(
        select(UserWallet).where(UserWallet.user_id == user_id)
    )
    wallet = result.scalar_one_or_none()
    if wallet is None:
        wallet = UserWallet(
            user_id=user_id,
            balance=0,
            free_quiz_remaining=FREE_QUIZ_ROUNDS,
        )
        db.add(wallet)
        await db.flush()
    return wallet


async def get_active_subscription(user_id: int, db: AsyncSession) -> Subscription | None:
    now = datetime.utcnow()
    result = await db.execute(
        select(Subscription).where(and_(
            Subscription.user_id == user_id,
            Subscription.status == "active",
            Subscription.expires_at > now,
        )).order_by(Subscription.expires_at.desc()).limit(1)
    )
    return result.scalar_one_or_none()


def _maybe_reset_daily_quiz(wallet: UserWallet) -> None:
    """Reset free quiz counter if the last reset was before today."""
    today = date.today()
    if wallet.free_quiz_reset_date != today:
        wallet.free_quiz_remaining = FREE_QUIZ_ROUNDS
        wallet.free_quiz_reset_date = today


async def get_wallet_info(user_id: int, db: AsyncSession) -> dict:
    wallet = await get_or_create_wallet(user_id, db)
    _maybe_reset_daily_quiz(wallet)
    sub = await get_active_subscription(user_id, db)
    await db.commit()

    return {
        "balance": wallet.balance,
        "free_quiz_remaining": wallet.free_quiz_remaining,
        "subscription_active": sub is not None,
        "subscription_plan": sub.plan_type if sub else None,
        "subscription_expires_at": sub.expires_at.isoformat() if sub else None,
    }


async def check_access(user_id: int, feature: str, mode: str, db: AsyncSession) -> tuple[bool, str]:
    """Check access and deduct fixed credits upfront. Returns (allowed, reason)."""
    # 暂不收费，所有模式直接放行
    return True, "free"

    # --- 以下为收费逻辑，后续恢复时取消注释 ---
    # if mode == "byok":
    #     return True, "ok"
    #
    # sub = await get_active_subscription(user_id, db)
    # if sub is not None:
    #     return True, "subscription"
    #
    # wallet = await get_or_create_wallet(user_id, db)
    # _maybe_reset_daily_quiz(wallet)
    #
    # if feature == "quiz" and wallet.free_quiz_remaining > 0:
    #     wallet.free_quiz_remaining -= 1
    #     await db.commit()
    #     return True, "free_quiz"
    #
    # cost = FEATURE_CREDITS_COST.get(feature, 0)
    # if wallet.balance >= cost and cost > 0:
    #     wallet.balance -= cost
    #     await db.commit()
    #     return True, "balance"
    #
    # if feature == "quiz":
    #     return False, "今日免费刷题额度已用尽，请充值或订阅后继续刷题"
    #
    # return False, f"积分不足（需要 {cost} 积分），请充值或订阅"


async def recharge(user_id: int, tier: str, db: AsyncSession) -> dict:
    if tier not in RECHARGE_TIERS:
        raise ValueError(f"无效的充值档位: {tier}")

    tier_info = RECHARGE_TIERS[tier]
    wallet = await get_or_create_wallet(user_id, db)
    wallet.balance += tier_info["credits"]

    record = RechargeRecord(
        user_id=user_id,
        amount_yuan=tier_info["amount_yuan"],
        credits_gained=tier_info["credits"],
    )
    db.add(record)
    await db.commit()
    await db.refresh(wallet)

    return {
        "balance": wallet.balance,
        "credits_gained": tier_info["credits"],
        "amount_yuan": tier_info["amount_yuan"],
    }


async def subscribe(user_id: int, plan_type: str, db: AsyncSession) -> dict:
    if plan_type not in SUBSCRIPTION_PLANS:
        raise ValueError(f"无效的订阅方案: {plan_type}")

    plan = SUBSCRIPTION_PLANS[plan_type]
    now = datetime.utcnow()
    expires = now + timedelta(days=plan["duration_days"])

    sub = Subscription(
        user_id=user_id,
        plan_type=plan_type,
        starts_at=now,
        expires_at=expires,
        status="active",
        amount_yuan=plan["amount_yuan"],
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)

    return {
        "plan_type": sub.plan_type,
        "starts_at": sub.starts_at.isoformat(),
        "expires_at": sub.expires_at.isoformat(),
    }


async def get_billing_records(user_id: int, db: AsyncSession, limit: int = 50) -> list[dict]:
    recharge_result = await db.execute(
        select(RechargeRecord)
        .where(RechargeRecord.user_id == user_id)
        .order_by(RechargeRecord.created_at.desc())
        .limit(limit)
    )
    sub_result = await db.execute(
        select(Subscription)
        .where(Subscription.user_id == user_id)
        .order_by(Subscription.created_at.desc())
        .limit(limit)
    )

    records = []
    for r in recharge_result.scalars().all():
        records.append({
            "id": r.id,
            "type": "recharge",
            "amount_yuan": float(r.amount_yuan),
            "credits": r.credits_gained,
            "description": f"充值 ¥{r.amount_yuan}，获得 {r.credits_gained} 积分",
            "created_at": r.created_at.isoformat(),
        })

    plan_labels = {"weekly": "周卡", "monthly": "月卡"}
    for s in sub_result.scalars().all():
        records.append({
            "id": s.id + 100000,
            "type": "subscription",
            "amount_yuan": float(s.amount_yuan),
            "credits": None,
            "description": f"订阅{plan_labels.get(s.plan_type, s.plan_type)} ¥{s.amount_yuan}",
            "created_at": s.created_at.isoformat(),
        })

    records.sort(key=lambda x: x["created_at"], reverse=True)
    return records[:limit]
