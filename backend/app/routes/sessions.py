from typing import Annotated

from fastapi import APIRouter, HTTPException, Depends, Request

from app.schemas.chat import SessionRequest
from app.core.auth import get_current_user

router = APIRouter()


@router.post("/api/sessions")
def create_session(req: SessionRequest, email: Annotated[str, Depends(get_current_user)], request: Request):
    if req.email != email:
        raise HTTPException(status_code=403, detail="Cannot create sessions for other users")
    session_id = request.app.state.honcho.create_session(req.email)
    return {"session_id": session_id}


@router.get("/api/sessions")
def get_sessions(email: Annotated[str, Depends(get_current_user)], request: Request):
    sessions = request.app.state.honcho.list_sessions(email)
    return {"sessions": sessions}