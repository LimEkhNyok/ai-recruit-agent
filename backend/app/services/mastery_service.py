from typing import Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mastery import KnowledgeMastery

DIFFICULTY_CAP = {"简单": 40, "中等": 70, "困难": 100}
FLOOR_THRESHOLDS = [70, 40]


async def get_or_create_mastery(
    user_id: int, domain: str, knowledge_point: str, db: AsyncSession
) -> KnowledgeMastery:
    result = await db.execute(
        select(KnowledgeMastery).where(
            and_(
                KnowledgeMastery.user_id == user_id,
                KnowledgeMastery.domain == domain,
                KnowledgeMastery.knowledge_point == knowledge_point,
            )
        )
    )
    mastery = result.scalar_one_or_none()
    if mastery is None:
        mastery = KnowledgeMastery(
            user_id=user_id,
            domain=domain,
            knowledge_point=knowledge_point,
            mastery_score=0,
            floor_level=0,
        )
        db.add(mastery)
        await db.flush()
    return mastery


async def update_mastery(
    user_id: int,
    domain: str,
    knowledge_point: str,
    difficulty: str,
    is_correct: bool,
    is_skipped: bool,
    db: AsyncSession,
) -> dict:
    mastery = await get_or_create_mastery(user_id, domain, knowledge_point, db)
    old_score = mastery.mastery_score
    milestone_reached: Optional[int] = None

    if is_skipped:
        return {
            "mastery_score": mastery.mastery_score,
            "mastery_delta": 0,
            "milestone_reached": None,
        }

    cap = DIFFICULTY_CAP.get(difficulty, 70)

    if is_correct:
        if mastery.mastery_score < cap:
            mastery.mastery_score = min(mastery.mastery_score + 10, cap)
        # else: delta will be 0 (at cap)
    else:
        new_score = mastery.mastery_score - 5
        mastery.mastery_score = max(new_score, mastery.floor_level)

    # Update floor_level if we crossed a threshold
    for threshold in FLOOR_THRESHOLDS:
        if mastery.mastery_score >= threshold and mastery.floor_level < threshold:
            mastery.floor_level = threshold

    # Detect milestone: first time reaching 40 or 70
    if mastery.mastery_score >= 40 and old_score < 40:
        milestone_reached = 40
    elif mastery.mastery_score >= 70 and old_score < 70:
        milestone_reached = 70

    delta = mastery.mastery_score - old_score

    return {
        "mastery_score": mastery.mastery_score,
        "mastery_delta": delta,
        "milestone_reached": milestone_reached,
    }


async def get_mastery(
    user_id: int, domain: str, knowledge_point: str, db: AsyncSession
) -> Optional[KnowledgeMastery]:
    result = await db.execute(
        select(KnowledgeMastery).where(
            and_(
                KnowledgeMastery.user_id == user_id,
                KnowledgeMastery.domain == domain,
                KnowledgeMastery.knowledge_point == knowledge_point,
            )
        )
    )
    return result.scalar_one_or_none()


async def get_domain_mastery(
    user_id: int, domain: str, db: AsyncSession
) -> list[KnowledgeMastery]:
    result = await db.execute(
        select(KnowledgeMastery).where(
            and_(
                KnowledgeMastery.user_id == user_id,
                KnowledgeMastery.domain == domain,
            )
        )
    )
    return list(result.scalars().all())
