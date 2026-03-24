from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "mysql+aiomysql://root:root@localhost:3306/ai_recruit"
    REDIS_URL: str = "redis://localhost:6379/0"
    GEMINI_API_KEY: str = ""
    GEMINI_BASE_URL: str = "https://www.sophnet.com/api/open-apis/v1"
    GEMINI_MODEL: str = "gemini-3-pro-preview"
    ENCRYPTION_KEY: str = ""
    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    SMTP_HOST: str = "smtpdm-ap-southeast-1.aliyun.com"
    SMTP_PORT: int = 465
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@smartmeal.longstock.com"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if not s.JWT_SECRET_KEY or s.JWT_SECRET_KEY.startswith("dev-secret"):
        raise RuntimeError("JWT_SECRET_KEY 未设置或使用了不安全的默认值，请在 .env 中配置")
    if not s.ENCRYPTION_KEY:
        raise RuntimeError("ENCRYPTION_KEY 未设置，请在 .env 中配置")
    return s


VERIFY_CODE_LENGTH = 6
VERIFY_CODE_EXPIRE_SECONDS = 300
VERIFY_CODE_SEND_INTERVAL = 60

FREE_QUIZ_ROUNDS = 3

FEATURE_CREDITS_COST = {
    "assessment": 100,
    "matching": 50,
    "interview": 100,
    "career": 50,
    "resume": 50,
    "quiz": 10,
}

RECHARGE_TIERS = {
    "mini": {"amount_yuan": 2, "credits": 200},
    "starter": {"amount_yuan": 5, "credits": 500},
    "basic": {"amount_yuan": 10, "credits": 1000},
    "plus": {"amount_yuan": 30, "credits": 3200},
    "premium": {"amount_yuan": 100, "credits": 11000},
}

SUBSCRIPTION_PLANS = {
    "weekly": {"amount_yuan": 9.9, "duration_days": 7},
    "monthly": {"amount_yuan": 29.9, "duration_days": 30},
}
