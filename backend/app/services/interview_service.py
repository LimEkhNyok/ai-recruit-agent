import json
from datetime import datetime, timezone
from typing import AsyncGenerator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.interview import Interview
from app.models.job import JobPosition
from app.services.model_service import ModelService
from app.prompts.interview import get_interview_prompt, get_evaluation_prompt
from app.utils.job_translation import translate_title, translate_category


def _build_system_prompt(job: JobPosition, language: str = "zh") -> str:
    requirements_str = ", ".join(job.requirements) if isinstance(job.requirements, list) else str(job.requirements)
    return get_interview_prompt(language).replace(
        "{job_title}", job.title
    ).replace(
        "{job_category}", job.category
    ).replace(
        "{job_description}", job.description
    ).replace(
        "{job_requirements}", requirements_str
    )


async def start_interview(user_id: int, job_id: int, db: AsyncSession, model_service: ModelService) -> tuple[int, str, str]:
    """Create interview, return (interview_id, job_title, first_ai_message)."""
    result = await db.execute(select(JobPosition).where(JobPosition.id == job_id))
    job = result.scalar_one_or_none()
    if job is None:
        raise ValueError("Job position not found")

    lang = model_service.language
    system_prompt = _build_system_prompt(job, lang)

    start_msg = (
        "Hello, I'm here for the interview."
        if lang == "en"
        else "你好，我来参加面试。"
    )
    first_message = await model_service.chat(
        system_prompt=system_prompt,
        history=None,
        user_message=start_msg,
    )

    history = [
        {"role": "user", "parts": [{"text": start_msg}]},
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

    return interview.id, translate_title(job.title, lang), first_message


async def chat_stream(
    interview_id: int, user_message: str, db: AsyncSession, model_service: ModelService
) -> AsyncGenerator[str, None]:
    """Stream AI reply chunks via SSE, then persist the full reply to history."""
    result = await db.execute(select(Interview).where(Interview.id == interview_id))
    interview = result.scalar_one_or_none()
    if interview is None:
        raise ValueError("Interview not found")

    result = await db.execute(select(JobPosition).where(JobPosition.id == interview.job_id))
    job = result.scalar_one_or_none()

    lang = model_service.language
    system_prompt = _build_system_prompt(job, lang)
    history: list[dict] = list(interview.chat_history) if interview.chat_history else []

    full_reply = ""
    async for chunk in model_service.chat_stream(
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


async def end_interview(interview_id: int, db: AsyncSession, model_service: ModelService) -> tuple[str, dict]:
    """Generate evaluation report, return (job_title, evaluation_dict)."""
    result = await db.execute(select(Interview).where(Interview.id == interview_id))
    interview = result.scalar_one_or_none()
    if interview is None:
        raise ValueError("Interview not found")

    result = await db.execute(select(JobPosition).where(JobPosition.id == interview.job_id))
    job = result.scalar_one_or_none()

    lang = model_service.language
    history: list[dict] = interview.chat_history or []
    dialogue_text = ""
    for msg in history:
        if lang == "en":
            role = "Candidate" if msg["role"] == "user" else "Interviewer"
        else:
            role = "候选人" if msg["role"] == "user" else "面试官"
        text = msg["parts"][0]["text"]
        dialogue_text += f"{role}: {text}\n\n"

    eval_prompt_content = get_evaluation_prompt(lang).replace(
        "{job_title}", job.title
    ).replace(
        "{job_category}", job.category
    ).replace(
        "{chat_history}", dialogue_text
    )

    eval_system_prompt = (
        "You are a professional interview evaluator. Please strictly output the evaluation report in the required JSON format."
        if lang == "en"
        else "你是一位专业的面试评估师。请严格按照要求的 JSON 格式输出评估报告。"
    )
    evaluation = await model_service.generate_json(
        system_prompt=eval_system_prompt,
        content=eval_prompt_content,
    )

    interview.evaluation = evaluation
    interview.status = "completed"
    interview.completed_at = datetime.now(timezone.utc)
    await db.commit()

    return translate_title(job.title, lang), evaluation


async def get_history(user_id: int, db: AsyncSession, language: str = "zh") -> list[dict]:
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
            "job_title": translate_title(job_map[iv.job_id].title, language) if iv.job_id in job_map else "",
            "status": iv.status,
            "created_at": iv.created_at.isoformat() if iv.created_at else "",
            "evaluation": iv.evaluation,
        }
        for iv in interviews
    ]
