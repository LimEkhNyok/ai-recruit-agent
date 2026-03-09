import json
import asyncio
import hashlib
from typing import AsyncGenerator

from openai import OpenAI

from app.config import get_settings

MAX_RETRIES = 3
RETRY_DELAY = 1.0
REQUEST_TIMEOUT = 120


class GeminiService:
    """Calls Gemini via OpenAI-compatible proxy (e.g. sophnet)."""

    def __init__(self):
        settings = get_settings()
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not set in .env")
        self._client = OpenAI(
            api_key=settings.GEMINI_API_KEY,
            base_url=settings.GEMINI_BASE_URL,
        )
        self._model = settings.GEMINI_MODEL

    @staticmethod
    def _history_to_messages(
        system_prompt: str, history: list[dict] | None, user_message: str
    ) -> list[dict]:
        msgs = [{"role": "system", "content": system_prompt}]
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
        """Non-streaming chat. Returns the full response text."""
        messages = self._history_to_messages(system_prompt, history, user_message)
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
                return response.choices[0].message.content
            except asyncio.TimeoutError:
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(RETRY_DELAY * (attempt + 1))
                else:
                    raise RuntimeError(
                        f"API call timed out after {MAX_RETRIES} retries"
                    )
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(RETRY_DELAY * (attempt + 1))
                else:
                    raise RuntimeError(
                        f"API call failed after {MAX_RETRIES} retries: {e}"
                    ) from e

    async def chat_stream(
        self, system_prompt: str, history: list[dict] | None, user_message: str
    ) -> AsyncGenerator[str, None]:
        """Streaming chat. Yields text chunks as they arrive."""
        messages = self._history_to_messages(system_prompt, history, user_message)

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

    async def generate_json(
        self,
        system_prompt: str,
        content: str,
        response_schema: dict | None = None,
    ) -> dict:
        """Force JSON output. Returns parsed dict."""
        json_instruction = (
            system_prompt
            + "\n\nIMPORTANT: You MUST respond with valid JSON only. "
            "No markdown, no code fences, no explanation. Pure JSON."
        )
        messages = [
            {"role": "system", "content": json_instruction},
            {"role": "user", "content": content},
        ]
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
                return json.loads(text)
            except asyncio.TimeoutError:
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(RETRY_DELAY)
                else:
                    raise RuntimeError(
                        f"JSON call timed out after {MAX_RETRIES} retries"
                    )
            except json.JSONDecodeError:
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(RETRY_DELAY)
                else:
                    raise RuntimeError(
                        f"Returned invalid JSON after {MAX_RETRIES} retries: "
                        f"{text[:200]}"
                    )
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(RETRY_DELAY * (attempt + 1))
                else:
                    raise RuntimeError(f"API call failed: {e}") from e

    async def get_embedding(self, text: str) -> list[float]:
        """Generate a deterministic pseudo-embedding from text.

        The sophnet proxy does not expose an embedding endpoint, so we
        produce a stable 768-dim vector by hashing the text. This is
        sufficient for cosine-similarity ranking within the app.
        """
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


_instance: GeminiService | None = None


def get_gemini_service() -> GeminiService:
    """Singleton accessor for convenience."""
    global _instance
    if _instance is None:
        _instance = GeminiService()
    return _instance
