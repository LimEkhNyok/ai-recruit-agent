import json
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func as sa_func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.quiz import QuizRecord
from app.services.model_service import ModelService
from app.api.deps import get_db, get_current_user, get_model_service, require_feature, require_billing
from app.prompts.quiz import (
    get_quiz_generate_prompt,
    get_quiz_judge_prompt,
    get_knowledge_quiz_prompt,
    get_variant_quiz_prompt,
)

router = APIRouter(prefix="/api/quiz", tags=["quiz"])

MASTERY_THRESHOLD = 2
_quiz_sessions: dict[int, str] = {}

_knowledge_data = None


def _load_knowledge_points():
    global _knowledge_data
    if _knowledge_data is None:
        data_path = Path(__file__).resolve().parent.parent / "data" / "knowledge_points.json"
        with open(data_path, "r", encoding="utf-8") as f:
            _knowledge_data = json.load(f)
    return _knowledge_data


def _find_topic_meta(domain_id: str, topic_id: str):
    """Find domain and topic metadata from knowledge_points.json."""
    data = _load_knowledge_points()
    for domain in data["domains"]:
        if domain["id"] == domain_id:
            for topic in domain["topics"]:
                if topic["id"] == topic_id:
                    return domain, topic
            return domain, None
    return None, None


# ---------- Request Models ----------

class GenerateRequest(BaseModel):
    topic: str
    question_type: str


class KnowledgeGenerateRequest(BaseModel):
    domain_id: str
    topic_id: str
    question_type: str
    difficulty: str = "中等"


class VariantGenerateRequest(BaseModel):
    question: str
    question_type: str
    knowledge_point: str
    user_answer: str
    is_correct: bool


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


# ---------- Memory Context ----------

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


async def _build_knowledge_memory_context(
    user_id: int, domain_name: str, topic_name: str, lang: str, db: AsyncSession
) -> str:
    """Build memory context for knowledge-point-based quiz, querying by domain + topic."""
    correct_expr = sa_func.sum(case((QuizRecord.is_correct == True, 1), else_=0))
    result = await db.execute(
        select(
            sa_func.count().label("total"),
            correct_expr.label("correct_count"),
        )
        .where(
            and_(
                QuizRecord.user_id == user_id,
                QuizRecord.topic == domain_name,
                QuizRecord.knowledge_point == topic_name,
            )
        )
    )
    row = result.first()
    total = row[0] if row else 0
    correct_count = row[1] or 0 if row else 0

    if total == 0:
        if lang == "en":
            return "## Memory Info\nThis is the user's first time on this knowledge point. Start with foundational questions."
        return "## 记忆信息\n该用户是第一次做该知识点的题，请从基础开始出题。"

    if correct_count >= MASTERY_THRESHOLD:
        if lang == "en":
            return f"## Memory Info\nThe user has answered {total} questions on this point ({correct_count} correct). They seem proficient — try harder or more tricky questions."
        return f"## 记忆信息\n该用户已在该知识点做了 {total} 题（{correct_count} 题正确），已较为熟练，请出更有深度或更刁钻的题目。"

    if lang == "en":
        return f"## Memory Info\nThe user has answered {total} questions on this point ({correct_count} correct). They are still weak — focus on consolidating fundamentals with varied angles."
    return f"## 记忆信息\n该用户已在该知识点做了 {total} 题（{correct_count} 题正确），仍较薄弱，请换不同角度巩固基础。"


# ---------- Knowledge Points Query ----------

@router.get("/knowledge-points")
async def get_knowledge_points(
    type: Optional[str] = Query(None, description="Filter by domain type: general or language"),
    current_user: User = Depends(get_current_user),
):
    data = _load_knowledge_points()
    domains = data["domains"]
    if type in ("general", "language"):
        domains = [d for d in domains if d["type"] == type]
    return {"domains": domains}


# ---------- Legacy Generate (kept for backward compatibility) ----------

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


# ---------- Knowledge-Point Generate ----------

@router.post("/generate-by-knowledge")
async def generate_by_knowledge(
    req: KnowledgeGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    model_service: ModelService = Depends(get_model_service),
    _=Depends(require_feature("quiz")),
    __=Depends(require_billing("quiz")),
):
    domain_meta, topic_meta = _find_topic_meta(req.domain_id, req.topic_id)
    if not domain_meta or not topic_meta:
        raise HTTPException(status_code=400, detail="Invalid domain_id or topic_id")

    lang = model_service.language
    memory_context = await _build_knowledge_memory_context(
        current_user.id, domain_meta["name"], topic_meta["name"], lang, db
    )

    prompt_content = get_knowledge_quiz_prompt(lang).replace(
        "{domain_name}", domain_meta["name"]
    ).replace(
        "{topic_name}", topic_meta["name"]
    ).replace(
        "{topic_description}", topic_meta["description"]
    ).replace(
        "{typical_approach}", topic_meta["typical_approach"]
    ).replace(
        "{question_type}", req.question_type
    ).replace(
        "{difficulty}", req.difficulty
    ).replace(
        "{memory_context}", memory_context
    )

    sid = str(uuid.uuid4())
    _quiz_sessions[current_user.id] = sid
    model_service._feature = "quiz"
    model_service.set_session(sid)
    gen_system_prompt = (
        "You are a professional technical question designer. Please strictly output one original question in the required JSON format."
        if lang == "en"
        else "你是一位专业的技术出题官。请严格按照要求的 JSON 格式原创输出一道题目。"
    )
    question_data = await model_service.generate_json(
        system_prompt=gen_system_prompt,
        content=prompt_content,
    )

    return question_data


