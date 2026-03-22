import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from sqlalchemy import select, func as sa_func, and_, case, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.quiz import QuizRecord
from app.models.mastery import KnowledgeMastery
from app.models.interview import Interview
from app.models.matching import MatchResult
from app.models.assessment import Assessment
from app.models.career import CareerPlan
from app.models.resume import Resume
from app.models.achievement import UserAchievement

_achievements_data = None


def load_achievements() -> dict:
    global _achievements_data
    if _achievements_data is None:
        data_path = Path(__file__).resolve().parent.parent / "data" / "achievements.json"
        with open(data_path, "r", encoding="utf-8") as f:
            _achievements_data = json.load(f)
    return _achievements_data


def _flat_achievements(lang: str = "zh") -> list[dict]:
    data = load_achievements()
    result = []
    for cat in data["categories"]:
        cat_name = cat["name"] if lang == "zh" else cat.get("name_en", cat["name"])
        for ach in cat["achievements"]:
            item = {**ach, "category": cat["id"], "category_name": cat_name}
            if lang == "en":
                item["name"] = ach.get("name_en", ach["name"])
                item["description"] = ach.get("description_en", ach["description"])
            result.append(item)
    return result


async def _collect_stats(user_id: int, db: AsyncSession) -> dict:
    """Collect all statistics needed for achievement checking in bulk queries."""
    stats = {}

    # --- Quiz stats ---
    row = (await db.execute(
        select(sa_func.count().label("total"))
        .where(and_(QuizRecord.user_id == user_id, QuizRecord.is_skipped == False))
    )).first()
    stats["quiz_total"] = row[0] if row else 0

    # Hard correct per knowledge point (max across all KPs)
    hard_rows = (await db.execute(
        select(
            QuizRecord.knowledge_point,
            sa_func.sum(case((QuizRecord.is_correct == True, 1), else_=0)).label("hc"),
        )
        .where(and_(
            QuizRecord.user_id == user_id,
            QuizRecord.difficulty == "困难",
        ))
        .group_by(QuizRecord.knowledge_point)
    )).all()
    stats["quiz_hard_correct"] = max((r[1] or 0 for r in hard_rows), default=0)
    stats["quiz_hard_correct_count"] = sum(1 for r in hard_rows if (r[1] or 0) >= 10)

    # Coding questions correct
    row = (await db.execute(
        select(sa_func.count())
        .where(and_(
            QuizRecord.user_id == user_id,
            QuizRecord.question_type == "编程题",
            QuizRecord.is_correct == True,
        ))
    )).scalar()
    stats["quiz_coding_total"] = row or 0

    # Coding hard correct
    row = (await db.execute(
        select(sa_func.count())
        .where(and_(
            QuizRecord.user_id == user_id,
            QuizRecord.question_type == "编程题",
            QuizRecord.difficulty == "困难",
            QuizRecord.is_correct == True,
        ))
    )).scalar()
    stats["quiz_coding_hard"] = row or 0

    # Night owl: correct answers between 23:00-01:00
    row = (await db.execute(
        select(sa_func.count())
        .where(and_(
            QuizRecord.user_id == user_id,
            QuizRecord.is_correct == True,
            sa_func.hour(QuizRecord.created_at).in_([23, 0]),
        ))
    )).scalar()
    stats["quiz_night_owl"] = row or 0

    # Early bird: correct answers between 05:00-07:00
    row = (await db.execute(
        select(sa_func.count())
        .where(and_(
            QuizRecord.user_id == user_id,
            QuizRecord.is_correct == True,
            sa_func.hour(QuizRecord.created_at).in_([5, 6]),
        ))
    )).scalar()
    stats["quiz_early_bird"] = row or 0

    # Quiz distinct domains
    row = (await db.execute(
        select(sa_func.count(distinct(QuizRecord.topic)))
        .where(QuizRecord.user_id == user_id)
    )).scalar()
    stats["quiz_domains"] = row or 0

    # Quiz streak (consecutive correct, no skip)
    records = (await db.execute(
        select(QuizRecord.is_correct)
        .where(and_(QuizRecord.user_id == user_id, QuizRecord.is_skipped == False))
        .order_by(QuizRecord.created_at.desc())
        .limit(50)
    )).all()
    streak = 0
    for r in records:
        if r[0]:
            streak += 1
        else:
            break
    stats["quiz_streak"] = streak

    # Daily streak
    dates = (await db.execute(
        select(sa_func.date(QuizRecord.created_at).label("d"))
        .where(QuizRecord.user_id == user_id)
        .group_by(sa_func.date(QuizRecord.created_at))
        .order_by(sa_func.date(QuizRecord.created_at).desc())
    )).all()
    daily_streak = 0
    if dates:
        today = datetime.utcnow().date()
        expected = today
        for row in dates:
            d = row[0]
            if hasattr(d, 'date'):
                d = d.date()
            if d == expected:
                daily_streak += 1
                expected -= timedelta(days=1)
            elif d < expected:
                break
    stats["daily_streak"] = daily_streak

    # --- Mastery stats ---
    mastery_rows = (await db.execute(
        select(KnowledgeMastery.domain, KnowledgeMastery.knowledge_point, KnowledgeMastery.mastery_score)
        .where(KnowledgeMastery.user_id == user_id)
    )).all()

    mastered_count = sum(1 for r in mastery_rows if r[2] >= 100)
    mastery_40_count = sum(1 for r in mastery_rows if r[2] >= 40)
    mastery_70_count = sum(1 for r in mastery_rows if r[2] >= 70)
    stats["quiz_mastered"] = mastered_count
    stats["mastery_40"] = mastery_40_count
    stats["mastery_70"] = mastery_70_count

    # Domain-level mastered counts
    domain_mastered: dict[str, int] = {}
    for r in mastery_rows:
        if r[2] >= 100:
            domain_mastered[r[0]] = domain_mastered.get(r[0], 0) + 1
    stats["quiz_domain_mastered_max"] = max(domain_mastered.values()) if domain_mastered else 0
    stats["quiz_domain_mastered_5_count"] = sum(1 for v in domain_mastered.values() if v >= 5)
    stats["quiz_domain_mastered_8_count"] = sum(1 for v in domain_mastered.values() if v >= 8)

    # --- Interview stats ---
    interview_rows = (await db.execute(
        select(Interview.evaluation, Interview.jd_context)
        .where(and_(Interview.user_id == user_id, Interview.status == "completed"))
    )).all()

    stats["interview_total"] = len(interview_rows)
    stats["interview_jd"] = sum(1 for r in interview_rows if r[1] is not None)

    max_score = 0
    max_communication = 0
    max_professional = 0
    max_problem_solving = 0
    recommended_count = 0
    for row in interview_rows:
        ev = row[0]
        if not ev or not isinstance(ev, dict):
            continue
        overall = ev.get("overall_score", 0) or 0
        max_score = max(max_score, overall)
        if ev.get("recommended"):
            recommended_count += 1
        dims = ev.get("dimensions", ev)
        comm = dims.get("communication", {})
        if isinstance(comm, dict):
            max_communication = max(max_communication, comm.get("score", 0) or 0)
        prof = dims.get("professional_skill", {})
        if isinstance(prof, dict):
            max_professional = max(max_professional, prof.get("score", 0) or 0)
        ps = dims.get("problem_solving", {})
        if isinstance(ps, dict):
            max_problem_solving = max(max_problem_solving, ps.get("score", 0) or 0)

    stats["interview_score"] = max_score
    stats["interview_recommended"] = recommended_count
    stats["interview_communication"] = max_communication
    stats["interview_professional"] = max_professional
    stats["interview_problem_solving"] = max_problem_solving

    # --- Match stats ---
    match_rows = (await db.execute(
        select(MatchResult.score, MatchResult.job_id)
        .where(MatchResult.user_id == user_id)
    )).all()
    stats["match_total"] = len(match_rows)
    stats["match_score"] = max((r[0] for r in match_rows), default=0)
    stats["match_distinct"] = len(set(r[1] for r in match_rows))

    # --- Assessment ---
    row = (await db.execute(
        select(sa_func.count())
        .where(and_(Assessment.user_id == user_id, Assessment.status == "completed"))
    )).scalar()
    stats["assessment_complete"] = row or 0

    # --- Career Plan ---
    row = (await db.execute(
        select(sa_func.count()).where(CareerPlan.user_id == user_id)
    )).scalar()
    stats["career_plan"] = row or 0

    # --- Resume ---
    row = (await db.execute(
        select(sa_func.count()).where(and_(Resume.user_id == user_id, Resume.analysis.isnot(None)))
    )).scalar()
    stats["resume_upload"] = row or 0

    return stats


