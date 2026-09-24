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

export const clientesDetalleMock: Record<number, ClienteDetalle> = {
  14: {
    id: 14,
    nombre: "Roberto Pérez",
    saldo: 30000,
    movimientos: [
      {
        id: 201, tipo: "fiado", monto: 30000, caja_id: 1, turno_id: 2,
        cliente_id: 14, juego_id: null, contraparte: null, nota: null,
        creado_en: "2026-09-23T11:42:00-03:00", corresponde_a_fecha: "2026-09-23",
        es_ajuste: false, anula_id: null, motivo_anulacion: null, explica_arqueo_id: null,
      },
    ],
  },
};

export const deudoresMock: DeudorOut[] = [
  { id: 14, nombre: "Roberto Pérez", saldo: 30000, dias_deuda_mas_vieja: 2 },
  { id: 15, nombre: "Susana Gómez", saldo: 12500, dias_deuda_mas_vieja: 9 },
];

// Handlers de las rutas mockeadas sin parámetro dinámico (esas van aparte en cliente.ts)
export const RUTAS_MOCK: Record<string, (cuerpo: unknown) => unknown> = {
  "POST /auth/login": (c) => {
    const { usuario, password } = c as { usuario: string; password: string };
    if (usuario === "marisa" && password === "estrella123") return undefined;
    throw new ApiError("credenciales_invalidas", "Usuario o contraseña incorrectos.");
  },
  "POST /auth/logout": () => undefined,
  "GET /auth/yo": () => usuarioMock,
  "GET /dia/actual": () => diaActualMock,
  "GET /cajas": () => cajasMock,
  "GET /clientes/deudores": () => deudoresMock,
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
    return {
      id: 47, efectivo_esperado: a.efectivo_contado, boletas_esperadas: a.boletas_contadas,
      diferencia_efectivo: 0, diferencia_boletas: 0, estado: "cuadra",
    };
  },
};
