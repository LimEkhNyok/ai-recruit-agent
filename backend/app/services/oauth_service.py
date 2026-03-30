import secrets
from urllib.parse import urlencode

import httpx

from app.config import get_settings
from app.redis import redis_client


OAUTH_STATE_PREFIX = "oauth_state:"
OAUTH_STATE_EXPIRE = 300  # 5 min
OAUTH_PENDING_PREFIX = "oauth_pending:"
OAUTH_PENDING_EXPIRE = 600  # 10 min


def get_provider_config(provider_name: str) -> dict | None:
    providers = get_settings().get_oauth_providers()
    for p in providers:
        if p.get("name") == provider_name:
            return p
    return None


def get_all_providers_public() -> list[dict]:
    providers = get_settings().get_oauth_providers()
    return [{"name": p["name"], "label": p.get("label", p["name"])} for p in providers]


def build_authorize_url(provider: dict, redirect_uri: str) -> tuple[str, str]:
    state = secrets.token_urlsafe(32)
    params = {
        "client_id": provider["client_id"],
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "state": state,
    }
    scopes = provider.get("scopes", "")
    if scopes:
        params["scope"] = scopes
    url = provider["authorize_url"] + "?" + urlencode(params)
    return url, state


async def save_state(state: str, provider_name: str):
    r = redis_client
    await r.set(OAUTH_STATE_PREFIX + state, provider_name, ex=OAUTH_STATE_EXPIRE)


async def verify_state(state: str) -> str | None:
    r = redis_client
    provider_name = await r.get(OAUTH_STATE_PREFIX + state)
    if provider_name:
        await r.delete(OAUTH_STATE_PREFIX + state)
        return provider_name
    return None


async def exchange_code_for_token(provider: dict, code: str, redirect_uri: str) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            provider["token_url"],
            data={
                "grant_type": "authorization_code",
                "client_id": provider["client_id"],
                "client_secret": provider["client_secret"],
                "code": code,
                "redirect_uri": redirect_uri,
            },
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        return resp.json()


async def fetch_userinfo(provider: dict, access_token: str) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            provider["userinfo_url"],
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def save_pending_oauth(oauth_info: dict) -> str:
    key = secrets.token_urlsafe(32)
    r = redis_client
    import json
    await r.set(OAUTH_PENDING_PREFIX + key, json.dumps(oauth_info), ex=OAUTH_PENDING_EXPIRE)
    return key


async def get_pending_oauth(key: str) -> dict | None:
    r = redis_client
    data = await r.get(OAUTH_PENDING_PREFIX + key)
    if data:
        await r.delete(OAUTH_PENDING_PREFIX + key)
        import json
        return json.loads(data)
    return None
