from pydantic import BaseModel, EmailStr


class SendVerifyCodeRequest(BaseModel):
    email: EmailStr


class SendVerifyCodeResponse(BaseModel):
    message: str


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    code: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserInfo(BaseModel):
    id: int
    email: str
    name: str

    model_config = {"from_attributes": True}
