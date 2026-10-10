// E2E del flujo crítico de un día completo (SPECS §3, §8), serial. Esperados a mano, por paso (§6).
// Incluye los casos [E2E] de CONTRATO-CP8.md ("contrato N: ..."): rojos hasta que el rediseño los cumpla.
import { test, expect, type Page, type BrowserContext, type Locator } from "@playwright/test";
import { stripVTControlCharacters } from "node:util";
import { SEED_PASSWORD } from "./global-setup";

const remoto = !!process.env.E2E_URL;
let page: Page, context: BrowserContext;
test.describe.configure({ mode: "serial" });
test.beforeAll(async ({ browser }) => {
  context = await browser.newContext({ viewport: { width: 390, height: 844 }, recordVideo: { dir: "test-results" } });
  page = await context.newPage(); });
test.afterAll(async () => { await context.close(); });

const CLIENTE = "Ana Ficticia Montenegro"; // 23 letras: el contrato (caso 5) pide 20 o más
const V360 = { width: 360, height: 780 }, V390 = { width: 390, height: 844 };
const MOTIVO = /falta|completá|ingresá|escribí|elegí|indicá|poné|necesit/i; // lo que se lee bajo un botón bloqueado
const fallas: string[] = [];

// Un caso del contrato que falla se anota con su número (y captura) y el día sigue: en modo serial, un rojo
// saltearía todo lo que viene. El último test junta las fallas.
async function caso(n: number, titulo: string, fn: () => Promise<void>) {
  try { await test.step(`contrato ${n}: ${titulo}`, fn); } catch (e) {
    fallas.push(`contrato ${n}: ${titulo} -> ${stripVTControlCharacters((e as Error).message).split("\n").filter(Boolean).slice(0, 4).join(" | ")}`);
    await page.screenshot({ path: `test-results/contrato-${n}-${fallas.length}.png` });
  }
}
// Cierra la hoja con Escape (pase o falle el caso) y espera a que se vaya; conHoja = abrir, un caso, cerrar.
const cerrarHoja = async () => { await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).toBeHidden(); };
async function conHoja(n: number, titulo: string, abrir: Locator, fn: () => Promise<void>) {
  await abrir.click(); await caso(n, titulo, fn); await cerrarHoja();
}
// Caso 6: con la hoja abierta el foco no sale con Tab; Escape la cierra y el foco vuelve al botón que la abrió.
const trampa = (abrir: Locator) => async () => {
  for (let i = 1; i <= 15; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')), `Tab ${i}: el foco salió de la hoja`).toBe(true);
  }
  await cerrarHoja(); await expect(abrir).toBeFocused();
};
// Caso 7: un solo patrón de confirmación, un toast arriba con el monto (y el cliente) que se va solo.
const toast = (...textos: string[]) => async () => {
  let t = page.getByRole("status").or(page.locator("[data-sonner-toast]")); for (const x of textos) t = t.filter({ hasText: x });
  await expect(t.first()).toBeVisible();
  expect((await t.first().boundingBox())!.y, "la confirmación no está arriba").toBeLessThan(120);
  await expect(t.first()).toBeHidden({ timeout: 10_000 });
};
// Caso 8: el botón deshabilitado trae escrito qué falta.
const bloqueado = (boton: string | RegExp, donde?: Locator) => async () => {
  await expect(page.getByRole("button", { name: boton })).toBeDisabled();
  await expect((donde ?? page.getByRole("dialog")).getByText(MOTIVO).first()).toBeVisible();
};
// Va a una pantalla y espera su título: hasta entonces el contenido de la anterior sigue en el DOM.
const ir = async (enlace: string, titulo = enlace) => { await page.getByRole("link", { name: enlace, exact: true }).click(); await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible(); };
// Caso 5: el nombre se lee entero (puede ir en dos renglones), sin "…" por texto cortado.
const entero = async (l: Locator) => {
  await expect(l.first()).toBeVisible();
  for (const e of await l.all()) {
    expect(await e.evaluate((x) => x.scrollWidth <= x.clientWidth), `${l} está cortado`).toBe(true);
    const b = (await e.boundingBox())!; expect(b.x + b.width).toBeLessThanOrEqual(360);
  }
};

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
  await page.getByLabel("Quiniela", { exact: true }).fill(quinielaAcumulada); // "Quiniela Instantánea" (CP7) también contiene el texto
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
  await page.goto("/");
  await caso(9, "el foco está en Usuario al abrir el login", () => expect(page.getByLabel("Usuario")).toBeFocused());
  await page.getByLabel("Usuario").fill(remoto ? process.env.E2E_USUARIO! : "demo");
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
  const rendicion = page.getByRole("button", { name: /Rendición/ });
  await expect(rendicion).toBeVisible();
  await caso(11, "Inicio a 360 px muestra ticket, arqueos y rendición sin scrollear", async () => {
    await page.setViewportSize(V360); await page.evaluate(() => scrollTo(0, 0));
    const barra = await page.getByRole("navigation", { name: "Principal" }).boundingBox(); const tope = barra && barra.y > 390 ? barra.y : V360.height;
    for (const l of [page.getByRole("button", { name: /Turno mañana/ }), page.getByRole("link", { name: /Arqueo.*grande/i }), rendicion]) {
      await expect(l).toBeVisible(); const b = (await l.boundingBox())!; expect(b.y + b.height, `${l} queda bajo el pliegue`).toBeLessThanOrEqual(tope);
    }
  });
  await page.setViewportSize(V390);
  await caso(14, "mientras carga no se ve '–' como valor", async () => {
    const lento = /\/api\/(dia\/actual|cajas|clientes\/deudores)/; // sin datos todavía: esqueleto, no una raya
    await page.route(lento, async (r) => { await new Promise((ok) => setTimeout(ok, 1500)); await r.continue(); });
    try { await page.reload(); await expect(page.getByRole("heading", { name: /^Hola,/ })).toBeVisible(); expect(await page.getByText(/^[–—]$/).count(), "hay una raya donde va un valor").toBe(0); }
    finally { await page.unrouteAll({ behavior: "wait" }); }
  });
  await expect(rendicion).toBeVisible();
  await caso(14, "la lista vacía de Fiados dice qué pasa y trae su acción", async () => {
    await ir("Fiados", "Cuenta corriente");
    const main = page.getByRole("main");
    await expect(main).toContainText(/sin cuentas|nadie debe|no hay/i);
    await expect(main.getByRole("button").or(main.getByRole("link"))).not.toHaveCount(0);
  });
  await page.getByRole("link", { name: "Inicio", exact: true }).click();
  await conHoja(8, "Rendición: el botón bloqueado dice qué falta", rendicion, bloqueado("Guardar rendición"));
  await rendicion.click();
  await page.getByLabel("Boletas contadas").fill("0");
  await page.getByRole("button", { name: "Guardar rendición" }).click(); await page.getByRole("button", { name: "Listo" }).click();
  await page.getByRole("link", { name: "Cargar", exact: true }).click();
  await cargar("Cobro", "100000", "Lo trae el dueño");

  await page.getByRole("link", { name: "Arqueo", exact: true }).click();
  const turnoMarcado = (t: RegExp) => page.getByRole("radio", { name: t, checked: true });
  await caso(1, "al elegir Caja grande el turno marcado es mañana; sin caja, ninguno", async () => {
    await expect(page.getByLabel("Efectivo contado")).toBeVisible(); // pantalla lista antes de contar
    await expect(turnoMarcado(/^(Mañana|Noche)/)).toHaveCount(0);
    await page.locator("label", { hasText: "Caja grande" }).click();
    await expect(turnoMarcado(/^Mañana/)).toBeVisible();
  });
  await caso(8, "Arqueo: el botón bloqueado dice qué falta", bloqueado("Arquear", page.getByRole("main")));
  await arquear("Caja grande", "Mañana", "100000", "0");
});

