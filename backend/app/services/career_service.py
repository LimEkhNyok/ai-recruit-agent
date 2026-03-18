import json

from sqlalchemy import select, func as sa_func, case, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assessment import TalentProfile
from app.models.matching import MatchResult
from app.models.job import JobPosition
from app.models.career import CareerPlan
from app.models.quiz import QuizRecord
from app.services.model_service import ModelService
from app.prompts.career import CAREER_PLAN_PROMPT

MASTERY_THRESHOLD = 2


async def generate_plan(user_id: int, db: AsyncSession, model_service: ModelService) -> CareerPlan:
    """Generate a career plan from the latest profile + top-5 match results."""
    # 1. Latest profile
    result = await db.execute(
        select(TalentProfile)
        .where(TalentProfile.user_id == user_id)
        .order_by(TalentProfile.created_at.desc())
        .limit(1)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        raise ValueError("尚未找到人才画像，请先完成职业测评。")

    # 2. Top-5 match results
    result = await db.execute(
        select(MatchResult)
        .where(MatchResult.user_id == user_id)
        .order_by(MatchResult.score.desc())
        .limit(5)
    )
    matches = result.scalars().all()
    if not matches:
        raise ValueError("No match results found. Please run matching first.")

    job_ids = [m.job_id for m in matches]
    result = await db.execute(select(JobPosition).where(JobPosition.id.in_(job_ids)))
    job_map = {j.id: j for j in result.scalars().all()}

    # 3. Build prompt
    profile_summary = json.dumps({
        "personality": profile.personality,
        "abilities": profile.abilities,
        "interests": profile.interests,
        "values": profile.values,
        "work_style": profile.work_style,
        "summary": profile.summary,
    }, ensure_ascii=False, indent=2)

    top_matches_text = ""
    for m in matches:
        job = job_map.get(m.job_id)
        if not job:
            continue
        top_matches_text += json.dumps({
            "job_title": job.title,
            "category": job.category,
            "score": m.score,
            "reason": m.reason,
            "is_beyond_cognition": m.is_beyond_cognition,
        }, ensure_ascii=False, indent=2) + "\n\n"

    # 3b. Query quiz stats
    correct_expr = sa_func.sum(case((QuizRecord.is_correct == True, 1), else_=0))
    result = await db.execute(
        select(
            QuizRecord.topic,
            QuizRecord.knowledge_point,
            correct_expr.label("correct_count"),
            sa_func.count().label("total"),
        )
        .where(QuizRecord.user_id == user_id)
        .group_by(QuizRecord.topic, QuizRecord.knowledge_point)
    )
    quiz_rows = result.all()

    total_questions = await db.execute(
        select(sa_func.count()).select_from(QuizRecord).where(QuizRecord.user_id == user_id)
    )
    total_q = total_questions.scalar() or 0

    total_correct = await db.execute(
        select(sa_func.count()).select_from(QuizRecord)
        .where(and_(QuizRecord.user_id == user_id, QuizRecord.is_correct == True))
    )
    total_c = total_correct.scalar() or 0

    mastered_kps = []
    weak_kps = []
    for row in quiz_rows:
        topic_name, kp, cc, _ = row
        label = f"{topic_name}-{kp}"
        if (cc or 0) >= MASTERY_THRESHOLD:
            mastered_kps.append(label)
        else:
            weak_kps.append(label)

    if total_q > 0:
        accuracy = round(total_c / total_q * 100, 1)
        quiz_stats_text = f"总做题数：{total_q}，正确率：{accuracy}%\n"
        if mastered_kps:
            quiz_stats_text += f"已掌握的知识点：{', '.join(mastered_kps)}\n"
        if weak_kps:
            quiz_stats_text += f"薄弱知识点（需重点提升）：{', '.join(weak_kps)}\n"
    else:
        quiz_stats_text = "用户暂未进行刷题练习，无刷题数据。"

    prompt_content = CAREER_PLAN_PROMPT.replace(
        "{talent_profile}", profile_summary
    ).replace(
        "{top_matches}", top_matches_text
    ).replace(
        "{quiz_stats}", quiz_stats_text
    )

    # 4. Call Gemini
    plan_data = await model_service.generate_json(
        system_prompt="你是一位资深职业规划师。请严格按照要求的 JSON 格式输出职业规划。",
        content=prompt_content,
    )

    resume_advice = plan_data.pop("resume_advice", "")

    # 5. Persist
    plan = CareerPlan(
        user_id=user_id,
        profile_id=profile.id,
        plan_content=plan_data,
        resume_advice=resume_advice,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)

    return plan


async def get_latest_plan(user_id: int, db: AsyncSession) -> CareerPlan | None:
    """Return the user's most recent career plan."""
    result = await db.execute(
        select(CareerPlan)
        .where(CareerPlan.user_id == user_id)
        .order_by(CareerPlan.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()
