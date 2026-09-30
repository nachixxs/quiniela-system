import type {
  ArqueoOut, AsistenteOut, AsistenteRequest, ArqueoRequest, CajaEstado, ClienteBusqueda, ClienteCrear, ClienteDetalle,
  DeudorOut, DiaActualOut, DiaConTurnos, DiferenciaItem, JuegoOut, MovimientoCrear, MovimientoOut, MovimientosPagina,
  RendicionItem, RendicionOut, RendicionRequest, ReporteDia, ReporteMercadoPago, ReporteMes, Saldo, TicketOut, TicketRequest,
  TraspasoRequest, Usuario,
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
    throw new ApiError(err.error, err.detalle, res.status);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export { ApiError };

export const api = {
  login: (usuario: string, password: string) => pedir<void>("POST", "/auth/login", { usuario, password }),
  reportesMes: (mes: string) => pedir<ReporteMes>("GET", `/reportes/mes/${mes}`),
  reportesDia: (fecha: string) => pedir<ReporteDia>("GET", `/reportes/dia/${fecha}`),
  reportesMercadoPago: () => pedir<ReporteMercadoPago>("GET", "/reportes/mercado-pago"),
  reportesDiferencias: (p: { desde: string; hasta: string }) =>
    pedir<DiferenciaItem[]>("GET", `/reportes/diferencias?desde=${p.desde}&hasta=${p.hasta}`),
  reportesRendiciones: (p: { desde: string; hasta: string }) =>
    pedir<RendicionItem[]>("GET", `/reportes/rendiciones?desde=${p.desde}&hasta=${p.hasta}`),
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
  abrirDia: () => pedir<DiaConTurnos>("POST", "/dia/abrir"),
  cerrarDia: (id: number) => pedir<void>("POST", `/dia/${id}/cerrar`),
  juegos: () => pedir<JuegoOut[]>("GET", "/juegos"),
  cargarTicket: (turnoId: number, t: TicketRequest) => pedir<TicketOut>("POST", `/turno/${turnoId}/ticket`, t),
  traspaso: (t: TraspasoRequest) => pedir<Saldo>("POST", "/traspaso", t),
  rendicion: (r: RendicionRequest) => pedir<RendicionOut>("POST", "/rendicion", r),
  crearCliente: (c: ClienteCrear) => pedir<ClienteBusqueda>("POST", "/clientes", c),
  asistente: (p: AsistenteRequest) => pedir<AsistenteOut>("POST", "/asistente", p),
};