def _check_condition(condition: dict, stats: dict) -> bool:
    ctype = condition["type"]
    value = condition["value"]

    if ctype == "quiz_domain_mastered":
        return stats.get("quiz_domain_mastered_max", 0) >= value

    stat_value = stats.get(ctype, 0)
    return stat_value >= value


_COUNTER_STAT_KEYS = {
    "mastery_40": "mastery_40",
    "mastery_70": "mastery_70",
    "quiz_hard_correct": "quiz_hard_correct_count",
    "quiz_domain_mastered": None,  # resolved dynamically by value
}


def _get_counter_value(ctype: str, value: int, stats: dict) -> int:
    if ctype == "quiz_domain_mastered":
        if value >= 8:
            return stats.get("quiz_domain_mastered_8_count", 0)
        return stats.get("quiz_domain_mastered_5_count", 0)
    key = _COUNTER_STAT_KEYS.get(ctype, ctype)
    return stats.get(key, 0)


def _get_progress(condition: dict, stats: dict, is_counter: bool) -> tuple[Optional[dict], Optional[int]]:
    ctype = condition["type"]
    value = condition["value"]

    if is_counter:
        counter_value = _get_counter_value(ctype, value, stats)
        return None, counter_value

    if ctype == "quiz_domain_mastered":
        current = stats.get("quiz_domain_mastered_max", 0)
    else:
        current = stats.get(ctype, 0)

    return {"current": min(current, value), "target": value}, None


