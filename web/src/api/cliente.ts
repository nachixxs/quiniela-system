import type {
  ArqueoOut, ArqueoRequest, CajaEstado, ClienteBusqueda, ClienteDetalle,
  DeudorOut, DiaActualOut, MovimientoCrear, MovimientoOut, Usuario,
} from "./tipos";
import { ApiError } from "./tipos";
import { RUTAS_MOCK, clientesDetalleMock, clientesMock, deudoresMock } from "./datos-mock";

const USA_MOCK = import.meta.env.VITE_MOCK === "1";

async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  if (USA_MOCK) return pedirMock<T>(metodo, ruta, cuerpo);
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

async function pedirMock<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  // Latencia simulada para ver los estados de carga; sessionStorage "mock_demora" la cambia.
  await new Promise((r) => setTimeout(r, Number(sessionStorage.getItem("mock_demora") ?? 250)));
  const [path, query] = ruta.split("?");
  if (metodo === "GET" && path === "/clientes/deudores") {
    const orden = new URLSearchParams(query).get("orden");
    const datos = [...deudoresMock].sort((a, b) =>
      orden === "antiguedad" ? b.dias_deuda_mas_vieja - a.dias_deuda_mas_vieja : b.saldo - a.saldo,
    );
    return datos as T;
  }
  if (metodo === "GET" && path === "/clientes") {
    const q = (new URLSearchParams(query).get("q") ?? "").toLowerCase();
    return clientesMock.filter((c) => c.nombre.toLowerCase().includes(q)) as T;
  }
  if (metodo === "GET" && path.startsWith("/clientes/")) {
    const detalle = clientesDetalleMock[Number(path.split("/")[2])];
    if (!detalle) throw new ApiError("no_encontrado", "Cliente no encontrado.");
    return detalle as T;
  }
  const manejador = RUTAS_MOCK[`${metodo} ${path}`];
  if (!manejador) throw new ApiError("no_mockeado", `Sin mock para ${metodo} ${path}`);
  return manejador(cuerpo) as T;
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
  deudores: (orden: "monto" | "antiguedad" = "monto") => pedir<DeudorOut[]>("GET", `/clientes/deudores?orden=${orden}`),
  crearMovimiento: (m: MovimientoCrear) => pedir<MovimientoOut>("POST", "/movimientos", m),
  arqueo: (a: ArqueoRequest) => pedir<ArqueoOut>("POST", "/arqueo", a),
};
