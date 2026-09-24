// Fixtures y handlers de mocks a mano (D16). Todo dato es ficticio (SPECS §7 regla 10).
import { ApiError } from "./tipos";
import type {
  ArqueoRequest, CajaEstado, ClienteBusqueda, ClienteDetalle,
  DeudorOut, DiaActualOut, MovimientoCrear, Usuario,
} from "./tipos";

export const usuarioMock: Usuario = {
  id: 1,
  nombre: "Marisa",
  negocio: { id: 1, nombre: "Quiniela La Estrella" },
};

export const cajasMock: CajaEstado[] = [
  { id: 1, nombre: "Caja chica", tipo: "operativa", efectivo: 213000, boletas: 45000, esperado: null },
  { id: 2, nombre: "Caja grande", tipo: "central", efectivo: 902000, boletas: 120000, esperado: null },
];

export const diaActualMock: DiaActualOut = {
  dia: { id: 1, fecha: "2026-09-23", estado: "abierto" },
  rendicion_pendiente: true,
  turnos: [
    { id: 1, nombre: "mañana", estado: "cerrado", tiene_ticket: true },
    { id: 2, nombre: "noche", estado: "abierto", tiene_ticket: false },
  ],
  cajas: cajasMock,
  arqueos_pendientes: ["caja_grande_noche"],
};

export const clientesMock: ClienteBusqueda[] = [
  { id: 14, nombre: "Roberto Pérez", saldo: 30000 },
  { id: 15, nombre: "Susana Gómez", saldo: 12500 },
  { id: 16, nombre: "Kiosco Don Aldo", saldo: 0 },
];

function mov(id: number, tipo: MovimientoCrear["tipo"], monto: number, cliente_id: number, cuando: string, nota: string | null = null) {
  return {
    id, tipo, monto, caja_id: 1, turno_id: 1, cliente_id, juego_id: null, contraparte: null, nota,
    creado_en: `${cuando}T10:00:00-03:00`, corresponde_a_fecha: cuando,
    es_ajuste: false, anula_id: null, motivo_anulacion: null, explica_arqueo_id: null,
  };
}

export const clientesDetalleMock: Record<number, ClienteDetalle> = {
  14: {
    id: 14, nombre: "Roberto Pérez", saldo: 30000,
    movimientos: [mov(201, "fiado", 30000, 14, "2026-09-23")],
  },
  15: {
    id: 15, nombre: "Susana Gómez", saldo: 12500,
    movimientos: [mov(202, "fiado", 15000, 15, "2026-09-15"), mov(203, "cobro_fiado", 2500, 15, "2026-09-20")],
  },
  16: {
    id: 16, nombre: "Kiosco Don Aldo", saldo: -5000,
    movimientos: [mov(204, "cobro_fiado", 5000, 16, "2026-09-22", "Pagó de más")],
  },
};

export const deudoresMock: DeudorOut[] = [
  { id: 14, nombre: "Roberto Pérez", saldo: 30000, dias_deuda_mas_vieja: 2 },
  { id: 15, nombre: "Susana Gómez", saldo: 12500, dias_deuda_mas_vieja: 9 },
  { id: 16, nombre: "Kiosco Don Aldo", saldo: -5000, dias_deuda_mas_vieja: 0 },
];

// Handlers de las rutas mockeadas sin parámetro dinámico (esas van aparte en cliente.ts)
export const RUTAS_MOCK: Record<string, (cuerpo: unknown) => unknown> = {
  "POST /auth/login": (c) => {
    const { usuario, password } = c as { usuario: string; password: string };
    if (usuario !== "marisa" || password !== "estrella123") throw new ApiError("credenciales_invalidas", "Usuario o contraseña incorrectos.");
    try { sessionStorage.setItem("sesion_mock", "1"); } catch { /* sin storage */ }
  },
  "POST /auth/logout": () => { try { sessionStorage.removeItem("sesion_mock"); } catch { /* sin storage */ } },
  "GET /auth/yo": () => {
    let hay = false;
    try { hay = sessionStorage.getItem("sesion_mock") === "1"; } catch { /* sin storage */ }
    if (!hay) throw new ApiError("no_autenticado", "Iniciá sesión para continuar.");
    return usuarioMock;
  },
  "GET /dia/actual": () => diaActualMock,
  "GET /cajas": () => cajasMock,
  "POST /movimientos": (c) => {
    const m = c as MovimientoCrear;
    return {
      id: 999, ...m, turno_id: 2, juego_id: null, creado_en: new Date().toISOString(),
      corresponde_a_fecha: m.corresponde_a_fecha ?? "2026-09-23", es_ajuste: !!m.corresponde_a_fecha,
      anula_id: null, motivo_anulacion: null,
    };
  },
  "POST /arqueo": (c) => {
    const a = c as ArqueoRequest;
    const caja = cajasMock.find((x) => x.id === a.caja_id);
    const turno = diaActualMock.turnos.find((t) => t.id === a.turno_id);
    if (caja?.tipo === "operativa" && turno && !turno.tiene_ticket) {
      throw new ApiError("turno_sin_ticket", "Este turno todavía no tiene el ticket cargado.");
    }
    const cuadra = a.efectivo_contado % 1000 === 0;
    const diferencia_efectivo = cuadra ? 0 : -2000;
    return {
      id: 47, efectivo_esperado: a.efectivo_contado - diferencia_efectivo, boletas_esperadas: a.boletas_contadas,
      diferencia_efectivo, diferencia_boletas: 0, estado: cuadra ? "cuadra" : "con_diferencia",
    };
  },
};
