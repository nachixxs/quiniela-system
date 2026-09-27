// E2E del flujo crítico de un día completo (SPECS §3, §8), serial. Esperados a mano, por paso (§6).
import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { SEED_PASSWORD } from "./global-setup";

const remoto = !!process.env.E2E_URL;
let page: Page, context: BrowserContext;
test.describe.configure({ mode: "serial" });
test.beforeAll(async ({ browser }) => {
  context = await browser.newContext({ viewport: { width: 390, height: 844 }, recordVideo: { dir: "test-results" } });
  page = await context.newPage(); });
test.afterAll(async () => { await context.close(); });

async function cargar(boton: string, monto: string, opcion?: string) {
  await page.getByRole("button", { name: new RegExp(`^${boton}`) }).click();
  if (opcion) await page.locator("label", { hasText: opcion }).click();
  await page.getByLabel("Monto").fill(monto); await page.getByRole("button", { name: /^Guardar/ }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
}

// Fiado con cliente: busca y, si no existe, lo crea en el mismo paso (D-sin ella, base vacía).
async function fiar(monto: string, cliente: string, nuevo: boolean) {
  await page.getByRole("button", { name: /^Fiado/ }).click();
  await page.getByLabel("Monto").fill(monto); await page.getByPlaceholder("Buscar por nombre…").fill(cliente);
  if (nuevo) await page.getByRole("button", { name: new RegExp(`Nuevo cliente.*${cliente}`) }).click();
  else await page.getByRole("button", { name: new RegExp(`^${cliente}`) }).click();
  await page.getByRole("button", { name: /^Guardar/ }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
}

// Ticket de la terminal (§8.2), acumulado del día (D17): el total de quiniela hasta ese turno.
async function cargarTicket(turno: string, quinielaAcumulada: string) {
  await page.getByRole("button", { name: new RegExp(`Turno ${turno}`) }).click();
  await page.getByLabel("Quiniela").fill(quinielaAcumulada);
  await page.getByRole("button", { name: "Guardar ticket" }).click(); await page.getByRole("button", { name: "Listo" }).click();
}

// Arqueo (§6, §8.3): dos campos, resultado inmediato.
async function arquear(caja: string, turno: string, efectivo: string, boletas: string) {
  await page.getByRole("link", { name: "Arqueo", exact: true }).click();
  await page.locator("label", { hasText: caja }).click();
  await page.getByRole("radio", { name: new RegExp(`^${turno}`) }).check();
  await page.getByLabel("Efectivo contado").fill(efectivo); await page.getByLabel("Boletas contadas").fill(boletas);
  await page.getByRole("button", { name: "Arquear" }).click();
  await expect(page.getByText("Cuadra", { exact: true })).toBeVisible();
}

test("login, abre el día y arquea la caja grande de la mañana", async () => {
  await page.goto("/"); await page.getByLabel("Usuario").fill(remoto ? process.env.E2E_USUARIO! : "demo");
  await page.getByLabel("Contraseña").fill(remoto ? process.env.E2E_PASSWORD! : SEED_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: /^Hola,/ })).toBeVisible();

  // D48: en remoto, antes del primer POST verificamos el negocio de prueba; si no, se aborta.
  if (remoto) {
    const yo = await (await page.request.get("/api/auth/yo")).json();
    if (yo.negocio?.nombre !== "Agencia E2E") throw new Error(`Negocio inesperado ("${yo.negocio?.nombre}")`);
  }

  // Primer día: sin boletas de ayer (§5.3), rendición en cero. D45: "Lo trae el dueño" antes del
  // primer arqueo, para que cuadre. Esperado grande: 0 (partida) + 100.000 (ingreso) = 100.000.
  await page.getByRole("button", { name: "Abrir el día" }).click();
  await page.getByRole("button", { name: /Rendición/ }).click();
  await page.getByLabel("Boletas contadas").fill("0");
  await page.getByRole("button", { name: "Guardar rendición" }).click(); await page.getByRole("button", { name: "Listo" }).click();
  await page.getByRole("link", { name: "Cargar", exact: true }).click();
  await cargar("Cobro", "100000", "Lo trae el dueño");
  await arquear("Caja grande", "Mañana", "100000", "0");
});

test("carga la mañana en carga rápida y cierra el turno con su arqueo", async () => {
  await page.getByRole("link", { name: "Cargar", exact: true }).click();
  await fiar("4000", "Ana Ficticia", true);
  await cargar("Premio", "3000");
  await cargar("Pago", "2000", "Gasto");
  await cargar("Pago", "5000", "MP / transferencia");
  await page.getByRole("link", { name: "Inicio", exact: true }).click();
  await cargarTicket("mañana", "20000");
  // Chica desde cero: -4.000-3.000-2.000-5.000+20.000 = 6.000 efectivo · 3.000 boletas (la del premio).
  await arquear("Caja chica", "Mañana", "6000", "3000");
});

