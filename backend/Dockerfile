# Build context: the repository root (the backend serves contract/openapi-rest.yml).
FROM python:3.13.9-slim-bookworm

COPY --from=ghcr.io/astral-sh/uv:0.13.0 /uv /usr/local/bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

WORKDIR /app/backend

# Dependencies first: this layer is reused while only the code changes.
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --locked --no-dev --no-install-project

COPY backend/src ./src
COPY contract /app/contract
RUN uv sync --locked --no-dev

RUN useradd --create-home --uid 1000 app && mkdir /data && chown app /data
USER app

# Tickets persist in a SQLite file on a volume (seeded on the first start).
ENV MINI_TICKETS_DATABASE=/data/tickets.db
VOLUME ["/data"]
EXPOSE 8000

HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=10 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/openapi.json')"]

CMD ["uvicorn", "tickets.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
