# quiniela-system

Sistema de cajas para una agencia de quiniela: un libro único de movimientos, cuatro arqueos
y reportes calculados, en lugar de siete cuadernos. Todos los datos del repo son ficticios.

Stack: FastAPI + SQLAlchemy 2.0 + Alembic + PostgreSQL 16, React + TypeScript + Vite,
Docker Compose para desarrollo local. Producción: Render + Neon, con backup diario a Backblaze B2.

## Levantarlo

```powershell
Copy-Item .env.example .env        # completar los valores
docker compose up -d --build
docker compose exec api alembic upgrade head
docker compose exec api python -m app.seed
```

La documentación de la API queda en `http://localhost:8000/api/docs` (apagada en producción).

## Tests

```powershell
py -3.14 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m pytest
```