test("carga la mañana en carga rápida y cierra el turno con su arqueo", async () => {
  await page.getByRole("link", { name: "Cargar", exact: true }).click();
  await conHoja(8, "Cobro de subagente: el botón bloqueado dice qué falta", page.getByRole("button", { name: /^Cobro/ }), async () => {
    await page.getByRole("dialog").getByText("Subagente", { exact: true }).click(); await bloqueado(/^Guardar/)(); });
  await fiar("4000", CLIENTE, true);
  await cargar("Premio", "3000");
  await caso(7, "guardar un movimiento avisa con un toast con el monto", toast("$3.000"));
  const pago = page.getByRole("button", { name: /^Pago/ });
  await conHoja(6, "Carga: el foco no sale de la hoja", pago, trampa(pago));
  await cargar("Pago", "2000", "Gasto");
  await cargar("Pago", "5000", "MP / transferencia");
  await page.getByRole("link", { name: "Inicio", exact: true }).click();
  // Chica sin ticket y con -14.000 de movimientos: el traspaso no puede mostrar ese efectivo parcial (D27).
  const traspaso = page.getByRole("button", { name: /Traspaso a la caja grande/ }), ticket = page.getByRole("button", { name: /Turno mañana/ });
  await conHoja(2, "el traspaso con la chica sin ticket no muestra efectivo parcial ni negativo", traspaso, async () => {
    await page.waitForLoadState("networkidle"); const d = page.getByRole("dialog");
    await expect(d).not.toContainText(/-\s*\$/); await expect(d).not.toContainText(/\$\s?[\d.]+\s+en efectivo/);
  });
  await conHoja(8, "Traspaso: el botón bloqueado dice qué falta", traspaso, bloqueado("Confirmar traspaso"));
  await conHoja(8, "Ticket: el botón bloqueado dice qué falta", ticket, bloqueado("Guardar ticket"));
  await conHoja(6, "Ticket: el foco no sale de la hoja", ticket, trampa(ticket));
  await cargarTicket("mañana", "20000");
  // Chica desde cero: -4.000-3.000-2.000-5.000+20.000 = 6.000 efectivo · 3.000 boletas (la del premio).
  await arquear("Caja chica", "Mañana", "6000", "3000");
});

