import path from "node:path"; import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";
import { DB_URL, SEED_PASSWORD } from "./global-setup";

// Local (default): resetea `quiniela_e2e` y levanta la API en :8001 contra el build de `web/dist`.
// Remoto (E2E_URL): no resetea nada, corre contra esa URL con E2E_USUARIO / E2E_PASSWORD (5.5).
const remoto = !!process.env.E2E_URL;
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const python = path.join(raiz, ".venv", "Scripts", "python.exe");

export default defineConfig({
  testDir: ".",
  testMatch: "flujo-critico.spec.ts",
  fullyParallel: false,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: process.env.E2E_URL ?? "http://127.0.0.1:8001",
    video: "on", screenshot: "on",
    trace: "off", // guarda el login con la contraseña y la cookie en claro (auditoría)
    viewport: { width: 390, height: 844 }, browserName: "chromium",
  },
  globalSetup: remoto ? undefined : "./global-setup.ts",
  webServer: remoto ? undefined : {
    command: `"${python}" -m uvicorn app.main:app --port 8001`,
    cwd: raiz, url: "http://127.0.0.1:8001/api/salud", reuseExistingServer: false,
    timeout: 30_000, env: { DATABASE_URL: DB_URL, SEED_PASSWORD },
  },
});
