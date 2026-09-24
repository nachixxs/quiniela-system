FROM node:24-slim AS frontend
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web/ .
RUN npm run build

FROM python:3.14-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ app/
COPY alembic/ alembic/
COPY alembic.ini .
COPY --from=frontend /web/dist web/dist
RUN useradd --system --uid 10001 app
USER app
ENV PORT=8000
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
