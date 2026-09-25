from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import consultas, operaciones
from app.auth import usuario_actual
from app.db import get_db
from app.modelos import TipoMovimiento, Usuario
from app.schemas import AnularRequest, MovimientoCrear, MovimientoOut, MovimientosPagina

router = APIRouter()


@router.post("/movimientos", response_model=MovimientoOut, status_code=201)
def crear_movimiento(datos: MovimientoCrear, usuario: Usuario = Depends(usuario_actual),
                      db: Session = Depends(get_db)):
    return operaciones.crear_movimiento(db, usuario.negocio_id, **datos.model_dump())


@router.get("/movimientos", response_model=MovimientosPagina)
def listar_movimientos(usuario: Usuario = Depends(usuario_actual), db: Session = Depends(get_db),
                        turno_id: int | None = None, caja_id: int | None = None,
                        tipo: TipoMovimiento | None = None, cliente_id: int | None = None,
                        desde: date | None = None, hasta: date | None = None, pagina: int = 1):
    return consultas.movimientos(db, usuario.negocio_id, turno_id=turno_id, caja_id=caja_id, tipo=tipo,
                                  cliente_id=cliente_id, desde=desde, hasta=hasta, pagina=pagina)


@router.post("/movimientos/{movimiento_id}/anular", response_model=MovimientoOut, status_code=201)
def anular_movimiento(movimiento_id: int, datos: AnularRequest, usuario: Usuario = Depends(usuario_actual),
                       db: Session = Depends(get_db)):
    return operaciones.anular_movimiento(db, usuario.negocio_id, movimiento_id, datos.motivo)
