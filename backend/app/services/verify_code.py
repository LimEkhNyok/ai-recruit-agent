import secrets

from app.config import (
    VERIFY_CODE_LENGTH,
    VERIFY_CODE_EXPIRE_SECONDS,
    VERIFY_CODE_SEND_INTERVAL,
)
from app.redis import redis_client

KEY_CODE = "verify_code:{email}"
KEY_LIMIT = "verify_code_limit:{email}"


def generate_code() -> str:
    return "".join(secrets.choice("0123456789") for _ in range(VERIFY_CODE_LENGTH))


async def check_send_interval(email: str) -> bool:
    """返回 True 表示仍在冷却期内（不允许发送）。"""
    return (await redis_client.exists(KEY_LIMIT.format(email=email))) > 0


async def store_code(email: str, code: str) -> None:
    pipe = redis_client.pipeline()
    pipe.set(KEY_CODE.format(email=email), code, ex=VERIFY_CODE_EXPIRE_SECONDS)
    pipe.set(KEY_LIMIT.format(email=email), "1", ex=VERIFY_CODE_SEND_INTERVAL)
    await pipe.execute()


async def verify_code(email: str, code: str) -> bool:
    """校验验证码，匹配成功后立即删除，返回是否匹配。"""
    key = KEY_CODE.format(email=email)
    stored = await redis_client.get(key)
    if stored is None or stored != code:
        return False
    await redis_client.delete(key)
    return True
