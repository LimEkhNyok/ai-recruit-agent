from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.api.auth import _create_tokens
from app.models.user import User
from app.models.oauth_account import OAuthAccount
from app.schemas.auth import TokenResponse
from app.schemas.oauth import OAuthProviderInfo, OAuthBindRegisterRequest
from app.services.oauth_service import (
    get_provider_config,
    get_all_providers_public,
    build_authorize_url,
    save_state,
    verify_state,
    exchange_code_for_token,
    fetch_userinfo,
    save_pending_oauth,
    get_pending_oauth,
)
from app.services.verify_code import verify_code

router = APIRouter(prefix="/api/auth/oauth", tags=["oauth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

FRONTEND_BASE = "https://codetowork.net"


@router.get("/providers", response_model=list[OAuthProviderInfo])
async def list_providers():
    return get_all_providers_public()


@router.get("/{provider}/authorize")
async def authorize(provider: str, request: Request):
    config = get_provider_config(provider)
    if config is None:
        raise HTTPException(status_code=404, detail="Unknown OAuth provider")

    scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("x-forwarded-host", request.url.hostname)
    redirect_uri = f"{scheme}://{host}/api/auth/oauth/{provider}/callback"

    url, state = build_authorize_url(config, redirect_uri)
    await save_state(state, provider)
    return RedirectResponse(url=url)


@router.get("/{provider}/callback")
async def callback(
    provider: str,
    code: str,
    state: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    verified_provider = await verify_state(state)
    if verified_provider is None or verified_provider != provider:
        return RedirectResponse(url=f"/api/auth/oauth/{provider}/authorize")

    config = get_provider_config(provider)
    if config is None:
        raise HTTPException(status_code=404, detail="Unknown OAuth provider")

    scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("x-forwarded-host", request.url.hostname)
    redirect_uri = f"{scheme}://{host}/api/auth/oauth/{provider}/callback"

    try:
        token_data = await exchange_code_for_token(config, code, redirect_uri)
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to exchange authorization code")

    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=502, detail="No access_token in provider response")

    try:
        userinfo = await fetch_userinfo(config, access_token)
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to fetch user info from provider")

    provider_user_id = str(userinfo.get("id") or userinfo.get("sub") or "")
    if not provider_user_id:
        raise HTTPException(status_code=502, detail="Provider did not return a user ID")

    provider_email = userinfo.get("email", "")
    provider_name = userinfo.get("name") or userinfo.get("nickname") or ""

    result = await db.execute(
        select(OAuthAccount).where(
            OAuthAccount.provider == provider,
            OAuthAccount.provider_user_id == provider_user_id,
        )
    )
    oauth_account = result.scalar_one_or_none()

    if oauth_account and oauth_account.user_id:
        tokens = await _create_tokens(oauth_account.user_id, db)
        return RedirectResponse(
            url=f"{FRONTEND_BASE}/oauth/complete?token={tokens.access_token}&refresh_token={tokens.refresh_token}"
        )

    if not oauth_account:
        oauth_account = OAuthAccount(
            provider=provider,
            provider_user_id=provider_user_id,
            provider_email=provider_email,
            provider_name=provider_name,
        )
        db.add(oauth_account)
        await db.commit()
        await db.refresh(oauth_account)

    oauth_key = await save_pending_oauth({
        "oauth_account_id": oauth_account.id,
        "provider": provider,
        "provider_email": provider_email,
        "provider_name": provider_name,
    })

    return RedirectResponse(
        url=f"{FRONTEND_BASE}/oauth/complete-register?oauth_key={oauth_key}"
    )


@router.post("/bindwithregister", response_model=TokenResponse)
async def bind_with_register(
    req: OAuthBindRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    oauth_info = await get_pending_oauth(req.oauth_key)
    if oauth_info is None:
        raise HTTPException(status_code=400, detail="OAuth 授权已过期，请重新登录")

    if not await verify_code(req.email, req.code):
        raise HTTPException(status_code=400, detail="验证码错误或已过期")

    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="该邮箱已注册，请使用密码登录后在设置中绑定 OAuth")

    user = User(
        email=req.email,
        hashed_password=pwd_context.hash(req.password),
        name=req.name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    result = await db.execute(
        select(OAuthAccount).where(OAuthAccount.id == oauth_info["oauth_account_id"])
    )
    oauth_account = result.scalar_one_or_none()
    if oauth_account:
        oauth_account.user_id = user.id
        await db.commit()

    return await _create_tokens(user.id, db)
