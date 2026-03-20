import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func as sa_func, and_, case, Integer
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.quiz import QuizRecord
from app.services.model_service import ModelService
from app.api.deps import get_db, get_current_user, get_model_service, require_feature, require_billing
from app.prompts.quiz import get_quiz_generate_prompt, get_quiz_judge_prompt

router = APIRouter(prefix="/api/quiz", tags=["quiz"])

MASTERY_THRESHOLD = 2
_quiz_sessions: dict[int, str] = {}


class GenerateRequest(BaseModel):
    topic: str
    question_type: str


class JudgeRequest(BaseModel):
    question: str
    question_type: str
    correct_answer: str
    knowledge_point: str
    topic: str
    user_answer: str


class SkipRequest(BaseModel):
    question: str
    question_type: str
    correct_answer: str
    knowledge_point: str
    topic: str
    explanation: str


async def _build_memory_context(user_id: int, topic: str, db: AsyncSession) -> str:
    """Query quiz history and build memory context for the prompt."""
    correct_expr = sa_func.sum(case((QuizRecord.is_correct == True, 1), else_=0))
    result = await db.execute(
        select(
            QuizRecord.knowledge_point,
            correct_expr.label("correct_count"),
            sa_func.count().label("total"),
        )
        .where(and_(QuizRecord.user_id == user_id, QuizRecord.topic == topic))
        .group_by(QuizRecord.knowledge_point)
    )

    mastered = []
    weak = []

    for row in result.all():
        kp = row[0]
        correct_count = row[1] or 0
        if correct_count >= MASTERY_THRESHOLD:
            mastered.append(kp)
        else:
            weak.append(kp)

    lines = []
    if mastered:
        lines.append(f"## 已掌握的知识点（请避开，不要再考这些）\n{', '.join(mastered)}")
    if weak:
        lines.append(f"## 薄弱知识点（请重点考察，换不同角度或题型出题）\n{', '.join(weak)}")
    if not lines:
        lines.append("## 记忆信息\n该用户是第一次做这个方向的题，请从基础到进阶合理出题。")

    return "\n\n".join(lines)


async def _build_memory_context_en(user_id: int, topic: str, db: AsyncSession) -> str:
    """Query quiz history and build English memory context for the prompt."""
    correct_expr = sa_func.sum(case((QuizRecord.is_correct == True, 1), else_=0))
    result = await db.execute(
        select(
            QuizRecord.knowledge_point,
            correct_expr.label("correct_count"),
            sa_func.count().label("total"),
        )
        .where(and_(QuizRecord.user_id == user_id, QuizRecord.topic == topic))
        .group_by(QuizRecord.knowledge_point)
    )

    mastered = []
    weak = []

    for row in result.all():
        kp = row[0]
        correct_count = row[1] or 0
        if correct_count >= MASTERY_THRESHOLD:
            mastered.append(kp)
        else:
            weak.append(kp)

    lines = []
    if mastered:
        lines.append(f"## Mastered Knowledge Points (avoid these, do not test again)\n{', '.join(mastered)}")
    if weak:
        lines.append(f"## Weak Knowledge Points (focus on these, use different angles or question types)\n{', '.join(weak)}")
    if not lines:
        lines.append("## Memory Info\nThis is the user's first time on this topic. Please generate questions from basic to advanced.")

    return "\n\n".join(lines)


@router.post("/generate")
async def generate(
    req: GenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    model_service: ModelService = Depends(get_model_service),
    _=Depends(require_feature("quiz")),
    __=Depends(require_billing("quiz")),
):
    lang = model_service.language
    if lang == "en":
        memory_context = await _build_memory_context_en(current_user.id, req.topic, db)
    else:
        memory_context = await _build_memory_context(current_user.id, req.topic, db)

    prompt_content = get_quiz_generate_prompt(lang).replace(
        "{topic}", req.topic
    ).replace(
        "{question_type}", req.question_type
    ).replace(
        "{memory_context}", memory_context
    )

    sid = str(uuid.uuid4())
    _quiz_sessions[current_user.id] = sid
    model_service._feature = "quiz"
    model_service.set_session(sid)
    gen_system_prompt = (
        "You are a professional technical question designer. Please strictly output one question in the required JSON format."
        if lang == "en"
        else "你是一位专业的技术出题官。请严格按照要求的 JSON 格式输出一道题目。"
    )
    question_data = await model_service.generate_json(
        system_prompt=gen_system_prompt,
        content=prompt_content,
    )

    return question_data


@router.post("/judge")
async def judge(
    req: JudgeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    model_service: ModelService = Depends(get_model_service),
    _=Depends(require_feature("quiz")),
):
    lang = model_service.language
    prompt_content = get_quiz_judge_prompt(lang).replace(
        "{question_type}", req.question_type
    ).replace(
        "{question}", req.question
    ).replace(
        "{correct_answer}", req.correct_answer
    ).replace(
        "{knowledge_point}", req.knowledge_point
    ).replace(
        "{user_answer}", req.user_answer
    )

    model_service._feature = "quiz"
    sid = _quiz_sessions.pop(current_user.id, None)
    if sid:
        model_service.set_session(sid)
    judge_system_prompt = (
        "You are a rigorous technical judge. Please strictly output the judgment result in the required JSON format."
        if lang == "en"
        else "你是一位严谨的技术评判官。请严格按照要求的 JSON 格式输出判断结果。"
    )
    result = await model_service.generate_json(
        system_prompt=judge_system_prompt,
        content=prompt_content,
    )

    record = QuizRecord(
        user_id=current_user.id,
        topic=req.topic,
        knowledge_point=req.knowledge_point,
        question_type=req.question_type,
        question_text=req.question,
        user_answer=req.user_answer,
        is_correct=bool(result.get("is_correct", False)),
        is_skipped=False,
    )
    db.add(record)
    await db.commit()

    return result


@router.post("/skip")
async def skip(
    req: SkipRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    record = QuizRecord(
        user_id=current_user.id,
        topic=req.topic,
        knowledge_point=req.knowledge_point,
        question_type=req.question_type,
        question_text=req.question,
        user_answer=None,
        is_correct=False,
        is_skipped=True,
    )
    db.add(record)
    await db.commit()

    return {
        "is_correct": False,
        "explanation": req.explanation,
        "correct_answer": req.correct_answer,
    }


@router.get("/stats")
async def stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(sa_func.count()).select_from(QuizRecord)
        .where(QuizRecord.user_id == current_user.id)
    )
    total = result.scalar() or 0

    result = await db.execute(
        select(sa_func.count()).select_from(QuizRecord)
        .where(and_(QuizRecord.user_id == current_user.id, QuizRecord.is_correct == True))
    )
    correct = result.scalar() or 0

    correct_expr = sa_func.sum(case((QuizRecord.is_correct == True, 1), else_=0))
    result = await db.execute(
        select(
            QuizRecord.knowledge_point,
            correct_expr.label("cc"),
        )
        .where(QuizRecord.user_id == current_user.id)
        .group_by(QuizRecord.knowledge_point)
    )

    mastered = []
    weak = []
    for row in result.all():
        kp = row[0]
        cc = row[1] or 0
        if cc >= MASTERY_THRESHOLD:
            mastered.append(kp)
        else:
            weak.append(kp)

    return {
        "total": total,
        "correct": correct,
        "accuracy": round(correct / total * 100, 1) if total > 0 else 0,
        "mastered": mastered,
        "weak": weak,
    }
