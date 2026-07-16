import uuid
import logging

from honcho import Honcho
from honcho.session import SessionPeerConfig
from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from app.core.config import HONCHO_URL, WORKSPACE_ID, OLLAMA_URL, OLLAMA_MODEL


logger = logging.getLogger(__name__)


def email_to_peer_id(email):
    return f"user-{email.replace('@', '-at-').replace('.', '-')}"


class HonchoService:
    def __init__(self):
        self.honcho = Honcho(base_url=HONCHO_URL, workspace_id=WORKSPACE_ID)
        self.llm = ChatOllama(model=OLLAMA_MODEL, base_url=OLLAMA_URL, temperature=0.7)
        self.assistant = self.honcho.peer("assistant")

    def create_peer(self, email):
        return self.honcho.peer(email_to_peer_id(email))

    def get_session(self, email, session_id):
        user_peer = self.create_peer(email)
        session = self.honcho.session(
            session_id,
            peers=[
                (user_peer, SessionPeerConfig(observe_me=True)),
                (self.assistant, SessionPeerConfig(observe_others=True)),
            ],
        )

        # Existing sessions were created before the assistant observed users.
        # Keep their configuration aligned so their memory can be derived too.
        session.set_peer_configuration(
            self.assistant,
            SessionPeerConfig(observe_others=True),
        )
        return user_peer, session

    def create_session(self, email, session_id=None):
        if session_id is None:
            session_id = f"session-{uuid.uuid4().hex[:8]}"
        self.get_session(email, session_id)
        return session_id

    def list_sessions(self, email):
        user_peer = self.create_peer(email)
        return [s.id for s in user_peer.sessions().items]

    def get_messages(self, email, session_id):
        _, session = self.get_session(email, session_id)
        result = []
        for msg in session.messages().items:
            result.append({
                "role": "assistant" if msg.peer_id == "assistant" else "user",
                "content": msg.content,
            })
        return result

    def chat(self, email, session_id, message):
        user_peer, session = self.get_session(email, session_id)

        session.add_messages([user_peer.message(message)])

        context = session.context(
            tokens=2000,
            peer_target=user_peer.id,
            peer_perspective="assistant",
        )

        honcho_messages = context.to_openai(assistant=self.assistant)
        if not honcho_messages:
            logger.warning("Honcho returned no prompt messages for session %s", session_id)
            honcho_messages = [{"role": "user", "content": message}]

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

        reply = self.llm.invoke(lc_messages).content

        session.add_messages([self.assistant.message(reply)])

        return reply
