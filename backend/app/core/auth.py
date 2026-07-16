import hmac
import hashlib
import secrets

from fastapi import HTTPException, Header
from typing import Annotated

TOKEN_SECRET = secrets.token_bytes(32)


def make_token(email):
    sig = hmac.new(TOKEN_SECRET, email.encode(), hashlib.sha256).hexdigest()
    return f"{email}.{sig}"


def verify_token(token):
    if not token or "." not in token:
        return None
    email, sig = token.rsplit(".", 1)
    expected = hmac.new(TOKEN_SECRET, email.encode(), hashlib.sha256).hexdigest()
    if not secrets.compare_digest(sig, expected):
        return None
    return email


async def get_current_user(authorization: Annotated[str | None, Header()] = None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    email = verify_token(authorization[7:])
    if email is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return email