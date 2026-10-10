// Datos ficticios de los prototipos (forma de DiaActualOut, DeudorOut y MovimientoOut).
// Un día con la caja chica sin ticket (turno noche abierto) y el arqueo de la grande de la mañana pendiente.
import type { MovimientoOut } from "../src/api/tipos";

export const NEGOCIO = "Quiniela La Estrella";
export const USUARIO = "Rosana";
export const FECHA = "2026-10-09";

export const CAJAS = [
  { id: 1, nombre: "Caja chica", tipo: "operativa" as const, efectivo: 118400, boletas: 412350 },
  { id: 2, nombre: "Caja grande", tipo: "central" as const, efectivo: 2847360, boletas: 1206940 },
];
export const TURNOS = [
  { id: 1, nombre: "mañana", estado: "cerrado" as const, tiene_ticket: true },
  { id: 2, nombre: "noche", estado: "abierto" as const, tiene_ticket: false },
];
// arqueos_pendientes = ["caja_grande_mañana"], ya resuelto a ids.
export const PENDIENTES = [{ caja_id: 2, turno_id: 1 }];
export const RENDICION_PENDIENTE = true;

// Lo que el sistema espera por caja y turno ("caja-turno"). La chica con turno sin ticket no tiene esperado.
export const ESPERADOS: Record<string, { efectivo: number; boletas: number }> = {
  "2-1": { efectivo: 2851360, boletas: 1206940 },
  "2-2": { efectivo: 3094820, boletas: 1274350 },
};
// Conteos de prueba: el primero cuadra; el segundo falla en las dos (-$5.000 en efectivo, +$2.500 en boletas).
export const DEMOS = { cuadra: [2851360, 1206940], no: [2846360, 1209440] } as const;

export const DEUDORES = [
  { id: 1, nombre: "Marta Inventada", saldo: 187450, dias: 12 },
  { id: 2, nombre: "Néstor Figueroa", saldo: 142900, dias: 5 },
  { id: 3, nombre: "Graciela Ponce", saldo: 96350, dias: 0 },
  { id: 4, nombre: "Hugo Sandoval", saldo: 58720, dias: 21 },
  { id: 5, nombre: "Elvira Quiroga", saldo: 41200, dias: 3 },
  { id: 6, nombre: "Tomás Bedoya", saldo: 23650, dias: 8 },
];

type Mov = { id: number; hora: string; tipo: MovimientoOut["tipo"]; quien: string; monto: number };
export const MOVIMIENTOS: Mov[] = [
  { id: 5, hora: "20:48", tipo: "cobro_fiado", quien: "Néstor Figueroa", monto: 42300 },
  { id: 4, hora: "20:31", tipo: "pago_premio", quien: "Hugo Sandoval", monto: 64750 },
  { id: 3, hora: "19:55", tipo: "fiado", quien: "Marta Inventada", monto: 18450 },
  { id: 2, hora: "19:12", tipo: "cobro_mercado_pago", quien: "Transferencia", monto: 27850 },
  { id: 1, hora: "18:40", tipo: "gasto", quien: "Librería Mayo", monto: 9870 },
];
// Hacia dónde va la plata de cada tipo (el fiado no mueve efectivo).
export const ENTRA = new Set<Mov["tipo"]>(["cobro_fiado", "cobro_subagente", "ingreso_del_dueno"]);
export const SIN_EFECTIVO = new Set<Mov["tipo"]>(["fiado"]);