test("traspasa la mañana, carga la noche y cierra su turno con arqueo", async () => {
  await page.getByRole("link", { name: "Inicio", exact: true }).click();
  await page.getByRole("button", { name: /Traspaso a la caja grande/ }).click();
  await page.getByRole("button", { name: "Confirmar traspaso" }).click(); await page.getByRole("button", { name: "Listo" }).click();

  await page.getByRole("link", { name: "Cargar", exact: true }).click();
  await fiar("1000", CLIENTE, false);
  await cargar("Premio", "2000");
  // Cobro de 500 del fiado desde la cuenta corriente: entra a la chica de la noche.
  await page.getByRole("link", { name: "Fiados", exact: true }).click();
  await page.getByRole("button", { name: new RegExp(CLIENTE) }).click();
  await page.getByLabel("Cobrar", { exact: true }).fill("500");
  await page.getByRole("dialog").getByRole("button", { name: "Cobrar", exact: true }).click();
  await caso(7, "cobrar un fiado avisa con un toast con monto y cliente", toast("$500", CLIENTE));
  await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByRole("link", { name: "Inicio", exact: true }).click();
  await cargarTicket("noche", "30000");
  // Chica desde cero: -1.000-2.000+500+10.000 (quiniela: 30.000-20.000) = 7.500 efectivo · 2.000 boletas.
  await arquear("Caja chica", "Noche", "7500", "2000");
});

test("traspasa la noche y arquea la caja grande de la noche", async () => {
  await page.getByRole("link", { name: "Inicio", exact: true }).click();
  await page.getByRole("button", { name: /Traspaso a la caja grande/ }).click();
  await page.getByRole("button", { name: "Confirmar traspaso" }).click(); await page.getByRole("button", { name: "Listo" }).click();
  // Grande: 100.000 + 6.000 + 7.500 = 113.500 efectivo · 3.000 + 2.000 = 5.000 boletas (los dos traspasos).
  await arquear("Caja grande", "Noche", "113500", "5000");
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

  // Caso 12 en Reportes solo guarda la regla: con los 4 arqueos cuadrados no hay una hora en pantalla.
  await caso(12, "Reportes no muestra horas de 12 h", () => expect(page.getByRole("main")).not.toContainText(/[ap]\.\s?m\./i));
  await caso(13, "cada total dice cuál es Este mes y cuál Mes anterior", async () => {
    await expect(page.getByText("Este mes", { exact: true }).first()).toBeVisible(); await expect(page.getByText("Mes anterior", { exact: true }).first()).toBeVisible();
  });
  const grafico = page.locator("section").filter({ has: page.getByRole("heading", { name: /ventas por día/i }) });
  await caso(13, "el gráfico tiene eje con montos legibles", async () => {
    await expect(grafico).toBeVisible(); const ejes = grafico.getByText(/^\$\s?[\d.,]+(\s?(mil|M|k))?$/).filter({ visible: true });
    expect(await ejes.count(), "marcas de monto en el eje").toBeGreaterThanOrEqual(2);
  });
  await caso(13, "el detalle por día se ve sin pasar el mouse", () => expect(page.getByText(/ver por día/i).or(grafico.getByRole("table")).first()).toBeVisible());
  await caso(13, "el mes siguiente no deja pasar del mes actual", () => expect(page.getByRole("button", { name: /mes siguiente/i })).toBeDisabled());
});

test("cuenta corriente muestra el saldo del cliente", async () => {
  await ir("Fiados", "Cuenta corriente");
  await caso(5, "Cuenta corriente a 360 px muestra el nombre entero", async () => {
    await page.setViewportSize(V360); await entero(page.getByRole("main").getByText(CLIENTE));
  });
  await page.setViewportSize(V390);
  await page.getByRole("button", { name: new RegExp(CLIENTE) }).click();
  // Debe 4.000 (mañana) + 1.000 (noche) - 500 (cobro) = 4.500.
  await expect(page.getByRole("dialog").getByText("$4.500", { exact: true }).first()).toBeVisible();
  await page.keyboard.press("Escape"); // si queda abierta, bloquea el próximo paso
});