# ---------- Variant Generate ----------

@router.post("/generate-variant")
async def generate_variant(
    req: VariantGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    model_service: ModelService = Depends(get_model_service),
    _=Depends(require_feature("quiz")),
    __=Depends(require_billing("quiz")),
):
    lang = model_service.language

    if req.is_correct:
        if lang == "en":
            difficulty_instruction = "The user answered correctly — increase difficulty slightly or test from a trickier angle"
        else:
            difficulty_instruction = "用户答对了，请适当提高难度或从更刁钻的角度出题"
    else:
        if lang == "en":
            difficulty_instruction = "The user answered incorrectly — keep the same difficulty level and reinforce the same concept from a different angle"
        else:
            difficulty_instruction = "用户答错了，请保持相同难度，从不同角度巩固同一概念"

    is_correct_str = ("Yes" if lang == "en" else "是") if req.is_correct else ("No" if lang == "en" else "否")

    prompt_content = get_variant_quiz_prompt(lang).replace(
        "{knowledge_point}", req.knowledge_point
    ).replace(
        "{question}", req.question
    ).replace(
        "{user_answer}", req.user_answer
    ).replace(
        "{is_correct}", is_correct_str
    ).replace(
        "{difficulty_instruction}", difficulty_instruction
    ).replace(
        "{question_type}", req.question_type
    )

    sid = str(uuid.uuid4())
    _quiz_sessions[current_user.id] = sid
    model_service._feature = "quiz"
    model_service.set_session(sid)
    gen_system_prompt = (
        "You are a professional technical question designer. Please generate one variant question in the required JSON format."
        if lang == "en"
        else "你是一位专业的技术出题官。请严格按照要求的 JSON 格式输出一道变体题。"
    )
    question_data = await model_service.generate_json(
        system_prompt=gen_system_prompt,
        content=prompt_content,
    )

    return question_data


# ---------- Judge ----------

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


# ---------- Skip ----------

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


# ---------- Global Stats (legacy) ----------

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


# ---------- Knowledge Stats ----------

@router.get("/knowledge-stats")
async def knowledge_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    correct_expr = sa_func.sum(case((QuizRecord.is_correct == True, 1), else_=0))
    result = await db.execute(
        select(
            QuizRecord.topic,
            QuizRecord.knowledge_point,
            sa_func.count().label("total"),
            correct_expr.label("correct_count"),
        )
        .where(QuizRecord.user_id == current_user.id)
        .group_by(QuizRecord.topic, QuizRecord.knowledge_point)
    )

    topic_stats = {}
    domain_stats = {}

    for row in result.all():
        domain_name = row[0]
        kp = row[1]
        total = row[2]
        cc = row[3] or 0
        accuracy = round(cc / total * 100, 1) if total > 0 else 0

        if cc >= MASTERY_THRESHOLD:
            status = "mastered"
        elif total > 0:
            status = "weak"
        else:
            status = "not_started"

        topic_stats.setdefault(domain_name, []).append({
            "knowledge_point": kp,
            "total": total,
            "correct": cc,
            "accuracy": accuracy,
            "status": status,
        })

        if domain_name not in domain_stats:
            domain_stats[domain_name] = {
                "total": 0,
                "correct": 0,
                "mastered_count": 0,
                "weak_count": 0,
            }
        domain_stats[domain_name]["total"] += total
        domain_stats[domain_name]["correct"] += cc
        if status == "mastered":
            domain_stats[domain_name]["mastered_count"] += 1
        elif status == "weak":
            domain_stats[domain_name]["weak_count"] += 1

    domains_summary = []
    for domain_name, ds in domain_stats.items():
        domains_summary.append({
            "domain": domain_name,
            "total": ds["total"],
            "correct": ds["correct"],
            "accuracy": round(ds["correct"] / ds["total"] * 100, 1) if ds["total"] > 0 else 0,
            "mastered_count": ds["mastered_count"],
            "weak_count": ds["weak_count"],
            "topics": topic_stats.get(domain_name, []),
        })

    return {"domains": domains_summary}
