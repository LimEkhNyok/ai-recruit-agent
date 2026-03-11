import json

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assessment import TalentProfile
from app.models.job import JobPosition
from app.models.matching import MatchResult
from app.services.model_service import ModelService
from app.services.vector_service import rank_by_similarity
from app.prompts.matching import MATCHING_PROMPT_TEMPLATE

TOP_N_CANDIDATES = 10


async def match(user_id: int, db: AsyncSession, model_service: ModelService) -> list[dict]:
    """Run the full matching pipeline and return sorted results."""
    # 1. Load latest profile
    result = await db.execute(
        select(TalentProfile)
        .where(TalentProfile.user_id == user_id)
        .order_by(TalentProfile.created_at.desc())
        .limit(1)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        raise ValueError("No talent profile found. Please complete an assessment first.")

    # 2. Load all jobs
    result = await db.execute(select(JobPosition))
    jobs = result.scalars().all()
    if not jobs:
        raise ValueError("No job positions in database. Please run seed_jobs.py first.")

    # 3. Vector similarity ranking
    candidates = [
        {"id": j.id, "title": j.title, "category": j.category,
         "description": j.description, "requirements": j.requirements,
         "personality_fit": j.personality_fit, "ability_requirements": j.ability_requirements,
         "interest_tags": j.interest_tags, "embedding": j.embedding}
        for j in jobs
    ]
    ranked = rank_by_similarity(profile.embedding, candidates, top_n=TOP_N_CANDIDATES)

    # 4. Build prompt for Gemini deep scoring
    profile_summary = json.dumps({
        "personality": profile.personality,
        "abilities": profile.abilities,
        "interests": profile.interests,
        "values": profile.values,
        "work_style": profile.work_style,
        "summary": profile.summary,
    }, ensure_ascii=False, indent=2)

    job_list_text = ""
    for r in ranked:
        job_list_text += json.dumps({
            "job_id": r["id"],
            "title": r["title"],
            "category": r["category"],
            "description": r["description"],
            "requirements": r["requirements"],
            "personality_fit": r["personality_fit"],
            "ability_requirements": r["ability_requirements"],
            "interest_tags": r["interest_tags"],
            "vector_similarity": round(r["similarity_score"], 4),
        }, ensure_ascii=False, indent=2) + "\n\n"

    prompt_content = MATCHING_PROMPT_TEMPLATE.replace(
        "{talent_profile}", profile_summary
    ).replace(
        "{job_list}", job_list_text
    )

    match_data = await model_service.generate_json(
        system_prompt="你是一位专业的人岗匹配分析师。请严格按照要求的 JSON 格式输出。",
        content=prompt_content,
    )

    # 5. Clear old results for this user, write new ones
    await db.execute(delete(MatchResult).where(MatchResult.user_id == user_id))

    matches_raw = match_data.get("matches", [])
    job_map = {j.id: j for j in jobs}
    output = []

    for m in matches_raw:
        job_id = m.get("job_id")
        job = job_map.get(job_id)
        if job is None:
            continue

        mr = MatchResult(
            user_id=user_id,
            profile_id=profile.id,
            job_id=job_id,
            score=m.get("overall_score", 0),
            breakdown=m.get("breakdown", {}),
            reason=m.get("reason", ""),
            is_beyond_cognition=bool(m.get("is_beyond_cognition", False)),
        )
        db.add(mr)
        output.append({
            "job_id": job_id,
            "job_title": job.title,
            "job_category": job.category,
            "score": mr.score,
            "breakdown": mr.breakdown,
            "reason": mr.reason,
            "is_beyond_cognition": mr.is_beyond_cognition,
        })

    await db.commit()

    # Fetch persisted results to get auto-generated ids
    result = await db.execute(
        select(MatchResult)
        .where(MatchResult.user_id == user_id)
        .order_by(MatchResult.score.desc())
    )
    saved = result.scalars().all()

    final = []
    for mr in saved:
        job = job_map.get(mr.job_id)
        final.append({
            "id": mr.id,
            "job_id": mr.job_id,
            "job_title": job.title if job else "",
            "job_category": job.category if job else "",
            "score": mr.score,
            "breakdown": mr.breakdown,
            "reason": mr.reason,
            "is_beyond_cognition": mr.is_beyond_cognition,
        })

    return final


async def get_results(user_id: int, db: AsyncSession) -> list[dict]:
    """Return the user's most recent match results."""
    result = await db.execute(
        select(MatchResult)
        .where(MatchResult.user_id == user_id)
        .order_by(MatchResult.score.desc())
    )
    matches = result.scalars().all()
    if not matches:
        return []

    job_ids = [m.job_id for m in matches]
    result = await db.execute(select(JobPosition).where(JobPosition.id.in_(job_ids)))
    job_map = {j.id: j for j in result.scalars().all()}

    return [
        {
            "id": m.id,
            "job_id": m.job_id,
            "job_title": job_map[m.job_id].title if m.job_id in job_map else "",
            "job_category": job_map[m.job_id].category if m.job_id in job_map else "",
            "score": m.score,
            "breakdown": m.breakdown,
            "reason": m.reason,
            "is_beyond_cognition": m.is_beyond_cognition,
        }
        for m in matches
    ]
