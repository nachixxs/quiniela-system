// Fixtures a mano (D16). Todo dato es ficticio (SPECS §7 regla 10).
import type {
  CajaEstado,
  ClienteBusqueda,
  ClienteDetalle,
  DeudorOut,
  DiaActualOut,
  Usuario,
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
