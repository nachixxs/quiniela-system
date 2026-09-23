from datetime import date

from fastapi import APIRouter, Depends

from app.auth import usuario_actual
from app.modelos import Usuario
from app.routers.comun import no_implementado
from app.schemas import DiferenciaItem, ReporteDia, ReporteMercadoPago, RendicionItem, VentaJuegoItem

router = APIRouter(prefix="/reportes")


@router.get("/dia/{fecha}", response_model=ReporteDia)
def reporte_dia(fecha: date, usuario: Usuario = Depends(usuario_actual)) -> ReporteDia:
    raise no_implementado()


@router.get("/diferencias", response_model=list[DiferenciaItem])
def reporte_diferencias(usuario: Usuario = Depends(usuario_actual), desde: date | None = None,
                         hasta: date | None = None, caja_id: int | None = None,
                         turno: str | None = None) -> list[DiferenciaItem]:
    raise no_implementado()


@router.get("/mercado-pago", response_model=ReporteMercadoPago)
def reporte_mercado_pago(usuario: Usuario = Depends(usuario_actual)) -> ReporteMercadoPago:
    raise no_implementado()


@router.get("/ventas-por-juego", response_model=list[VentaJuegoItem])
def reporte_ventas_por_juego(usuario: Usuario = Depends(usuario_actual), desde: date | None = None,
                              hasta: date | None = None, agrupar: str = "dia") -> list[VentaJuegoItem]:
    raise no_implementado()


@router.get("/rendiciones", response_model=list[RendicionItem])
def reporte_rendiciones(usuario: Usuario = Depends(usuario_actual), desde: date | None = None,
                         hasta: date | None = None) -> list[RendicionItem]:
    raise no_implementado()
