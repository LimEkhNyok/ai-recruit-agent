import json
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assessment import Assessment, TalentProfile
from app.services.model_service import ModelService
from app.prompts.assessment import SYSTEM_PROMPT, PROFILE_GENERATION_PROMPT

COMPLETE_MARKER = "[ASSESSMENT_COMPLETE]"


async def start_assessment(user_id: int, db: AsyncSession, model_service: ModelService) -> tuple[int, str]:
    """Create a new assessment and return (assessment_id, first_ai_message)."""
    first_message = await model_service.chat(
        system_prompt=SYSTEM_PROMPT,
        history=None,
        user_message="你好，我准备开始测评了。",
    )

    history = [
        {"role": "user", "parts": [{"text": "你好，我准备开始测评了。"}]},
        {"role": "model", "parts": [{"text": first_message}]},
    ]

    assessment = Assessment(
        user_id=user_id,
        status="in_progress",
        chat_history=history,
    )
    db.add(assessment)
    await db.commit()
    await db.refresh(assessment)

    return assessment.id, first_message


async def chat(assessment_id: int, user_message: str, db: AsyncSession, model_service: ModelService) -> tuple[str, bool]:
    """Append user message, get AI reply, return (reply, is_complete)."""
    result = await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    assessment = result.scalar_one_or_none()
    if assessment is None:
        raise ValueError("Assessment not found")

    history: list[dict] = list(assessment.chat_history) if assessment.chat_history else []

    reply = await model_service.chat(
        system_prompt=SYSTEM_PROMPT,
        history=history,
        user_message=user_message,
    )

    history.append({"role": "user", "parts": [{"text": user_message}]})
    history.append({"role": "model", "parts": [{"text": reply}]})

    is_complete = COMPLETE_MARKER in reply

    if is_complete:
        assessment.status = "completed"
        assessment.completed_at = datetime.now(timezone.utc)

    assessment.chat_history = history
    await db.commit()

    display_reply = reply.replace(COMPLETE_MARKER, "").strip()
    return display_reply, is_complete


async def finish_assessment(assessment_id: int, db: AsyncSession, model_service: ModelService) -> TalentProfile:
    """Generate talent profile from completed assessment dialogue."""
    result = await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    assessment = result.scalar_one_or_none()
    if assessment is None:
        raise ValueError("Assessment not found")

    history: list[dict] = assessment.chat_history or []

    dialogue_text = ""
    for msg in history:
        role = "用户" if msg["role"] == "user" else "AI测评师"
        text = msg["parts"][0]["text"]
        dialogue_text += f"{role}: {text}\n\n"

    profile_data = await model_service.generate_json(
        system_prompt=PROFILE_GENERATION_PROMPT,
        content=dialogue_text,
    )

    summary_for_embedding = json.dumps(profile_data, ensure_ascii=False)
    embedding = await model_service.get_embedding(summary_for_embedding)

    profile = TalentProfile(
        user_id=assessment.user_id,
        assessment_id=assessment.id,
        personality=profile_data.get("personality", {}),
        abilities=profile_data.get("abilities", {}),
        interests=profile_data.get("interests", {}),
        values=profile_data.get("values", {}),
        work_style=profile_data.get("work_style", {}),
        summary=profile_data.get("summary", ""),
        embedding=embedding,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)

    return profile


async def get_latest_profile(user_id: int, db: AsyncSession) -> TalentProfile | None:
    """Return the user's most recent talent profile, or None."""
    result = await db.execute(
        select(TalentProfile)
        .where(TalentProfile.user_id == user_id)
        .order_by(TalentProfile.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()
