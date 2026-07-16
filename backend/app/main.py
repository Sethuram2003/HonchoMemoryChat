from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db.users import init_db
from app.services.honcho import HonchoService
from app.routes import auth_router, sessions_router, chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    app.state.honcho = HonchoService()
    yield


app = FastAPI(title="Honcho Memory Chat", lifespan=lifespan)
app.include_router(auth_router)
app.include_router(sessions_router)
app.include_router(chat_router)


@app.get("/health")
def health():
    return {"status": "ok"}