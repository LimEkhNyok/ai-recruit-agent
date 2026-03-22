from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.weakness_profile import UserWeaknessProfile
from app.models.interview import Interview


async def add_weakness(
    user_id: int,
    knowledge_point: str,
    source: str,
    source_id: int | None,
    db: AsyncSession,
) -> None:
    """Add a weak knowledge point if not already present as weak."""
    result = await db.execute(
        select(UserWeaknessProfile).where(
            and_(
                UserWeaknessProfile.user_id == user_id,
                UserWeaknessProfile.knowledge_point == knowledge_point,
                UserWeaknessProfile.status == "weak",
            )
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return

    record = UserWeaknessProfile(
        user_id=user_id,
        knowledge_point=knowledge_point,
        source=source,
        source_id=source_id,
        status="weak",
        consecutive_correct=0,
    )
    db.add(record)


async def add_weaknesses_from_interview(
    user_id: int, interview_id: int, db: AsyncSession
) -> None:
    """Extract missing_knowledge from interview reviews and add to weakness profile."""
    result = await db.execute(select(Interview).where(Interview.id == interview_id))
    interview = result.scalar_one_or_none()
    if not interview or not interview.chat_history:
        return

    for msg in interview.chat_history:
        if msg.get("role") != "user":
            continue
        review = msg.get("review")
        if not review:
            continue
        for kp in review.get("missing_knowledge", []):
            if kp and kp.strip():
                await add_weakness(user_id, kp.strip(), "interview", interview_id, db)


async def update_on_quiz_result(
    user_id: int, knowledge_point: str, is_correct: bool, db: AsyncSession
) -> None:
    """Update weakness profile after a quiz answer."""
    result = await db.execute(
        select(UserWeaknessProfile).where(
            and_(
                UserWeaknessProfile.user_id == user_id,
                UserWeaknessProfile.knowledge_point == knowledge_point,
            )
        )
    )
    record = result.scalar_one_or_none()

    if is_correct:
        if record and record.status == "weak":
            record.consecutive_correct += 1
            if record.consecutive_correct >= 2:
                record.status = "mastered"
    else:
        if record:
            record.consecutive_correct = 0
            record.status = "weak"
        else:
            wp = UserWeaknessProfile(
                user_id=user_id,
                knowledge_point=knowledge_point,
                source="quiz",
                source_id=None,
                status="weak",
                consecutive_correct=0,
            )
            db.add(wp)


async def get_user_weaknesses(user_id: int, db: AsyncSession) -> list[dict]:
    """Return all weakness records for the user."""
    result = await db.execute(
        select(UserWeaknessProfile)
        .where(UserWeaknessProfile.user_id == user_id)
        .order_by(UserWeaknessProfile.created_at.desc())
    )
    records = result.scalars().all()
    return [
        {
            "id": r.id,
            "knowledge_point": r.knowledge_point,
            "source": r.source,
            "status": r.status,
            "consecutive_correct": r.consecutive_correct,
            "created_at": r.created_at.isoformat() if r.created_at else "",
        }
        for r in records
    ]
