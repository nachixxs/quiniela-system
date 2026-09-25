from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import consultas
from app.auth import usuario_actual
from app.db import get_db
from app.modelos import Usuario
from app.schemas import DiferenciaItem, ReporteDia, ReporteMercadoPago, RendicionItem, VentaJuegoItem

router = APIRouter(prefix="/reportes")


@router.get("/dia/{fecha}", response_model=ReporteDia)
def reporte_dia(fecha: date, usuario: Usuario = Depends(usuario_actual), db: Session = Depends(get_db)):
    return consultas.reporte_dia(db, usuario.negocio_id, fecha)


@router.get("/diferencias", response_model=list[DiferenciaItem])
def reporte_diferencias(usuario: Usuario = Depends(usuario_actual), db: Session = Depends(get_db),
                         desde: date | None = None, hasta: date | None = None, caja_id: int | None = None,
                         turno: Literal["mañana", "noche"] | None = None):
    return consultas.diferencias(db, usuario.negocio_id, desde, hasta, caja_id, turno)


@router.get("/mercado-pago", response_model=ReporteMercadoPago)
def reporte_mercado_pago(usuario: Usuario = Depends(usuario_actual), db: Session = Depends(get_db)):
    return consultas.mercado_pago(db, usuario.negocio_id)


@router.get("/ventas-por-juego", response_model=list[VentaJuegoItem])
def reporte_ventas_por_juego(usuario: Usuario = Depends(usuario_actual), db: Session = Depends(get_db),
                              desde: date | None = None, hasta: date | None = None,
                              agrupar: Literal["dia", "semana", "mes"] = "dia"):
    return consultas.ventas_por_juego(db, usuario.negocio_id, desde, hasta, agrupar)


@router.get("/rendiciones", response_model=list[RendicionItem])
def reporte_rendiciones(usuario: Usuario = Depends(usuario_actual), db: Session = Depends(get_db),
                         desde: date | None = None, hasta: date | None = None):
    return consultas.rendiciones(db, usuario.negocio_id, desde, hasta)
