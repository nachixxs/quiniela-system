from fastapi import APIRouter, Depends

from app.auth import no_implementado, usuario_actual
from app.modelos import Usuario
from app.schemas import DiaActualOut, DiaConTurnos, TicketOut, TicketRequest

router = APIRouter()


@router.get("/dia/actual", response_model=DiaActualOut)
def dia_actual(usuario: Usuario = Depends(usuario_actual)):
    raise no_implementado()


@router.post("/dia/abrir", response_model=DiaConTurnos, status_code=201)
def dia_abrir(usuario: Usuario = Depends(usuario_actual)):
    raise no_implementado()


@router.post("/dia/{dia_id}/cerrar", status_code=204)
def dia_cerrar(dia_id: int, usuario: Usuario = Depends(usuario_actual)):
    raise no_implementado()


@router.post("/turno/{turno_id}/ticket", response_model=TicketOut)
def turno_ticket(turno_id: int, datos: TicketRequest, usuario: Usuario = Depends(usuario_actual)):
    raise no_implementado()
