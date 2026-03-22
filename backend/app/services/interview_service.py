import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import AsyncGenerator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.interview import Interview
from app.models.job import JobPosition
from app.services.model_service import ModelService
from app.prompts.interview import (
    get_interview_prompt,
    get_evaluation_prompt,
    build_jd_interview_prompt,
    build_jd_evaluation_prompt,
    get_review_prompt,
)
from app.utils.job_translation import translate_title, translate_category

logger = logging.getLogger(__name__)

_review_tasks: dict[int, list[asyncio.Task]] = {}


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


async def start_interview(
    user_id: int,
    job_id: int | None,
    db: AsyncSession,
    model_service: ModelService,
    jd_context: dict | None = None,
) -> tuple[int, str, str]:
    """Create interview, return (interview_id, job_title, first_ai_message)."""
    lang = model_service.language

    if jd_context:
        system_prompt = build_jd_interview_prompt(jd_context, lang)
        job_title = jd_context.get("title", "JD Interview")
    else:
        result = await db.execute(select(JobPosition).where(JobPosition.id == job_id))
        job = result.scalar_one_or_none()
        if job is None:
            raise ValueError("Job position not found")
        system_prompt = _build_system_prompt(job, lang)
        job_title = translate_title(job.title, lang)

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
        jd_context=jd_context,
        status="in_progress",
        chat_history=history,
    )
    db.add(interview)
    await db.commit()
    await db.refresh(interview)

    return interview.id, job_title, first_message


def _get_job_info(interview: Interview) -> str:
    """Extract job info string for review prompt."""
    if interview.jd_context:
        jd = interview.jd_context
        return f"岗位: {jd.get('title', '')}, 技术栈: {', '.join(jd.get('tech_stack', []))}"
    return f"job_id: {interview.job_id}"


async def _review_last_answer(
    interview_id: int,
    user_msg_index: int,
    job_info: str,
    language: str,
    model_service: ModelService,
) -> None:
    """Background task: review a user's answer and write result to chat_history."""
    from app.database import AsyncSessionLocal

    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Interview).where(Interview.id == interview_id))
            interview = result.scalar_one_or_none()
            if not interview:
                return

            history = list(interview.chat_history) if interview.chat_history else []
            if user_msg_index >= len(history):
                return

            user_msg = history[user_msg_index]
            if user_msg.get("role") != "user" or user_msg.get("review"):
                return

            candidate_answer = user_msg["parts"][0]["text"]

            interviewer_question = ""
            if user_msg_index > 0 and history[user_msg_index - 1]["role"] == "model":
                interviewer_question = history[user_msg_index - 1]["parts"][0]["text"]

            context_start = max(0, user_msg_index - 4)
            context_msgs = history[context_start:user_msg_index]
            context_text = ""
            for m in context_msgs:
                role_label = "Candidate" if m["role"] == "user" else "Interviewer"
                context_text += f"{role_label}: {m['parts'][0]['text']}\n"

            prompt = get_review_prompt(language).replace(
                "{job_info}", job_info
            ).replace(
                "{interviewer_question}", interviewer_question
            ).replace(
                "{candidate_answer}", candidate_answer
            ).replace(
                "{context}", context_text or "N/A"
            )

            review_system = (
                "You are a professional interview coach. Output the review in JSON format."
                if language == "en"
                else "你是一位专业的面试辅导教练。请以 JSON 格式输出点评。"
            )

            review = await model_service.generate_json(
                system_prompt=review_system,
                content=prompt,
            )

            result = await db.execute(select(Interview).where(Interview.id == interview_id))
            interview = result.scalar_one_or_none()
            if not interview:
                return
            history = list(interview.chat_history)
            if user_msg_index < len(history):
                history[user_msg_index]["review"] = review
                interview.chat_history = history
                await db.commit()
    except Exception:
        logger.exception("Background review failed for interview %s msg %s", interview_id, user_msg_index)


async def chat_stream(
    interview_id: int, user_message: str, db: AsyncSession, model_service: ModelService
) -> AsyncGenerator[str, None]:
    """Stream AI reply chunks via SSE, then persist the full reply to history."""
    result = await db.execute(select(Interview).where(Interview.id == interview_id))
    interview = result.scalar_one_or_none()
    if interview is None:
        raise ValueError("Interview not found")

    lang = model_service.language

    if interview.jd_context:
        system_prompt = build_jd_interview_prompt(interview.jd_context, lang)
    else:
        result = await db.execute(select(JobPosition).where(JobPosition.id == interview.job_id))
        job = result.scalar_one_or_none()
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

    # Find the last unreviewed user message and start background review
    user_msg_index = len(history) - 2  # the user message we just appended
    if user_msg_index >= 0 and history[user_msg_index]["role"] == "user":
        job_info = _get_job_info(interview)
        task = asyncio.create_task(
            _review_last_answer(interview_id, user_msg_index, job_info, lang, model_service)
        )
        _review_tasks.setdefault(interview_id, []).append(task)


