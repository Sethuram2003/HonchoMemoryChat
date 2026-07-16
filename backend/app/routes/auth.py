from fastapi import APIRouter, HTTPException, Request

from app.schemas.auth import AuthRequest
from app.core.auth import make_token
from app.db.users import create_user, verify_user

router = APIRouter()


@router.post("/api/register")
def register(req: AuthRequest, request: Request):
    if not create_user(req.email, req.password):
        raise HTTPException(status_code=400, detail="User already exists")
    request.app.state.honcho.create_peer(req.email)
    token = make_token(req.email)
    return {"message": "User created", "email": req.email, "token": token}


@router.post("/api/login")
def login(req: AuthRequest):
    if not verify_user(req.email, req.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = make_token(req.email)
    return {"message": "Login successful", "email": req.email, "token": token}