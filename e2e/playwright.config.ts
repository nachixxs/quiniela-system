import { defineConfig } from "@playwright/test";
import { DB_URL, SEED_PASSWORD, RAIZ, PYTHON } from "./global-setup";

// Local (default): resetea `quiniela_e2e` y levanta la API en :8001 contra el build de `web/dist`.
// Remoto (E2E_URL): no resetea nada, corre contra esa URL con E2E_USUARIO / E2E_PASSWORD (5.5).
const remoto = !!process.env.E2E_URL;

export default defineConfig({
  reporter: remoto ? "list" : "html", // "html" en remoto puede filtrar E2E_PASSWORD en el título del paso `fill`
  use: {
    baseURL: process.env.E2E_URL ?? "http://127.0.0.1:8001",
    video: "on", screenshot: "on",
    trace: "off", // guarda el login con la contraseña y la cookie en claro (auditoría)
  },
  globalSetup: remoto ? undefined : "./global-setup.ts",
  webServer: remoto ? undefined : {
    command: `"${PYTHON}" -m uvicorn app.main:app --port 8001`,
    cwd: RAIZ, url: "http://127.0.0.1:8001/api/salud", reuseExistingServer: false,
    timeout: 30_000, env: { DATABASE_URL: DB_URL, SEED_PASSWORD },
  },
});
