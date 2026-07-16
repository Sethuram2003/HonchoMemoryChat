from pydantic import BaseModel, EmailStr, Field


class ChatRequest(BaseModel):
    session_id: str = Field(pattern=r"^session-[a-f0-9]{8}$")
    message: str = Field(min_length=1, max_length=5000)


class SessionRequest(BaseModel):
    email: EmailStr