import json
from datetime import datetime, timezone
from typing import AsyncGenerator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.interview import Interview
from app.models.job import JobPosition
from app.services.gemini_service import get_gemini_service
from app.prompts.interview import INTERVIEW_SYSTEM_PROMPT_TEMPLATE, EVALUATION_PROMPT


def _build_system_prompt(job: JobPosition) -> str:
    requirements_str = ", ".join(job.requirements) if isinstance(job.requirements, list) else str(job.requirements)
    return INTERVIEW_SYSTEM_PROMPT_TEMPLATE.replace(
        "{job_title}", job.title
    ).replace(
        "{job_category}", job.category
    ).replace(
        "{job_description}", job.description
    ).replace(
        "{job_requirements}", requirements_str
    )


async def start_interview(user_id: int, job_id: int, db: AsyncSession) -> tuple[int, str, str]:
    """Create interview, return (interview_id, job_title, first_ai_message)."""
    result = await db.execute(select(JobPosition).where(JobPosition.id == job_id))
    job = result.scalar_one_or_none()
    if job is None:
        raise ValueError("Job position not found")

    gemini = get_gemini_service()
    system_prompt = _build_system_prompt(job)

    first_message = await gemini.chat(
        system_prompt=system_prompt,
        history=None,
        user_message="你好，我来参加面试。",
    )

    history = [
        {"role": "user", "parts": [{"text": "你好，我来参加面试。"}]},
        {"role": "model", "parts": [{"text": first_message}]},
    ]

    interview = Interview(
        user_id=user_id,
        job_id=job_id,
        status="in_progress",
        chat_history=history,
    )
    db.add(interview)
    await db.commit()
    await db.refresh(interview)

    return interview.id, job.title, first_message


async def chat_stream(
    interview_id: int, user_message: str, db: AsyncSession
) -> AsyncGenerator[str, None]:
    """Stream AI reply chunks via SSE, then persist the full reply to history."""
    result = await db.execute(select(Interview).where(Interview.id == interview_id))
    interview = result.scalar_one_or_none()
    if interview is None:
        raise ValueError("Interview not found")

    result = await db.execute(select(JobPosition).where(JobPosition.id == interview.job_id))
    job = result.scalar_one_or_none()

    gemini = get_gemini_service()
    system_prompt = _build_system_prompt(job)
    history: list[dict] = list(interview.chat_history) if interview.chat_history else []

    full_reply = ""
    async for chunk in gemini.chat_stream(
        system_prompt=system_prompt,
        history=history,
        user_message=user_message,
    ):
        full_reply += chunk
        yield chunk

    history.append({"role": "user", "parts": [{"text": user_message}]})
    history.append({"role": "model", "parts": [{"text": full_reply}]})
    interview.chat_history = history
    await db.commit()


async def end_interview(interview_id: int, db: AsyncSession) -> tuple[str, dict]:
    """Generate evaluation report, return (job_title, evaluation_dict)."""
    result = await db.execute(select(Interview).where(Interview.id == interview_id))
    interview = result.scalar_one_or_none()
    if interview is None:
        raise ValueError("Interview not found")

    result = await db.execute(select(JobPosition).where(JobPosition.id == interview.job_id))
    job = result.scalar_one_or_none()

    history: list[dict] = interview.chat_history or []
    dialogue_text = ""
    for msg in history:
        role = "候选人" if msg["role"] == "user" else "面试官"
        text = msg["parts"][0]["text"]
        dialogue_text += f"{role}: {text}\n\n"

    eval_prompt_content = EVALUATION_PROMPT.replace(
        "{job_title}", job.title
    ).replace(
        "{job_category}", job.category
    ).replace(
        "{chat_history}", dialogue_text
    )

    gemini = get_gemini_service()
    evaluation = await gemini.generate_json(
        system_prompt="你是一位专业的面试评估师。请严格按照要求的 JSON 格式输出评估报告。",
        content=eval_prompt_content,
    )

    interview.evaluation = evaluation
    interview.status = "completed"
    interview.completed_at = datetime.now(timezone.utc)
    await db.commit()

    return job.title, evaluation


async def get_history(user_id: int, db: AsyncSession) -> list[dict]:
    """Return the user's interview records."""
    result = await db.execute(
        select(Interview)
        .where(Interview.user_id == user_id)
        .order_by(Interview.created_at.desc())
    )
    interviews = result.scalars().all()
    if not interviews:
        return []

    job_ids = list({i.job_id for i in interviews})
    result = await db.execute(select(JobPosition).where(JobPosition.id.in_(job_ids)))
    job_map = {j.id: j for j in result.scalars().all()}

    return [
        {
            "id": iv.id,
            "job_id": iv.job_id,
            "job_title": job_map[iv.job_id].title if iv.job_id in job_map else "",
            "status": iv.status,
            "created_at": iv.created_at.isoformat() if iv.created_at else "",
            "evaluation": iv.evaluation,
        }
        for iv in interviews
    ]
