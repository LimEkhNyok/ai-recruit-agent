import logging
import time
from collections import defaultdict

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

RATE_LIMITS = {
    "default": (60, 60),
    "ai": (10, 60),
    "upload": (5, 60),
}

AI_PATHS = {
    "/api/assessment/start", "/api/assessment/chat", "/api/assessment/finish",
    "/api/matching/match",
    "/api/interview/start", "/api/interview/chat", "/api/interview/end",
    "/api/career/generate",
    "/api/resume/analyze",
    "/api/quiz/generate", "/api/quiz/judge",
}

UPLOAD_PATHS = {"/api/resume/upload"}

_redis_available = None
_redis_client = None


async def _get_redis():
    global _redis_available, _redis_client
    if _redis_available is False:
        return None
    if _redis_client is not None:
        return _redis_client
    try:
        from app.redis import redis_client
        await redis_client.ping()
        _redis_client = redis_client
        _redis_available = True
        return _redis_client
    except Exception:
        _redis_available = False
        logger.info("Redis 不可用，速率限制回退到内存模式")
        return None


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._buckets: dict[str, list[float]] = defaultdict(list)

    def _get_key(self, request: Request) -> str:
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer "):
            return f"token:{auth[7:27]}"
        forwarded = request.headers.get("x-forwarded-for", "")
        ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
        return f"ip:{ip}"

    def _get_limit(self, path: str) -> tuple[int, int]:
        if path in UPLOAD_PATHS:
            return RATE_LIMITS["upload"]
        if path in AI_PATHS:
            return RATE_LIMITS["ai"]
        return RATE_LIMITS["default"]

    async def _check_redis(self, bucket_key: str, max_requests: int, window_seconds: int) -> bool:
        r = await _get_redis()
        if r is None:
            return None
        try:
            count = await r.incr(bucket_key)
            if count == 1:
                await r.expire(bucket_key, window_seconds)
            return count > max_requests
        except Exception:
            return None

    def _check_memory(self, bucket_key: str, max_requests: int, window_seconds: int) -> bool:
        now = time.monotonic()
        timestamps = self._buckets[bucket_key]
        timestamps[:] = [t for t in timestamps if now - t < window_seconds]
        if len(timestamps) >= max_requests:
            return True
        timestamps.append(now)
        return False

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if request.method in ("GET", "OPTIONS", "HEAD") and path not in AI_PATHS:
            return await call_next(request)

        key = self._get_key(request)
        max_requests, window_seconds = self._get_limit(path)
        bucket_key = f"rl:{key}:{path}" if path in AI_PATHS or path in UPLOAD_PATHS else f"rl:{key}"

        exceeded = await self._check_redis(bucket_key, max_requests, window_seconds)
        if exceeded is None:
            exceeded = self._check_memory(bucket_key, max_requests, window_seconds)

        if exceeded:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"请求过于频繁，请 {window_seconds} 秒后重试",
            )

        return await call_next(request)
