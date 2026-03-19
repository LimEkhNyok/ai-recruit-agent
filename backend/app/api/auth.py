import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse, UserInfo, RefreshRequest,
    SendVerifyCodeRequest, SendVerifyCodeResponse, ResetPasswordRequest,
)
from app.api.deps import get_db, get_current_user
from app.services.verify_code import generate_code, store_code, verify_code, check_send_interval
from app.services.email import send_verification_email, send_reset_password_email

router = APIRouter(prefix="/api/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

REFRESH_TOKEN_EXPIRE_DAYS = 30


def _create_access_token(user_id: int) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


async def _create_refresh_token(user_id: int, db: AsyncSession) -> str:
    token = secrets.token_urlsafe(48)
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    rt = RefreshToken(user_id=user_id, token=token, expires_at=expires_at)
    db.add(rt)
    await db.commit()
    return token


async def _create_tokens(user_id: int, db: AsyncSession) -> TokenResponse:
    access_token = _create_access_token(user_id)
    refresh_token = await _create_refresh_token(user_id, db)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/send-verify-code", response_model=SendVerifyCodeResponse)
async def send_verify_code(req: SendVerifyCodeRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该邮箱已注册")

    if await check_send_interval(req.email):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="发送过于频繁，请稍后再试")

    code = generate_code()
    await store_code(req.email, code)
    await send_verification_email(req.email, code)

    return SendVerifyCodeResponse(message="验证码已发送")


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if not await verify_code(req.email, req.code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="验证码错误或已过期")

    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该邮箱已注册")

    user = User(
        email=req.email,
        hashed_password=pwd_context.hash(req.password),
        name=req.name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return await _create_tokens(user.id, db)


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if user is None or not pwd_context.verify(req.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    return await _create_tokens(user.id, db)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(req: RefreshRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RefreshToken).where(RefreshToken.token == req.refresh_token))
    rt = result.scalar_one_or_none()

    if rt is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    if rt.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        await db.execute(delete(RefreshToken).where(RefreshToken.id == rt.id))
        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")

    await db.execute(delete(RefreshToken).where(RefreshToken.id == rt.id))
    await db.commit()

    return await _create_tokens(rt.user_id, db)


@router.post("/send-reset-code", response_model=SendVerifyCodeResponse)
async def send_reset_code(req: SendVerifyCodeRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该邮箱未注册")

    if await check_send_interval(req.email):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="发送过于频繁，请稍后再试")

    code = generate_code()
    await store_code(req.email, code)
    await send_reset_password_email(req.email, code)

    return SendVerifyCodeResponse(message="验证码已发送")


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    if not await verify_code(req.email, req.code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="验证码错误或已过期")

    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该邮箱未注册")

    user.hashed_password = pwd_context.hash(req.new_password)
    await db.commit()

    return {"message": "密码重置成功"}


@router.get("/me", response_model=UserInfo)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
