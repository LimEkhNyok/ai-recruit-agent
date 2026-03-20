import json
import asyncio
import hashlib
import time
from typing import AsyncGenerator

from openai import OpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.model_config import UserModelConfig
from app.models.user import User
from app.utils.crypto import decrypt_key

MAX_RETRIES = 3
RETRY_DELAY = 1.0
REQUEST_TIMEOUT = 120


class ModelService:
    """Calls LLM via OpenAI-compatible API. Instantiated per-user config."""

    def __init__(self, base_url: str, api_key: str, model: str):
        self._client = OpenAI(api_key=api_key, base_url=base_url)
        self._model = model
        self._base_url = base_url
        self._user_id: int | None = None
        self._mode: str = "platform"
        self._feature: str = "unknown"
        self._session_id: str | None = None
        self._language: str = "zh"

    def set_language(self, language: str):
        self._language = language if language in ("zh", "en") else "zh"
        return self

    def set_context(self, user_id: int, mode: str, feature: str):
        self._user_id = user_id
        self._mode = mode
        self._feature = feature
        return self

    def set_session(self, session_id: str):
        self._session_id = session_id
        return self

    async def _log(self, req_tokens, resp_tokens, total_tokens, latency_ms, success, error=None):
        if self._user_id is None:
            return
        try:
            from app.services.usage_service import log_usage
            await log_usage(
                user_id=self._user_id,
                session_id=self._session_id,
                mode=self._mode,
                feature=self._feature,
                base_url=self._base_url,
                model=self._model,
                request_tokens=req_tokens,
                response_tokens=resp_tokens,
                total_tokens=total_tokens,
                latency_ms=latency_ms,
                success=success,
                error_message=error,
            )
        except Exception:
            pass

    def _history_to_messages(
        self, system_prompt: str, history: list[dict] | None, user_message: str
    ) -> list[dict]:
        prompt = system_prompt
        if self._language == "en":
            prompt += "\n\nIMPORTANT: Please respond entirely in English."
        msgs = [{"role": "system", "content": prompt}]
        if history:
            for msg in history:
                role = "assistant" if msg["role"] == "model" else "user"
                text = msg["parts"][0]["text"]
                msgs.append({"role": role, "content": text})
        msgs.append({"role": "user", "content": user_message})
        return msgs

    async def chat(
        self, system_prompt: str, history: list[dict] | None, user_message: str
    ) -> str:
        messages = self._history_to_messages(system_prompt, history, user_message)
        t0 = time.monotonic()
        for attempt in range(MAX_RETRIES):
            try:
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        self._client.chat.completions.create,
                        model=self._model,
                        messages=messages,
                        temperature=0.7,
                        max_tokens=4096,
                    ),
                    timeout=REQUEST_TIMEOUT,
                )
                ms = int((time.monotonic() - t0) * 1000)
                u = getattr(response, "usage", None)
                await self._log(
                    getattr(u, "prompt_tokens", None) if u else None,
                    getattr(u, "completion_tokens", None) if u else None,
                    getattr(u, "total_tokens", None) if u else None,
                    ms, True,
                )
                return response.choices[0].message.content
            except asyncio.TimeoutError:
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(RETRY_DELAY * (attempt + 1))
                else:
                    ms = int((time.monotonic() - t0) * 1000)
                    await self._log(None, None, None, ms, False, "timeout")
                    raise RuntimeError(f"API call timed out after {MAX_RETRIES} retries")
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(RETRY_DELAY * (attempt + 1))
                else:
                    ms = int((time.monotonic() - t0) * 1000)
                    await self._log(None, None, None, ms, False, str(e)[:200])
                    raise RuntimeError(f"API call failed after {MAX_RETRIES} retries: {e}") from e

    async def chat_stream(
        self, system_prompt: str, history: list[dict] | None, user_message: str
    ) -> AsyncGenerator[str, None]:
        messages = self._history_to_messages(system_prompt, history, user_message)
        t0 = time.monotonic()

        def _sync_stream():
            return self._client.chat.completions.create(
                model=self._model,
                messages=messages,
                temperature=0.7,
                max_tokens=4096,
                stream=True,
            )

        stream = await asyncio.to_thread(_sync_stream)
        for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta and delta.content:
                yield delta.content

        ms = int((time.monotonic() - t0) * 1000)
        await self._log(None, None, None, ms, True)

    async def generate_json(
        self,
        system_prompt: str,
        content: str,
        response_schema: dict | None = None,
    ) -> dict:
        json_instruction = (
            system_prompt
            + "\n\nIMPORTANT: You MUST respond with valid JSON only. "
            "No markdown, no code fences, no explanation. Pure JSON."
        )
        messages = [
            {"role": "system", "content": json_instruction},
            {"role": "user", "content": content},
        ]
        t0 = time.monotonic()
        for attempt in range(MAX_RETRIES):
            try:
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        self._client.chat.completions.create,
                        model=self._model,
                        messages=messages,
                        temperature=0.3,
                        max_tokens=8192,
                    ),
                    timeout=REQUEST_TIMEOUT,
                )
                text = response.choices[0].message.content.strip()
                if text.startswith("```"):
                    text = text.split("\n", 1)[1] if "\n" in text else text[3:]
                    if text.endswith("```"):
                        text = text[:-3].strip()
                result = json.loads(text)
                ms = int((time.monotonic() - t0) * 1000)
                u = getattr(response, "usage", None)
                await self._log(
                    getattr(u, "prompt_tokens", None) if u else None,
                    getattr(u, "completion_tokens", None) if u else None,
                    getattr(u, "total_tokens", None) if u else None,
                    ms, True,
                )
                return result
            except asyncio.TimeoutError:
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(RETRY_DELAY)
                else:
                    ms = int((time.monotonic() - t0) * 1000)
                    await self._log(None, None, None, ms, False, "timeout")
                    raise RuntimeError(f"JSON call timed out after {MAX_RETRIES} retries")
            except json.JSONDecodeError:
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(RETRY_DELAY)
                else:
                    ms = int((time.monotonic() - t0) * 1000)
                    await self._log(None, None, None, ms, False, "invalid_json")
                    raise RuntimeError(f"Returned invalid JSON after {MAX_RETRIES} retries: {text[:200]}")
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(RETRY_DELAY * (attempt + 1))
                else:
                    ms = int((time.monotonic() - t0) * 1000)
                    await self._log(None, None, None, ms, False, str(e)[:200])
                    raise RuntimeError(f"API call failed: {e}") from e

    async def get_embedding(self, text: str) -> list[float]:
        """Try real embedding API first; fall back to hash-based pseudo-embedding."""
        t0 = time.monotonic()
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    self._client.embeddings.create,
                    model=self._model,
                    input=text,
                ),
                timeout=30,
            )
            if response.data and len(response.data[0].embedding) > 0:
                ms = int((time.monotonic() - t0) * 1000)
                u = getattr(response, "usage", None)
                await self._log(
                    getattr(u, "prompt_tokens", None) if u else None,
                    None,
                    getattr(u, "total_tokens", None) if u else None,
                    ms, True,
                )
                return response.data[0].embedding
        except Exception as e:
            ms = int((time.monotonic() - t0) * 1000)
            await self._log(None, None, None, ms, False, f"embedding_fallback: {str(e)[:150]}")

        digest = hashlib.sha512(text.encode("utf-8")).digest()
        raw = []
        seed_bytes = digest
        while len(raw) < 768:
            seed_bytes = hashlib.sha512(seed_bytes).digest()
            for i in range(0, len(seed_bytes) - 3, 4):
                val = int.from_bytes(seed_bytes[i:i+4], "little", signed=True)
                raw.append(val / (2**31))
                if len(raw) >= 768:
                    break
        norm = sum(x * x for x in raw) ** 0.5
        if norm > 0:
            raw = [x / norm for x in raw]
        return raw


async def get_model_service_for_user(user: User, db: AsyncSession) -> ModelService:
    """Factory: create ModelService from user's config or platform defaults."""
    result = await db.execute(
        select(UserModelConfig).where(UserModelConfig.user_id == user.id)
    )
    config = result.scalar_one_or_none()

    if config and config.mode == "byok" and config.api_key_encrypted:
        api_key = decrypt_key(config.api_key_encrypted)
        svc = ModelService(base_url=config.base_url, api_key=api_key, model=config.model)
        svc.set_context(user_id=user.id, mode="byok", feature="unknown")
        return svc

    settings = get_settings()
    svc = ModelService(
        base_url=settings.GEMINI_BASE_URL,
        api_key=settings.GEMINI_API_KEY,
        model=settings.GEMINI_MODEL,
    )
    svc.set_context(user_id=user.id, mode="platform", feature="unknown")
    return svc