test("anula un movimiento desde la app y el saldo del cliente vuelve", async () => {
  await page.getByRole("link", { name: "Inicio", exact: true }).click();
  const fila = page.locator("li", { hasText: "Fiado" }).filter({ hasText: "$1.000" });
  const anular = fila.getByRole("button", { name: "Anular" }), dialogo = page.getByRole("dialog");
  await caso(12, "Movimientos muestra la hora en 24 h", async () => {
    await expect(page.getByRole("main")).toContainText(/\d{2}:\d{2}/); await expect(page.getByRole("main")).not.toContainText(/[ap]\.\s?m\./i);
  });
  await conHoja(6, "Anular: el foco no sale de la hoja", anular, trampa(anular));
  await page.setViewportSize(V360);
  await anular.click();
  await caso(3, "el diálogo nombra al cliente y el monto", async () => { await expect(dialogo).toContainText(CLIENTE); await expect(dialogo).toContainText("$1.000"); });
  await caso(3, "el campo Motivo tiene el foco", () => expect(page.getByLabel("Motivo")).toBeFocused());
  await caso(3, "tiene los botones Anular movimiento y Cancelar", async () => {
    await expect(dialogo.getByRole("button", { name: "Anular movimiento" })).toBeVisible(); await expect(dialogo.getByRole("button", { name: "Cancelar" })).toBeVisible();
  });
  await caso(3, "Cancelar cierra sin anular nada", async () => {
    await dialogo.getByRole("button", { name: "Cancelar" }).click({ timeout: 5000 }); await expect(dialogo).toBeHidden();
    await expect(page.getByText("Anulado", { exact: true })).toHaveCount(0);
  });
  await cerrarHoja();
  await conHoja(5, "Anular a 360 px muestra el nombre entero", anular, () => entero(dialogo.getByText(CLIENTE)));
  await page.setViewportSize(V390);
  await anular.click();
  await page.getByLabel("Motivo").fill("Cliente ficticio: se anota por error en el E2E.");
  await dialogo.getByRole("button", { name: /^Anular( movimiento)?$/ }).click();
  await expect(dialogo).toBeHidden();
  await caso(7, "anular avisa con un toast con monto y cliente", toast("$1.000", CLIENTE));

  await page.getByRole("link", { name: "Fiados", exact: true }).click();
  await page.getByRole("button", { name: new RegExp(CLIENTE) }).click();
  // Vuelve a 3.500: el fiado de la noche quedó anulado.
  await expect(dialogo.getByText("$3.500", { exact: true }).first()).toBeVisible();
  await page.keyboard.press("Escape");
});

test("cierra el día", async () => {
  await page.getByRole("link", { name: "Inicio", exact: true }).click();
  const cerrar = page.getByRole("button", { name: "Cerrar el día" });
  await cerrar.click(); const d = page.getByRole("dialog");
  await caso(4, "el diálogo dice qué pasa y no muestra referencias internas (§)", async () => { await expect(d).toContainText(/reabr|cerrad/i); await expect(d).not.toContainText("§"); });
  await caso(4, "tiene los botones Cerrar el día y Cancelar", async () => {
    await expect(d.getByRole("button", { name: "Cerrar el día" })).toBeVisible(); await expect(d.getByRole("button", { name: "Cancelar" })).toBeVisible();
  });
  await caso(4, "Cancelar cierra sin cerrar el día", async () => { await d.getByRole("button", { name: "Cancelar" }).click({ timeout: 5000 }); await expect(d).toBeHidden(); });
  await cerrarHoja();
  await cerrar.click();
  await page.getByRole("dialog").getByRole("button", { name: "Cerrar el día" }).click();
  await expect(page.getByRole("button", { name: "Abrir el día siguiente" })).toBeVisible();
  await caso(14, "Arqueo con el día cerrado dice qué pasa y ofrece abrir el siguiente", async () => {
    await ir("Arqueo"); const main = page.getByRole("main");
    await expect(main).toContainText(/cerrad/i);
    await expect(main.getByRole("button", { name: /abrir el día/i }).or(main.getByRole("link", { name: /abrir el día/i }))).toBeVisible();
  });
});

test("contrato CP8: todos los casos pasan", () => {
  expect(fallas, `Casos del contrato que fallan:\n${fallas.join("\n")}`).toEqual([]);
});
