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
