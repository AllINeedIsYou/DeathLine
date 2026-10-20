FROM node:22-bookworm-slim AS frontend
WORKDIR /build
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN npm install --global pnpm@9.15.9 && pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm build

FROM python:3.14-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    SERVE_FRONTEND=true \
    COOKIE_SECURE=true \
    FRONTEND_DIST=/app/frontend/dist
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && useradd --uid 10001 --create-home appuser
COPY --chown=appuser:appuser backend/ ./
COPY --from=frontend --chown=appuser:appuser /build/dist /app/frontend/dist
USER appuser
EXPOSE 10000
CMD ["sh", "-c", "python init_db.py && exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000} --no-access-log"]
