# quiniela-system

[![CI](https://github.com/nachixxs/quiniela-system/actions/workflows/ci.yml/badge.svg)](https://github.com/nachixxs/quiniela-system/actions/workflows/ci.yml)

A cash-register and ledger system for a small lottery agency in Argentina, built to replace
the paper notebooks staff use to track money during the day. All data in this repo
(business names, users, amounts) is fictional.

> **What is a quiniela?** Argentina's state-run numbers lottery. An agency takes bets over the
> counter, sells other lottery games, pays out prizes and lets some regulars buy on credit, so
> a single shift means many small cash movements across more than one cash box.

## What it does

- **One ledger for every cash movement**: bets, other game sales, prize payouts, credit sales
  and repayments, bank payments, wages, expenses and transfers between cash boxes. Movements
  are never edited or deleted; a mistake is voided with a reversing entry that records the reason.
- **Cash counts (arqueos)**: the system computes the expected cash and prize tickets for each
  box and compares them with a physical count. A count that doesn't match is saved with its
  difference; no number is ever adjusted to make it fit.
- **Operating days and shifts**: a day opens with a morning and an evening shift, can't close
  while a shift is still open, and is never reopened. Late entries go in as dated adjustments
  that can explain an earlier count difference.
- **Customer credit**: balances are derived from the ledger (never stored), with a debtor list
  and substring search by name or alias (backed by trigram indexes).
- **Reports**: daily and monthly summaries, count differences, Mercado Pago collections, sales
  per game and prize-ticket settlements.
- **Mobile-first web app** (UI in Spanish), meant to be used on a phone behind the counter.

## Technical highlights

- **Money logic as pure functions**: `app/motor.py` holds the effect of each movement type,
  balances, expected values and count results, with no database access, so it is easy to test.
- **Multi-tenant by design**: every table and query carries `negocio_id`, which always comes
  from the session. A middleware rejects any request that tries to send it.
- **Idempotent writes**: each movement carries a client-generated UUID, unique per business, so
  a retried request from a flaky connection returns the existing movement instead of
  booking it twice. Writes for the same business are serialized with row locks.
- **Session auth**: argon2 password hashing, a random session token in an HttpOnly cookie with only
  its SHA-256 hash stored, a cap on concurrent logins and a 64 KB request body limit.
- **Integer amounts** in pesos, no floats.
- **Typed API contract**: the frontend types are generated from the OpenAPI schema
  (`openapi.json` to `web/src/api/esquema.d.ts`), and FastAPI serves the built React app from
  the same origin, so there is no CORS setup.

## Tech stack

- **Backend**: Python 3.14, FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL 16 (`pg_trgm` for search), pytest
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS 4, TanStack Query
- **Infrastructure**: Docker (multi-stage build), Docker Compose, GitHub Actions

## Project structure

```
app/            FastAPI app: models, domain engine (motor.py), operations, queries, routers
alembic/        database migrations
tests/          engine, operations and HTTP tests
web/            React + TypeScript frontend (screens in web/src/pantallas/)
DESIGN.md       UI design rules (in Spanish)
```

## Getting started

Requirements: Docker with Docker Compose.

```bash
cp .env.example .env                        # fill in the values
docker compose up -d --build                # PostgreSQL on 127.0.0.1:5433, app on 127.0.0.1:8000
docker compose exec api python -m app.seed  # demo business, user "demo", two cash boxes, games
```

The container applies the Alembic migrations on startup. The app is served at
`http://localhost:8000` (log in as `demo` with the `SEED_PASSWORD` from your `.env`), and the
interactive API docs at `http://localhost:8000/api/docs` (disabled in production).

For frontend development with hot reload, keep the API running and start Vite, which proxies
`/api` to port 8000:

```bash
cd web
npm ci
npm run dev        # http://localhost:5173
```

## Tests

A pytest suite, run in CI against PostgreSQL 16 on every push, focused on what can cost money:
the effect of every movement type, reversing entries, expected values and count results,
customer balances, late adjustments, idempotency, tenant isolation, concurrent writes, and a
full simulated day through the HTTP API.

The tests run against a real PostgreSQL database: they apply the migrations first and roll
back each test's transaction. Point `DATABASE_URL` at an empty test database (otherwise
`tests/conftest.py` uses a local default on port 5433).

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt       # Windows: .venv\Scripts\pip
.venv/bin/python -m pytest                      # Windows: .venv\Scripts\python -m pytest
```

CI (`.github/workflows/ci.yml`) runs the test suite against a PostgreSQL 16 service and builds
the frontend on every push.

A Playwright end-to-end suite (`e2e/flujo-critico.spec.ts`, 8 steps) walks a full simulated
day in a real browser: login, opening the day, morning and night shifts with their cash
counts, reports, a customer balance, voiding a movement, and closing the day. It runs locally
against a throwaway database (`cd e2e && npx playwright test`), not in CI.

## Deployment

The repo includes the configuration, not a public instance:

- `render.yaml`: a Render web service built from the `Dockerfile`, with a health check on
  `/api/salud`. The database URL is set outside the repo.
- `.github/workflows/backup.yml`: a daily scheduled job that runs `pg_dump` on the Neon
  PostgreSQL database, encrypts the dump with GPG and uploads it to Backblaze B2 (a bucket
  with Object Lock, 30-day retention). A restore was tested end to end.

## Project status

In active development. The core ledger, cash counts, day and shift flow, customer credit and
reports are implemented and connected to the web app. `POST /api/asistente` is a placeholder
for a future assistant and currently returns 501 Not Implemented.

## License

[MIT](LICENSE)
