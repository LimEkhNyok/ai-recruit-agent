import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from openai import OpenAI

logger = logging.getLogger(__name__)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.model_config import UserModelConfig
from app.models.user import User
from app.utils.crypto import decrypt_key

router = APIRouter(prefix="/api/speech", tags=["speech"])


@router.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserModelConfig).where(UserModelConfig.user_id == current_user.id)
    )
    config = result.scalar_one_or_none()

    if not config or config.mode != "byok" or not config.api_key_encrypted:
        raise HTTPException(status_code=403, detail="请先在模型设置中配置 API Key 以使用语音识别")

    api_key = decrypt_key(config.api_key_encrypted)
    client = OpenAI(api_key=api_key, base_url=config.base_url)

    try:
        audio_data = await file.read()
        transcription = client.audio.transcriptions.create(
            model="whisper-1",
            file=(file.filename or "audio.webm", audio_data),
            language="zh",
        )
        return {"code": 0, "data": {"text": transcription.text}}
    except Exception as e:
        logger.error(f"语音识别失败 user={current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="语音识别失败，请稍后重试")