async def end_interview(interview_id: int, db: AsyncSession, model_service: ModelService) -> tuple[str, dict]:
    """Generate evaluation report, return (job_title, evaluation_dict)."""
    # Wait for all pending background review tasks
    pending_tasks = _review_tasks.pop(interview_id, [])
    if pending_tasks:
        await asyncio.gather(*pending_tasks, return_exceptions=True)

    result = await db.execute(select(Interview).where(Interview.id == interview_id))
    interview = result.scalar_one_or_none()
    if interview is None:
        raise ValueError("Interview not found")

    lang = model_service.language
    history: list[dict] = list(interview.chat_history) if interview.chat_history else []

    # Review ALL unreviewed user messages before generating evaluation
    unreviewed = [i for i, msg in enumerate(history) if msg.get("role") == "user" and not msg.get("review")]
    if unreviewed:
        job_info = _get_job_info(interview)
        for idx in unreviewed:
            await _review_last_answer(interview_id, idx, job_info, lang, model_service)
        await db.refresh(interview)
        history = list(interview.chat_history) if interview.chat_history else []

    dialogue_text = ""
    for msg in history:
        if lang == "en":
            role = "Candidate" if msg["role"] == "user" else "Interviewer"
        else:
            role = "候选人" if msg["role"] == "user" else "面试官"
        text = msg["parts"][0]["text"]
        dialogue_text += f"{role}: {text}\n\n"

    if interview.jd_context:
        job_title = interview.jd_context.get("title", "JD Interview")
        eval_prompt_content = build_jd_evaluation_prompt(interview.jd_context, dialogue_text, lang)
    else:
        result = await db.execute(select(JobPosition).where(JobPosition.id == interview.job_id))
        job = result.scalar_one_or_none()
        job_title = translate_title(job.title, lang)
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

    # Extract weaknesses from reviews into user weakness profile
    try:
        from app.services.weakness_service import add_weaknesses_from_interview
        await add_weaknesses_from_interview(interview.user_id, interview_id, db)
        await db.commit()
    except Exception:
        logger.exception("Failed to extract weaknesses from interview %s", interview_id)

    return job_title, evaluation


async def delete_interview(interview_id: int, user_id: int, db: AsyncSession) -> None:
    """Delete an interview record owned by the user."""
    result = await db.execute(
        select(Interview).where(Interview.id == interview_id, Interview.user_id == user_id)
    )
    interview = result.scalar_one_or_none()
    if interview is None:
        raise ValueError("Interview not found or access denied")
    await db.delete(interview)
    await db.commit()


async def get_interview_detail(interview_id: int, user_id: int, db: AsyncSession) -> dict:
    """Return full interview data including chat_history with reviews."""
    result = await db.execute(
        select(Interview).where(Interview.id == interview_id, Interview.user_id == user_id)
    )
    interview = result.scalar_one_or_none()
    if interview is None:
        raise ValueError("Interview not found or access denied")

    job_title = ""
    if interview.jd_context:
        job_title = interview.jd_context.get("title", "JD Interview")
    elif interview.job_id:
        job_result = await db.execute(select(JobPosition).where(JobPosition.id == interview.job_id))
        job = job_result.scalar_one_or_none()
        if job:
            job_title = job.title

    return {
        "id": interview.id,
        "job_id": interview.job_id,
        "job_title": job_title,
        "interview_type": "custom_jd" if interview.jd_context else "preset",
        "jd_context": interview.jd_context,
        "status": interview.status,
        "chat_history": interview.chat_history or [],
        "evaluation": interview.evaluation,
        "created_at": interview.created_at.isoformat() if interview.created_at else "",
    }


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

    job_ids = list({i.job_id for i in interviews if i.job_id is not None})
    job_map = {}
    if job_ids:
        result = await db.execute(select(JobPosition).where(JobPosition.id.in_(job_ids)))
        job_map = {j.id: j for j in result.scalars().all()}

    items = []
    for iv in interviews:
        if iv.jd_context:
            title = iv.jd_context.get("title", "JD Interview")
        elif iv.job_id and iv.job_id in job_map:
            title = translate_title(job_map[iv.job_id].title, language)
        else:
            title = ""
        items.append({
            "id": iv.id,
            "job_id": iv.job_id,
            "job_title": title,
            "interview_type": "custom_jd" if iv.jd_context else "preset",
            "status": iv.status,
            "created_at": iv.created_at.isoformat() if iv.created_at else "",
            "evaluation": iv.evaluation,
        })

    return items
