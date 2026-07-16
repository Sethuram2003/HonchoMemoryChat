import os

DB_PATH = os.getenv("DB_PATH", "/data/users.db")
HONCHO_URL = os.getenv("HONCHO_URL", "http://honcho-api:8000")
WORKSPACE_ID = os.getenv("HONCHO_WORKSPACE", "honcho-memory-chat")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://host.docker.internal:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")