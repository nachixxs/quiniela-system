from fastapi import APIRouter, Depends, Query

from app.auth import usuario_actual
from app.modelos import Usuario
from app.routers.comun import no_implementado
from app.schemas import AnularRequest, MovimientoCrear, MovimientoOut, MovimientosPagina

router = APIRouter()


@router.post("/movimientos", response_model=MovimientoOut, status_code=201)
def crear_movimiento(datos: MovimientoCrear, usuario: Usuario = Depends(usuario_actual)) -> MovimientoOut:
    raise no_implementado()


@router.get("/movimientos", response_model=MovimientosPagina)
def listar_movimientos(usuario: Usuario = Depends(usuario_actual), turno_id: int | None = None,
                        caja_id: int | None = None, tipo: str | None = None, cliente_id: int | None = None,
                        desde: str | None = None, hasta: str | None = None,
                        pagina: int = Query(default=1)) -> MovimientosPagina:
    raise no_implementado()


@router.post("/movimientos/{movimiento_id}/anular", response_model=MovimientoOut, status_code=201)
def anular_movimiento(movimiento_id: int, datos: AnularRequest,
                       usuario: Usuario = Depends(usuario_actual)) -> MovimientoOut:
    raise no_implementado()
