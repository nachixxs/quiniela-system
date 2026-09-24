from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import operaciones
from app.auth import usuario_actual
from app.db import get_db
from app.modelos import Usuario
from app.schemas import ArqueoOut, ArqueoRequest, RendicionOut, RendicionRequest, Saldo, TraspasoRequest

router = APIRouter()


@router.post("/traspaso", response_model=Saldo)
def traspaso(datos: TraspasoRequest, usuario: Usuario = Depends(usuario_actual), db: Session = Depends(get_db)):
    return operaciones.traspasar(db, usuario.negocio_id, datos.caja_origen_id)


@router.post("/arqueo", response_model=ArqueoOut)
def arqueo(datos: ArqueoRequest, usuario: Usuario = Depends(usuario_actual), db: Session = Depends(get_db)):
    return operaciones.guardar_arqueo(db, usuario.negocio_id, **datos.model_dump())


@router.post("/rendicion", response_model=RendicionOut)
def rendicion(datos: RendicionRequest, usuario: Usuario = Depends(usuario_actual), db: Session = Depends(get_db)):
    return operaciones.rendir(db, usuario.negocio_id, datos.boletas_contadas)
