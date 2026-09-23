from datetime import date

from fastapi import APIRouter, Depends

from app.auth import no_implementado, usuario_actual
from app.modelos import TipoMovimiento, Usuario
from app.schemas import AnularRequest, MovimientoCrear, MovimientoOut, MovimientosPagina

router = APIRouter()


@router.post("/movimientos", response_model=MovimientoOut, status_code=201)
def crear_movimiento(datos: MovimientoCrear, usuario: Usuario = Depends(usuario_actual)):
    raise no_implementado()


@router.get("/movimientos", response_model=MovimientosPagina)
def listar_movimientos(usuario: Usuario = Depends(usuario_actual), turno_id: int | None = None,
                        caja_id: int | None = None, tipo: TipoMovimiento | None = None,
                        cliente_id: int | None = None, desde: date | None = None, hasta: date | None = None,
                        pagina: int = 1):
    raise no_implementado()


@router.post("/movimientos/{movimiento_id}/anular", response_model=MovimientoOut, status_code=201)
def anular_movimiento(movimiento_id: int, datos: AnularRequest, usuario: Usuario = Depends(usuario_actual)):
    raise no_implementado()
