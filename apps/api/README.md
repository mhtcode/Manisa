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

The health endpoint is available at `http://127.0.0.1:8000/health`.
