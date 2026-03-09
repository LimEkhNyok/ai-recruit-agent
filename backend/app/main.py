from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
import app.models  # noqa: F401  — ensure all ORM models are registered before create_all

from app.api.auth import router as auth_router
from app.api.assessment import router as assessment_router
from app.api.matching import router as matching_router
from app.api.interview import router as interview_router
from app.api.career import router as career_router
from app.api.resume import router as resume_router
from app.api.quiz import router as quiz_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="AI Recruit Agent",
    description="AI驱动的招聘Agent - 从匹配到发现的人才价值引擎",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(assessment_router)
app.include_router(matching_router)
app.include_router(interview_router)
app.include_router(career_router)
app.include_router(resume_router)
app.include_router(quiz_router)


@app.get("/api/health")
async def health_check():
    return {"code": 0, "data": {"status": "ok"}, "message": "ok"}
