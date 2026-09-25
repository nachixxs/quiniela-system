import type {
  ArqueoOut, ArqueoRequest, CajaEstado, ClienteBusqueda, ClienteDetalle,
  DeudorOut, DiaActualOut, MovimientoCrear, MovimientoOut, MovimientosPagina, Usuario,
} from "./tipos";
import { ApiError } from "./tipos";

async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const res = await fetch(`/api${ruta}`, {
    method: metodo,
    credentials: "same-origin",
    headers: cuerpo !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "error_desconocido", detalle: "Ocurrió un error inesperado." }));
    throw new ApiError(err.error, err.detalle);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export { ApiError };

export const api = {
  login: (usuario: string, password: string) => pedir<void>("POST", "/auth/login", { usuario, password }),
  logout: () => pedir<void>("POST", "/auth/logout"),
  yo: () => pedir<Usuario>("GET", "/auth/yo"),
  diaActual: () => pedir<DiaActualOut>("GET", "/dia/actual"),
  cajas: () => pedir<CajaEstado[]>("GET", "/cajas"),
  clientes: (q: string) => pedir<ClienteBusqueda[]>("GET", `/clientes?q=${encodeURIComponent(q)}`),
  cliente: (id: number) => pedir<ClienteDetalle>("GET", `/clientes/${id}`),
  deudores: (orden: "monto" | "antiguedad") => pedir<DeudorOut[]>("GET", `/clientes/deudores?orden=${orden}`),
  crearMovimiento: (m: MovimientoCrear) => pedir<MovimientoOut>("POST", "/movimientos", m),
  movimientos: (p: { desde: string; hasta: string }) =>
    pedir<MovimientosPagina>("GET", `/movimientos?desde=${p.desde}&hasta=${p.hasta}`),
  anular: (id: number, motivo: string) => pedir<MovimientoOut>("POST", `/movimientos/${id}/anular`, { motivo }),
  arqueo: (a: ArqueoRequest) => pedir<ArqueoOut>("POST", "/arqueo", a),
};
