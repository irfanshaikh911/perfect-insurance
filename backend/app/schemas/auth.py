from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Full agent name")
    agent_code: str = Field(..., min_length=2, max_length=50, description="Agent code for login")
    branch: str = Field(..., min_length=2, max_length=255, description="Branch details")
    phone: str = Field(..., min_length=5, max_length=50, description="Phone number")
    email: str = Field(..., description="Email address")
    password: str = Field(..., min_length=6, description="Password")
    confirm_password: str = Field(..., min_length=6, description="Confirm password")
    yearly_target: float = Field(default=0.0, ge=0, description="Yearly premium target in INR")

    @field_validator("confirm_password")
    def passwords_match(cls, v, values):
        if "password" in values.data and v != values.data["password"]:
            raise ValueError("Passwords do not match")
        return v


class UserLogin(BaseModel):
    agent_code: str = Field(..., description="Agent code for login")
    password: str = Field(..., description="Password")


class UserOut(BaseModel):
    id: str
    agent_code: str
    name: str
    email: str
    phone: str
    branch: str
    yearly_target: float
    avatar: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshTokenRequest(BaseModel):
    refresh_token: str