test("traspasa la mañana, carga la noche y cierra su turno con arqueo", async () => {
  await page.getByRole("link", { name: "Inicio", exact: true }).click();
  await page.getByRole("button", { name: /Traspaso a la caja grande/ }).click();
  await page.getByRole("button", { name: "Confirmar traspaso" }).click(); await page.getByRole("button", { name: "Listo" }).click();

  await page.getByRole("link", { name: "Cargar", exact: true }).click();
  await fiar("1000", "Ana Ficticia", false);
  await cargar("Premio", "2000");
  await page.getByRole("link", { name: "Inicio", exact: true }).click();
  await cargarTicket("noche", "30000");
  // Chica desde cero: -1.000-2.000+10.000 (quiniela: 30.000-20.000) = 7.000 efectivo · 2.000 boletas.
  await arquear("Caja chica", "Noche", "7000", "2000");
});

test("traspasa la noche y arquea la caja grande de la noche", async () => {
  await page.getByRole("link", { name: "Inicio", exact: true }).click();
  await page.getByRole("button", { name: /Traspaso a la caja grande/ }).click();
  await page.getByRole("button", { name: "Confirmar traspaso" }).click(); await page.getByRole("button", { name: "Listo" }).click();
  // Grande: 100.000 + 6.000 + 7.000 = 113.000 efectivo · 3.000 + 2.000 = 5.000 boletas (los dos traspasos).
  await arquear("Caja grande", "Noche", "113000", "5000");
});

test("reportes muestra los totales esperados del día", async () => {
  await page.getByRole("link", { name: "Reportes", exact: true }).click();
  const cierreDia = page.locator("section", { hasText: "Cierre del día" });
  const fila = (etiqueta: string) => cierreDia.locator("li", { hasText: etiqueta });
  // Ventas: 20.000 + 10.000 · Premios: 3.000 + 2.000 · Arqueos: los 4 cuadran · MP: el único cobro del día.
  await expect(fila("Ventas").getByText("$30.000", { exact: true })).toBeVisible();
  await expect(fila("Premios pagados").getByText("$5.000", { exact: true })).toBeVisible();
  await expect(fila("Lo trae el dueño").getByText("$100.000", { exact: true })).toBeVisible();
  await expect(fila("Arqueos: cuadran / no cuadran")).toContainText("4 / 0");
  const mp = page.locator("section", { hasText: "Mercado Pago acumulado" }); await expect(mp.getByText("$5.000", { exact: true })).toBeVisible();
});

test("cuenta corriente muestra el saldo del cliente", async () => {
  await page.getByRole("link", { name: "Fiados", exact: true }).click();
  await page.getByRole("button", { name: /Ana Ficticia/ }).click();
  // Debe 4.000 (mañana) + 1.000 (noche) = 5.000.
  await expect(page.getByRole("dialog").getByText("$5.000", { exact: true }).first()).toBeVisible();
  await page.keyboard.press("Escape"); // si queda abierta, bloquea el próximo paso
});

test("anula un movimiento desde la app y el saldo del cliente vuelve", async () => {
  await page.getByRole("link", { name: "Inicio", exact: true }).click();
  const fila = page.locator("li", { hasText: "Fiado" }).filter({ hasText: "$1.000" });
  await fila.getByRole("button", { name: "Anular" }).click();
  await page.getByLabel("Motivo").fill("Cliente ficticio: se anota por error en el E2E.");
  await page.getByRole("dialog").getByRole("button", { name: "Anular", exact: true }).click();
  await expect(page.getByText("Movimiento anulado.")).toBeVisible();

  await page.getByRole("link", { name: "Fiados", exact: true }).click();
  await page.getByRole("button", { name: /Ana Ficticia/ }).click();
  // Vuelve a 4.000: el fiado de la noche quedó anulado.
  await expect(page.getByRole("dialog").getByText("$4.000", { exact: true }).first()).toBeVisible();
  await page.keyboard.press("Escape");
});

test("cierra el día", async () => {
  await page.getByRole("link", { name: "Inicio", exact: true }).click();
  await page.getByRole("button", { name: "Cerrar el día" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cerrar el día" }).click();
  await expect(page.getByRole("button", { name: "Abrir el día siguiente" })).toBeVisible();
});
