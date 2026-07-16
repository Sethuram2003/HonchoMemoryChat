import os
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr, Field
from honcho import Honcho
from langchain_ollama import ChatOllama
import re
import sqlite3
import hashlib
import secrets

DB_PATH = os.getenv("DB_PATH", "/data/users.db")
HONCHO_URL = os.getenv("HONCHO_URL", "http://honcho-api:8000")
WORKSPACE_ID = os.getenv("HONCHO_WORKSPACE", "honcho-memory-chat")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://host.docker.internal:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "ornith:9b")

SESSION_ID_RE = re.compile(r"^session-[a-f0-9]{8}$")


def _hash_password(password, salt):
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000).hex()


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("CREATE TABLE IF NOT EXISTS users (email TEXT PRIMARY KEY, salt TEXT, password TEXT)")
    conn.commit()
    conn.close()


def create_user(email, password):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    salt = secrets.token_bytes(16)
    hashed = _hash_password(password, salt)
    try:
        conn.execute("INSERT INTO users (email, salt, password) VALUES (?, ?, ?)", (email, salt.hex(), hashed))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()


def verify_user(email, password):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT salt, password FROM users WHERE email=?", (email,)).fetchone()
    conn.close()
    if row is None:
        return False
    salt = bytes.fromhex(row["salt"])
    hashed = _hash_password(password, salt)
    return secrets.compare_digest(hashed, row["password"])


def _email_to_peer_id(email):
    return email.replace("@", "-at-").replace(".", "-")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    app.state.honcho = Honcho(base_url=HONCHO_URL, workspace_id=WORKSPACE_ID)
    app.state.llm = ChatOllama(model=OLLAMA_MODEL, base_url=OLLAMA_URL, temperature=0.7)
    app.state.assistant = app.state.honcho.peer("assistant")
    yield


app = FastAPI(title="Honcho Memory Chat", lifespan=lifespan)


class AuthRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class ChatRequest(BaseModel):
    email: EmailStr
    session_id: str = Field(pattern=r"^session-[a-f0-9]{8}$")
    message: str = Field(min_length=1, max_length=5000)


class SessionRequest(BaseModel):
    email: EmailStr


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/register")
def register(req: AuthRequest):
    if not create_user(req.email, req.password):
        raise HTTPException(status_code=400, detail="User already exists")
    app.state.honcho.peer(f"user-{_email_to_peer_id(req.email)}")
    return {"message": "User created"}


@app.post("/api/login")
def login(req: AuthRequest):
    if not verify_user(req.email, req.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"message": "Login successful", "email": req.email}


@app.post("/api/sessions")
def create_session(req: SessionRequest):
    honcho = app.state.honcho
    user_peer = honcho.peer(f"user-{_email_to_peer_id(req.email)}")
    session_id = f"session-{uuid.uuid4().hex[:8]}"
    honcho.session(session_id, peers=[user_peer, app.state.assistant])
    return {"session_id": session_id}


@app.get("/api/sessions")
def get_sessions(email: str):
    honcho = app.state.honcho
    user_peer = honcho.peer(f"user-{_email_to_peer_id(email)}")
    page = user_peer.sessions()
    return {"sessions": [s.id for s in page.items]}


@app.post("/api/chat")
def chat(req: ChatRequest):
    from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

    honcho = app.state.honcho
    user_peer = honcho.peer(f"user-{_email_to_peer_id(req.email)}")
    assistant = app.state.assistant
    session = honcho.session(req.session_id, peers=[user_peer, assistant])

    session.add_messages([user_peer.message(req.message)])

    context = session.context()
    honcho_messages = context.to_openai(assistant=assistant)

    if not honcho_messages:
        honcho_messages = [{"role": "user", "content": req.message}]

    lc_messages = []
    for m in honcho_messages:
        role = m.get("role", "user")
        content = m.get("content", "")
        if role == "system":
            lc_messages.append(SystemMessage(content=content))
        elif role == "assistant":
            lc_messages.append(AIMessage(content=content))
        else:
            lc_messages.append(HumanMessage(content=content))

    response = app.state.llm.invoke(lc_messages)
    reply = response.content

    session.add_messages([assistant.message(reply)])

    return {"reply": reply}


@app.get("/api/messages")
def get_messages(email: str, session_id: str):
    if not SESSION_ID_RE.match(session_id):
        raise HTTPException(status_code=400, detail="Invalid session_id")
    honcho = app.state.honcho
    user_peer = honcho.peer(f"user-{_email_to_peer_id(email)}")
    session = honcho.session(session_id, peers=[user_peer, app.state.assistant])
    page = session.messages()
    result = []
    for msg in page.items:
        result.append({
            "role": "assistant" if msg.peer_id == "assistant" else "user",
            "content": msg.content,
        })
    return {"messages": result}