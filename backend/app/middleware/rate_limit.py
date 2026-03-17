import time
from collections import defaultdict

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware

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


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._buckets: dict[str, list[float]] = defaultdict(list)

    def _get_key(self, request: Request) -> str:
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer "):
            return f"token:{auth[7:20]}"
        ip = request.client.host if request.client else "unknown"
        return f"ip:{ip}"

    def _get_limit(self, path: str) -> tuple[int, int]:
        if path in UPLOAD_PATHS:
            return RATE_LIMITS["upload"]
        if path in AI_PATHS:
            return RATE_LIMITS["ai"]
        return RATE_LIMITS["default"]

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if request.method in ("GET", "OPTIONS", "HEAD") and path not in AI_PATHS:
            return await call_next(request)

        key = self._get_key(request)
        max_requests, window_seconds = self._get_limit(path)
        bucket_key = f"{key}:{path}" if path in AI_PATHS or path in UPLOAD_PATHS else key

        now = time.monotonic()
        timestamps = self._buckets[bucket_key]
        timestamps[:] = [t for t in timestamps if now - t < window_seconds]

        if len(timestamps) >= max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"请求过于频繁，请 {window_seconds} 秒后重试",
            )

        timestamps.append(now)
        return await call_next(request)
