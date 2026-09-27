"""Modelos Pydantic v2 de request/response del contrato (CONTRATO-API.md). Sin lógica."""
from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.modelos import Estado, TipoMovimiento

TipoMovimientoCarga = Literal[
    "fiado", "cobro_fiado", "cobro_subagente", "ingreso_del_dueno", "cobro_mercado_pago",
    "pago_premio", "pago_banco", "sueldo", "gasto", "retiro_dueno",
]
EstadoArqueo = Literal["cuadra", "con_diferencia", "explicada"]


class OrmModel(BaseModel):
    """Base para schemas de salida armados directo desde un objeto del ORM, no un dict."""
    model_config = ConfigDict(from_attributes=True)


class DiaOut(OrmModel):
    id: int
    fecha: date
    estado: Estado


class TurnoOut(BaseModel):
    id: int
    nombre: str
    estado: Estado
    tiene_ticket: bool


class Saldo(BaseModel):
    efectivo: int
    boletas: int


class CajaEstado(Saldo):
    id: int
    nombre: str
    tipo: Literal["operativa", "central"]
    esperado: Saldo | None = None


class DiaActualOut(BaseModel):
    dia: DiaOut
    rendicion_pendiente: bool
    turnos: list[TurnoOut]
    cajas: list[CajaEstado]
    arqueos_pendientes: list[str]


class DiaConTurnos(BaseModel):
    dia: DiaOut
    turnos: list[TurnoOut]


class JuegoMonto(BaseModel):
    juego_id: int
    monto: int


class TicketRequest(BaseModel):
    quiniela: int
    juegos: list[JuegoMonto]


class Desglose(BaseModel):
    quiniela: int
    otros_juegos: int
    cobros: int
    fiados: int
    mercado_pago: int
    premios: int
    otros_pagos: int  # D20: gastos, retiros, sueldos y pago al banco del turno, aditivo


class TicketOut(BaseModel):
    esperado: Saldo
    desglose: Desglose


class MovimientoCrear(BaseModel):
    ref_cliente: UUID
    tipo: TipoMovimientoCarga
    monto: int
    caja_id: int
    cliente_id: int | None = None
    contraparte: str | None = None
    nota: str | None = None
    corresponde_a_fecha: date | None = None
    explica_arqueo_id: int | None = None


class MovimientoOut(OrmModel):
    id: int
    tipo: TipoMovimiento
    monto: int
    caja_id: int
    turno_id: int
    cliente_id: int | None
    cliente_nombre: str | None = None
    juego_id: int | None
    contraparte: str | None
    nota: str | None
    creado_en: datetime
    corresponde_a_fecha: date
    es_ajuste: bool
    anula_id: int | None
    motivo_anulacion: str | None
    explica_arqueo_id: int | None


class MovimientosPagina(BaseModel):
    items: list[MovimientoOut]
    total: int
    pagina: int


class AnularRequest(BaseModel):
    motivo: str


class TraspasoRequest(BaseModel):
    caja_origen_id: int


class ArqueoRequest(BaseModel):
    caja_id: int
    turno_id: int
    efectivo_contado: int
    boletas_contadas: int
    nota: str | None = None


class ArqueoOut(OrmModel):
    id: int
    efectivo_esperado: int
    boletas_esperadas: int
    diferencia_efectivo: int
    diferencia_boletas: int
    estado: EstadoArqueo


class RendicionRequest(BaseModel):
    boletas_contadas: int


class RendicionOut(OrmModel):
    id: int
    total_esperado: int
    total_contado: int
    diferencia: int
    cantidad_boletas: int


class JuegoOut(OrmModel):
    id: int
    nombre: str


class ClienteBusqueda(BaseModel):
    id: int
    nombre: str
    saldo: int


class ClienteCrear(BaseModel):
    nombre: str
    alias: str | None = None
    telefono: str | None = None


class ClienteDetalle(ClienteBusqueda):
    movimientos: list[MovimientoOut]


class DeudorOut(ClienteBusqueda):
    dias_deuda_mas_vieja: int


# --- Reportes (§8.6, campos mínimos: a confirmar en el contrato antes de congelar) ---
class ReporteDia(BaseModel):
    fecha: date
    totales_por_tipo: dict[str, int]
    apuestas: int
    boletas: int
    arqueos: list[ArqueoOut]


class DiferenciaItem(OrmModel):
    id: int
    caja_id: int
    turno_id: int
    momento: datetime
    diferencia_efectivo: int
    diferencia_boletas: int
    estado: EstadoArqueo


class ReporteMercadoPago(BaseModel):
    acumulado: int
    desde: datetime | None


class VentaJuegoItem(BaseModel):
    periodo: str
    juego_id: int
    total: int


class RendicionItem(RendicionOut):
    fecha: date


class AsistenteRequest(BaseModel):
    pregunta: str
    arqueo_id: int | None = None


class AsistenteOut(BaseModel):
    respuesta: str
    tools_usadas: list[str]


class VentaJuegoMes(BaseModel):
    juego_id: int
    nombre: str
    total: int


class ResumenMes(BaseModel):
    ventas_por_juego: list[VentaJuegoMes]
    total_vendido: int
    cobros_fiado: int
    cobros_subagente: int
    ingresos_del_dueno: int
    premios_pagados: int
    cobros_mercado_pago: int
    pagos_banco: int
    sueldos: int
    gastos: int
    retiros_dueno: int
    fiado: int
    arqueos_hechos: int
    arqueos_cuadran: int
    arqueos_con_diferencia: int
    arqueos_explicados: int
    diferencia_efectivo: int
    diferencia_boletas: int
    diferencia_total: int


class VentaDia(BaseModel):
    fecha: date
    total: int


class ReporteMes(BaseModel):
    mes: str
    actual: ResumenMes
    anterior: ResumenMes
    deuda_total_hoy: int
    ventas_por_dia: list[VentaDia]


class NegocioOut(BaseModel):
    id: int
    nombre: str


class UsuarioOut(BaseModel):
    id: int
    nombre: str
    negocio: NegocioOut
