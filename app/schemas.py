"""Modelos Pydantic v2 de request/response del contrato (CONTRATO-API.md). Sin lógica."""
from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

TipoMovimiento = Literal[
    "apuesta_quiniela", "venta_otro_juego", "fiado", "cobro_fiado", "cobro_subagente",
    "ingreso_del_dueno", "cobro_mercado_pago", "pago_premio", "pago_banco", "sueldo", "gasto",
    "retiro_dueno", "traspaso", "traspaso_boletas", "rendicion_boletas",
]
EstadoArqueo = Literal["cuadra", "con_diferencia", "explicada"]


# --- Día y turnos ---
class DiaOut(BaseModel):
    id: int
    fecha: date
    estado: Literal["abierto", "cerrado"]


class TurnoOut(BaseModel):
    id: int
    nombre: str
    estado: Literal["abierto", "cerrado"]
    tiene_ticket: bool


class CajaEstado(BaseModel):
    id: int
    nombre: str
    tipo: Literal["operativa", "central"]
    efectivo: int
    boletas: int
    esperado: dict[str, int] | None = None


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


class TicketOut(BaseModel):
    esperado: dict[str, int]
    desglose: dict[str, int]


# --- Movimientos ---
class MovimientoCrear(BaseModel):
    ref_cliente: UUID
    tipo: TipoMovimiento
    monto: int
    caja_id: int
    cliente_id: int | None = None
    juego_id: int | None = None
    contraparte: str | None = None
    nota: str | None = None
    corresponde_a_fecha: date | None = None


class MovimientoOut(BaseModel):
    id: int
    tipo: TipoMovimiento
    monto: int
    caja_id: int
    turno_id: int
    cliente_id: int | None
    juego_id: int | None
    contraparte: str | None
    nota: str | None
    creado_en: datetime
    corresponde_a_fecha: date
    es_ajuste: bool
    anula_id: int | None


class MovimientosPagina(BaseModel):
    items: list[MovimientoOut]
    total: int
    pagina: int


class AnularRequest(BaseModel):
    motivo: str


# --- Traspaso, arqueo, rendición ---
class TraspasoRequest(BaseModel):
    caja_origen_id: int


class TraspasoOut(BaseModel):
    efectivo: int
    boletas: int


class ArqueoRequest(BaseModel):
    caja_id: int
    turno_id: int
    efectivo_contado: int
    boletas_contadas: int
    nota: str | None = None


class ArqueoOut(BaseModel):
    id: int
    efectivo_esperado: int
    boletas_esperadas: int
    diferencia_efectivo: int
    diferencia_boletas: int
    estado: EstadoArqueo


class RendicionRequest(BaseModel):
    boletas_contadas: int


class RendicionOut(BaseModel):
    id: int
    total_esperado: int
    total_contado: int
    diferencia: int
    cantidad_boletas: int


# --- Cajas, juegos, clientes ---
class JuegoOut(BaseModel):
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


class ClienteDetalle(BaseModel):
    id: int
    nombre: str
    saldo: int
    movimientos: list[MovimientoOut]


class DeudorOut(BaseModel):
    id: int
    nombre: str
    saldo: int
    dias_deuda_mas_vieja: int


# --- Reportes (§8.6, campos mínimos: a confirmar en el contrato antes de congelar) ---
class ReporteDia(BaseModel):
    fecha: date
    totales_por_tipo: dict[str, int]
    apuestas: int
    boletas: int
    arqueos: list[ArqueoOut]


class DiferenciaItem(BaseModel):
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


class RendicionItem(BaseModel):
    id: int
    fecha: date
    total_esperado: int
    total_contado: int
    diferencia: int
    cantidad_boletas: int


# --- Asistente ---
class AsistenteRequest(BaseModel):
    pregunta: str
    arqueo_id: int | None = None


class AsistenteOut(BaseModel):
    respuesta: str
    tools_usadas: list[str]
