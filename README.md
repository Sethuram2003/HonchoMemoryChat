# Honcho Memory Chat

A chat application with persistent memory using Honcho, FastAPI backend, and React frontend.

## Architecture

- **Frontend** (React + Vite) — ChatGPT-like UI with login/register and multiple sessions
- **Backend** (FastAPI + uv) — Handles auth, proxies chat to Ollama, stores conversations in Honcho
- **Honcho** (dedicated instance) — Memory backend with Postgres + pgvector + Redis

All three run as separate Docker containers via `docker compose up`.

## Prerequisites

- Docker and Docker Compose
- Ollama running on the host with at least one model installed

```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Pull a model if needed
ollama pull ornith:9b
```

## Quick Start

```bash
docker compose up --build
```

Then open http://localhost:5173

## Services

| Service        | Port | Description                        |
|---------------|------|------------------------------------|
| frontend      | 5173 | React UI                           |
| backend       | 8001 | FastAPI (proxies to Ollama+Honcho) |
| honcho-api    | 8666 | Honcho API (dedicated)             |
| honcho-db     | -    | PostgreSQL with pgvector            |
| honcho-redis  | -    | Redis cache for Honcho            |

## How it works

1. User registers/logs in (backend stores credentials in SQLite)
2. On register, a Honcho peer is created for the user
3. Each chat session creates a Honcho session with the user + assistant peers
4. Messages are stored in Honcho for persistent memory
5. Before each reply, Honcho context is fetched and injected into the Ollama prompt
6. The assistant reply is also stored in Honcho

## Configuration

Edit `honcho/honcho.env` to change Honcho's LLM settings (all point to Ollama by default).
Edit `docker-compose.yml` to change ports or Ollama model.