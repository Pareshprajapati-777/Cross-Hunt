from typing import Optional
from pydantic import BaseModel


class LoginPayload(BaseModel):
    username: str
    password: str


class RegisterPayload(BaseModel):
    username: str
    email: str
    password: str
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""
    phone: Optional[str] = ""
    phone_number: Optional[str] = ""
    role: Optional[str] = "USER"


class ProfileUpdatePayload(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    phone_number: Optional[str] = None
    whatsapp_number: Optional[str] = None
    address: Optional[str] = None
    password: Optional[str] = None


class ForgotPasswordPayload(BaseModel):
    username_or_email: str


class ResetPasswordPayload(BaseModel):
    username_or_email: str
    new_password: str
    reset_code: Optional[str] = None

