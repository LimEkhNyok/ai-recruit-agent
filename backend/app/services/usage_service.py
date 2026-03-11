from sqlalchemy import select, func as sa_func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.usage import UsageRecord


async def log_usage(
    user_id: int,
    mode: str,
    feature: str,
    base_url: str | None,
    model: str | None,
    request_tokens: int | None,
    response_tokens: int | None,
    total_tokens: int | None,
    latency_ms: int | None,
    success: bool,
    error_message: str | None = None,
    session_id: str | None = None,
):
    """Write a usage record. Uses its own session to avoid interfering with caller's transaction."""
    async with AsyncSessionLocal() as db:
        record = UsageRecord(
            user_id=user_id,
            session_id=session_id,
            mode=mode,
            feature=feature,
            base_url=base_url,
            model=model,
            request_tokens=request_tokens,
            response_tokens=response_tokens,
            total_tokens=total_tokens,
            latency_ms=latency_ms,
            success=success,
            error_message=error_message,
        )
        db.add(record)
        await db.commit()


async def get_user_stats(user_id: int, db: AsyncSession) -> dict:
    tokens_result = await db.execute(
        select(
            sa_func.coalesce(sa_func.sum(UsageRecord.request_tokens), 0),
            sa_func.coalesce(sa_func.sum(UsageRecord.response_tokens), 0),
            sa_func.coalesce(sa_func.sum(UsageRecord.total_tokens), 0),
        ).where(UsageRecord.user_id == user_id)
    )
    row = tokens_result.one()
    req_tokens, resp_tokens, tot_tokens = int(row[0]), int(row[1]), int(row[2])
    thinking_tokens = max(tot_tokens - req_tokens - resp_tokens, 0)

    session_count_result = await db.execute(
        select(sa_func.count(sa_func.distinct(UsageRecord.session_id)))
        .where(and_(UsageRecord.user_id == user_id, UsageRecord.session_id.isnot(None)))
    )
    no_session_result = await db.execute(
        select(sa_func.count())
        .select_from(UsageRecord)
        .where(and_(UsageRecord.user_id == user_id, UsageRecord.session_id.is_(None)))
    )
    total_sessions = (session_count_result.scalar() or 0) + (no_session_result.scalar() or 0)

    success_session_result = await db.execute(
        select(sa_func.count(sa_func.distinct(UsageRecord.session_id)))
        .where(and_(
            UsageRecord.user_id == user_id,
            UsageRecord.session_id.isnot(None),
            UsageRecord.success == True,
        ))
    )
    success_no_session = await db.execute(
        select(sa_func.count())
        .select_from(UsageRecord)
        .where(and_(
            UsageRecord.user_id == user_id,
            UsageRecord.session_id.is_(None),
            UsageRecord.success == True,
        ))
    )
    success_sessions = (success_session_result.scalar() or 0) + (success_no_session.scalar() or 0)

    feature_result = await db.execute(
        select(UsageRecord.feature, sa_func.count(sa_func.distinct(UsageRecord.session_id)))
        .where(and_(UsageRecord.user_id == user_id, UsageRecord.session_id.isnot(None)))
        .group_by(UsageRecord.feature)
    )
    by_feature = {r[0]: r[1] for r in feature_result.all()}
    no_sid_feature = await db.execute(
        select(UsageRecord.feature, sa_func.count())
        .where(and_(UsageRecord.user_id == user_id, UsageRecord.session_id.is_(None)))
        .group_by(UsageRecord.feature)
    )
    for r in no_sid_feature.all():
        by_feature[r[0]] = by_feature.get(r[0], 0) + r[1]

    return {
        "total_calls": total_sessions,
        "success_calls": success_sessions,
        "request_tokens": req_tokens,
        "thinking_tokens": thinking_tokens,
        "response_tokens": resp_tokens,
        "total_tokens": tot_tokens,
        "by_feature": by_feature,
    }


async def get_user_recent(user_id: int, db: AsyncSession, limit: int = 50) -> list[dict]:
    has_session = select(
        UsageRecord.session_id,
        UsageRecord.feature,
        UsageRecord.mode,
        sa_func.coalesce(sa_func.sum(UsageRecord.request_tokens), 0).label("request_tokens"),
        sa_func.coalesce(sa_func.sum(UsageRecord.response_tokens), 0).label("response_tokens"),
        sa_func.coalesce(sa_func.sum(UsageRecord.total_tokens), 0).label("total_tokens"),
        sa_func.sum(UsageRecord.latency_ms).label("latency_ms"),
        sa_func.min(case((UsageRecord.success == False, 0), else_=1)).label("success"),
        sa_func.max(UsageRecord.created_at).label("created_at"),
    ).where(
        and_(UsageRecord.user_id == user_id, UsageRecord.session_id.isnot(None))
    ).group_by(
        UsageRecord.session_id, UsageRecord.feature, UsageRecord.mode
    ).subquery()

    result = await db.execute(
        select(
            has_session.c.session_id,
            has_session.c.feature,
            has_session.c.mode,
            has_session.c.request_tokens,
            has_session.c.response_tokens,
            has_session.c.total_tokens,
            has_session.c.latency_ms,
            has_session.c.success,
            has_session.c.created_at,
        ).order_by(has_session.c.created_at.desc()).limit(limit)
    )
    rows = result.all()

    records = []
    for r in rows:
        tot = int(r.total_tokens)
        req = int(r.request_tokens)
        resp = int(r.response_tokens)
        records.append({
            "id": r.session_id,
            "feature": r.feature,
            "mode": r.mode,
            "request_tokens": req,
            "thinking_tokens": max(tot - req - resp, 0),
            "response_tokens": resp,
            "total_tokens": tot,
            "latency_ms": int(r.latency_ms) if r.latency_ms else None,
            "success": bool(r.success),
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    no_session = await db.execute(
        select(UsageRecord)
        .where(and_(UsageRecord.user_id == user_id, UsageRecord.session_id.is_(None)))
        .order_by(UsageRecord.created_at.desc())
        .limit(limit)
    )
    for r in no_session.scalars().all():
        tot = r.total_tokens or 0
        req = r.request_tokens or 0
        resp = r.response_tokens or 0
        records.append({
            "id": r.id,
            "feature": r.feature,
            "mode": r.mode,
            "request_tokens": req,
            "thinking_tokens": max(tot - req - resp, 0),
            "response_tokens": resp,
            "total_tokens": tot,
            "latency_ms": r.latency_ms,
            "success": r.success,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    records.sort(key=lambda x: x["created_at"] or "", reverse=True)
    return records[:limit]
