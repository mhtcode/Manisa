import os
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import psycopg
from fastapi import FastAPI, HTTPException

app = FastAPI(title="Manisa API", version="0.1.0")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


def database_url() -> str:
    value = os.getenv("DATABASE_URL")
    if not value:
        raise RuntimeError("DATABASE_URL is not configured")
    parsed = urlsplit(value)
    query = urlencode([(key, item) for key, item in parse_qsl(parsed.query) if key != "schema"])
    return urlunsplit(parsed._replace(query=query))


@app.get("/ready")
def readiness() -> dict[str, str]:
    try:
        with psycopg.connect(database_url(), connect_timeout=3) as connection:
            connection.execute("SELECT 1")
    except (RuntimeError, psycopg.Error) as error:
        raise HTTPException(status_code=503, detail="Database is unavailable") from error
    return {"status": "ready", "database": "reachable"}
