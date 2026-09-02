# Manisa API

The FastAPI backend for Manisa.

## Run locally

From `apps/api`:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

The liveness endpoint is available at `http://127.0.0.1:8000/health`. Database-aware readiness is available at `http://127.0.0.1:8000/ready` when `DATABASE_URL` is configured.

## Run with Docker

From the repository root, `docker compose up --build api postgres` starts the API and its PostgreSQL dependency. The API listens on `http://localhost:8000`; interactive documentation is available at `/docs`.
