import { execFileSync } from "node:child_process";
import path from "node:path"; import { fileURLToPath } from "node:url";

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PYTHON = path.join(RAIZ, ".venv", "Scripts", "python.exe");
export const DB_URL = "postgresql+psycopg://quiniela_test:quiniela_test@127.0.0.1:5433/quiniela_e2e";
export const SEED_PASSWORD = "quiniela-e2e-2026-ficticia";

function correr(args: string[], extraEnv: Record<string, string> = {}) {
  execFileSync(PYTHON, args, { cwd: RAIZ, stdio: "inherit", env: { ...process.env, ...extraEnv } });
}

export default async function globalSetup() {
  const url = DB_URL.replace("postgresql+psycopg://", "postgresql://");
  const sql = `import psycopg
c = psycopg.connect("${url}", autocommit=True)
c.execute("DROP SCHEMA public CASCADE"); c.execute("CREATE SCHEMA public")`;
  correr(["-c", sql]);
  correr(["-m", "alembic", "upgrade", "head"], { DATABASE_URL: DB_URL });
  correr(["-m", "app.seed"], { DATABASE_URL: DB_URL, SEED_PASSWORD });
}
