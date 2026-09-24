import type {
  ArqueoOut,
  ArqueoRequest,
  CajaEstado,
  ClienteBusqueda,
  ClienteDetalle,
  DeudorOut,
  DiaActualOut,
  MovimientoCrear,
  MovimientoOut,
  Usuario,
} from "./tipos";
import {
  cajasMock,
  clientesDetalleMock,
  clientesMock,
  deudoresMock,
  diaActualMock,
  usuarioMock,
} from "./datos-mock";

const USA_MOCK = import.meta.env.VITE_MOCK === "1";

export class ApiError extends Error {
  constructor(public codigo: string, public detalle: string) {
    super(detalle);
  }
}

async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  if (USA_MOCK) return pedirMock<T>(metodo, ruta, cuerpo);

  const res = await fetch(`/api${ruta}`, {
    method: metodo,
    credentials: "same-origin",
    headers: cuerpo !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: "error_desconocido", detalle: "Ocurrió un error inesperado." }));
    throw new ApiError(err.error, err.detalle);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function esperar<T>(valor: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), 150));
}

async function pedirMock<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const [path, query] = ruta.split("?");

  if (metodo === "POST" && path === "/auth/login") {
    const { usuario, password } = cuerpo as { usuario: string; password: string };
    if (usuario === "marisa" && password === "estrella123") return esperar(undefined as T);
    throw new ApiError("credenciales_invalidas", "Usuario o contraseña incorrectos.");
  }
  if (metodo === "POST" && path === "/auth/logout") return esperar(undefined as T);
  if (metodo === "GET" && path === "/auth/yo") return esperar(usuarioMock as T);
  if (metodo === "GET" && path === "/dia/actual") return esperar(diaActualMock as T);
  if (metodo === "GET" && path === "/cajas") return esperar(cajasMock as T);
  if (metodo === "GET" && path === "/clientes/deudores") return esperar(deudoresMock as T);
  if (metodo === "GET" && path === "/clientes") {
    const q = (new URLSearchParams(query).get("q") ?? "").toLowerCase();
    return esperar(clientesMock.filter((c) => c.nombre.toLowerCase().includes(q)) as T);
  }
  if (metodo === "GET" && path.startsWith("/clientes/")) {
    const id = Number(path.split("/")[2]);
    const detalle = clientesDetalleMock[id];
    if (!detalle) throw new ApiError("no_encontrado", "Cliente no encontrado.");
    return esperar(detalle as T);
  }
  if (metodo === "POST" && path === "/movimientos") {
    const m = cuerpo as MovimientoCrear;
    return esperar({
      id: 999, ...m, turno_id: 2, juego_id: null, creado_en: new Date().toISOString(),
      corresponde_a_fecha: m.corresponde_a_fecha ?? "2026-09-23", es_ajuste: !!m.corresponde_a_fecha,
      anula_id: null, motivo_anulacion: null,
    } as T);
  }
  if (metodo === "POST" && path === "/arqueo") {
    const a = cuerpo as ArqueoRequest;
    return esperar({
      id: 47, efectivo_esperado: a.efectivo_contado, boletas_esperadas: a.boletas_contadas,
      diferencia_efectivo: 0, diferencia_boletas: 0, estado: "cuadra",
    } as T);
  }
  throw new ApiError("no_mockeado", `Sin mock para ${metodo} ${path}`);
}

export const api = {
  login: (usuario: string, password: string) => pedir<void>("POST", "/auth/login", { usuario, password }),
  logout: () => pedir<void>("POST", "/auth/logout"),
  yo: () => pedir<Usuario>("GET", "/auth/yo"),
  diaActual: () => pedir<DiaActualOut>("GET", "/dia/actual"),
  cajas: () => pedir<CajaEstado[]>("GET", "/cajas"),
  clientes: (q: string) => pedir<ClienteBusqueda[]>("GET", `/clientes?q=${encodeURIComponent(q)}`),
  cliente: (id: number) => pedir<ClienteDetalle>("GET", `/clientes/${id}`),
  deudores: () => pedir<DeudorOut[]>("GET", "/clientes/deudores"),
  crearMovimiento: (m: MovimientoCrear) => pedir<MovimientoOut>("POST", "/movimientos", m),
  arqueo: (a: ArqueoRequest) => pedir<ArqueoOut>("POST", "/arqueo", a),
};
