from pydantic import BaseModel, EmailStr


class OAuthProviderInfo(BaseModel):
    name: str
    label: str


class OAuthBindRegisterRequest(BaseModel):
    oauth_key: str
    name: str
    email: EmailStr
    password: str
    code: str
