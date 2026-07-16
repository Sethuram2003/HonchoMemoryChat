import re
from typing import Annotated

from fastapi import APIRouter, HTTPException, Depends, Request

from ..schemas.chat import ChatRequest
from ..core.auth import get_current_user

SESSION_ID_RE = re.compile(r"^session-[a-f0-9]{8}$")

router = APIRouter()


@router.post("/api/chat")
def chat(req: ChatRequest, email: Annotated[str, Depends(get_current_user)], request: Request):
    reply = request.app.state.honcho.chat(email, req.session_id, req.message)
    return {"reply": reply}


@router.get("/api/messages")
def get_messages(
    session_id: str,
    email: Annotated[str, Depends(get_current_user)],
    request: Request,
):
    if not SESSION_ID_RE.match(session_id):
        raise HTTPException(status_code=400, detail="Invalid session_id")
    messages = request.app.state.honcho.get_messages(email, session_id)
    return {"messages": messages}