async def check_achievements(user_id: int, db: AsyncSession, lang: str = "zh") -> list[dict]:
    all_achievements = _flat_achievements(lang)
    stats = await _collect_stats(user_id, db)

    # Get already unlocked
    unlocked_rows = (await db.execute(
        select(UserAchievement.achievement_id)
        .where(UserAchievement.user_id == user_id)
    )).scalars().all()
    unlocked_ids = set(unlocked_rows)

    newly_unlocked = []
    for ach in all_achievements:
        if ach["id"] in unlocked_ids:
            continue
        is_counter = ach.get("counter", False)
        if _check_condition(ach["condition"], stats):
            record = UserAchievement(
                user_id=user_id,
                achievement_id=ach["id"],
            )
            db.add(record)
            newly_unlocked.append({
                "id": ach["id"],
                "name": ach["name"],
                "icon": ach["icon"],
                "rarity": ach["rarity"],
            })

    if newly_unlocked:
        await db.commit()

    return newly_unlocked


async def get_achievements_with_progress(
    user_id: int, db: AsyncSession, lang: str = "zh"
) -> dict:
    all_achievements = _flat_achievements(lang)
    stats = await _collect_stats(user_id, db)

    # Get unlocked records
    unlocked_rows = (await db.execute(
        select(UserAchievement.achievement_id, UserAchievement.unlocked_at)
        .where(UserAchievement.user_id == user_id)
    )).all()
    unlocked_map = {r[0]: r[1] for r in unlocked_rows}

    items = []
    for ach in all_achievements:
        is_unlocked = ach["id"] in unlocked_map
        is_counter = ach.get("counter", False)
        progress = None
        counter_value = None

        if is_unlocked:
            if is_counter:
                _, counter_value = _get_progress(ach["condition"], stats, True)
        else:
            progress_data, counter_val = _get_progress(ach["condition"], stats, is_counter)
            if is_counter:
                counter_value = counter_val
            else:
                progress = progress_data

        items.append({
            "id": ach["id"],
            "name": ach["name"],
            "description": ach["description"],
            "icon": ach["icon"],
            "rarity": ach["rarity"],
            "category": ach["category_name"],
            "unlocked": is_unlocked,
            "unlocked_at": unlocked_map.get(ach["id"]),
            "progress": progress,
            "counter_value": counter_value,
        })

    return {
        "total": len(items),
        "unlocked": len(unlocked_map),
        "achievements": items,
    }
