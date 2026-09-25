from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import consultas, operaciones
from app.auth import usuario_actual
from app.db import get_db
from app.modelos import Usuario
from app.schemas import DiaActualOut, DiaConTurnos, TicketOut, TicketRequest

router = APIRouter()


def _turno_out(t) -> dict:
    return {"id": t.id, "nombre": t.nombre, "estado": t.estado, "tiene_ticket": t.ticket_terminal is not None}


@router.get("/dia/actual", response_model=DiaActualOut)
def dia_actual(usuario: Usuario = Depends(usuario_actual), db: Session = Depends(get_db)):
    return consultas.dia_actual(db, usuario.negocio_id)


@router.post("/dia/abrir", response_model=DiaConTurnos, status_code=201)
def dia_abrir(usuario: Usuario = Depends(usuario_actual), db: Session = Depends(get_db)):
    dia, turnos = operaciones.abrir_dia(db, usuario.negocio_id)
    return {"dia": dia, "turnos": [_turno_out(t) for t in turnos]}


@router.post("/dia/{dia_id}/cerrar", status_code=204)
def dia_cerrar(dia_id: int, usuario: Usuario = Depends(usuario_actual), db: Session = Depends(get_db)) -> None:
    operaciones.cerrar_dia(db, usuario.negocio_id, dia_id)


@router.post("/turno/{turno_id}/ticket", response_model=TicketOut)
def turno_ticket(turno_id: int, datos: TicketRequest, usuario: Usuario = Depends(usuario_actual),
                  db: Session = Depends(get_db)):
    return operaciones.cargar_ticket(db, usuario.negocio_id, turno_id, datos.quiniela,
                                      [j.model_dump() for j in datos.juegos])
