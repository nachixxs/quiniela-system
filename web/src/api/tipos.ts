import type { components } from "./esquema.d.ts";

export type CajaEstado = components["schemas"]["CajaEstado"];
export type DiaActualOut = components["schemas"]["DiaActualOut"];
export type ClienteBusqueda = components["schemas"]["ClienteBusqueda"];
export type ClienteDetalle = components["schemas"]["ClienteDetalle"];
export type DeudorOut = components["schemas"]["DeudorOut"];
export type MovimientoCrear = components["schemas"]["MovimientoCrear"];
export type MovimientoOut = components["schemas"]["MovimientoOut"];
export type MovimientosPagina = components["schemas"]["MovimientosPagina"];
export type ArqueoRequest = components["schemas"]["ArqueoRequest"];
export type ArqueoOut = components["schemas"]["ArqueoOut"];
export type ReporteMes = components["schemas"]["ReporteMes"];
export type ResumenMes = components["schemas"]["ResumenMes"];
export type VentaDia = components["schemas"]["VentaDia"];
export type DiferenciaItem = components["schemas"]["DiferenciaItem"];
export type ReporteMercadoPago = components["schemas"]["ReporteMercadoPago"];
export type RendicionItem = components["schemas"]["RendicionItem"];
export type DiaConTurnos = components["schemas"]["DiaConTurnos"];
export type TurnoOut = components["schemas"]["TurnoOut"];
export type JuegoOut = components["schemas"]["JuegoOut"];
export type TicketRequest = components["schemas"]["TicketRequest"];
export type TicketOut = components["schemas"]["TicketOut"];
export type TraspasoRequest = components["schemas"]["TraspasoRequest"];
export type Saldo = components["schemas"]["Saldo"];
export type RendicionRequest = components["schemas"]["RendicionRequest"];
export type RendicionOut = components["schemas"]["RendicionOut"];
export type ClienteCrear = components["schemas"]["ClienteCrear"];

// GET /auth/yo no está tipado en el contrato (additionalProperties), CONTRATO-API.md fija esta forma
export interface Usuario {
  id: number;
  nombre: string;
  negocio: { id: number; nombre: string };
}

export class ApiError extends Error {
  constructor(public codigo: string, public detalle: string) {
    super(detalle);
  }
}

// GET /dia/actual da 404 sin_dia cuando nunca se abrió ningún día en el negocio.
export const esSinDia = (e: unknown): boolean => e instanceof ApiError && e.codigo === "sin_dia";
