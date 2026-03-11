import io

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.resume import Resume
from app.services.model_service import ModelService
from app.api.deps import get_db, get_current_user, get_model_service, require_feature
from app.prompts.resume import RESUME_ANALYSIS_PROMPT

router = APIRouter(prefix="/api/resume", tags=["resume"])


def _extract_text(filename: str, content: bytes) -> str:
    lower = filename.lower()

    if lower.endswith(".txt"):
        for enc in ("utf-8", "gbk", "gb2312", "latin-1"):
            try:
                return content.decode(enc)
            except UnicodeDecodeError:
                continue
        return content.decode("utf-8", errors="replace")

    if lower.endswith(".pdf"):
        from PyPDF2 import PdfReader
        reader = PdfReader(io.BytesIO(content))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(pages).strip()

    if lower.endswith(".docx"):
        from docx import Document
        doc = Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs).strip()

    raise ValueError(f"Unsupported file type: {filename}")


@router.post("/upload")
async def upload(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    allowed = (".pdf", ".docx", ".txt")
    if not any(file.filename.lower().endswith(ext) for ext in allowed):
        raise HTTPException(status_code=400, detail=f"仅支持 {', '.join(allowed)} 格式")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="文件大小不能超过 10MB")

    try:
        text = _extract_text(file.filename, content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"文件解析失败: {e}")

    if not text.strip():
        raise HTTPException(status_code=400, detail="无法从文件中提取到文本内容")

    resume = Resume(
        user_id=current_user.id,
        filename=file.filename,
        text_content=text,
        file_size=len(content),
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)

    preview = text[:200] + ("..." if len(text) > 200 else "")
    return {"resume_id": resume.id, "filename": file.filename, "text_preview": preview}


@router.post("/analyze")
async def analyze(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    model_service: ModelService = Depends(get_model_service),
    _=Depends(require_feature("resume")),
):
    resume_id = body.get("resume_id")
    if not resume_id:
        raise HTTPException(status_code=400, detail="缺少 resume_id")

    result = await db.execute(select(Resume).where(Resume.id == int(resume_id)))
    resume = result.scalar_one_or_none()

    if resume is None:
        raise HTTPException(status_code=404, detail="简历未找到，请重新上传")
    if resume.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此简历")

    import uuid
    model_service._feature = "resume"
    model_service.set_session(str(uuid.uuid4()))
    analysis = await model_service.generate_json(
        system_prompt=RESUME_ANALYSIS_PROMPT,
        content=f"以下是简历内容：\n\n{resume.text_content}",
    )

    resume.analysis = analysis
    await db.commit()

    return {"resume_id": resume.id, "filename": resume.filename, "analysis": analysis}
