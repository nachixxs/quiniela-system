from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import consultas, operaciones
from app.auth import usuario_actual
from app.db import get_db
from app.modelos import Usuario
from app.schemas import CajaEstado, ClienteBusqueda, ClienteCrear, ClienteDetalle, DeudorOut, JuegoOut

router = APIRouter()


@router.get("/cajas", response_model=list[CajaEstado])
def listar_cajas(usuario: Usuario = Depends(usuario_actual), db: Session = Depends(get_db)):
    return consultas.cajas(db, usuario.negocio_id)


@router.get("/juegos", response_model=list[JuegoOut])
def listar_juegos(usuario: Usuario = Depends(usuario_actual), db: Session = Depends(get_db)):
    return consultas.juegos(db, usuario.negocio_id)


@router.get("/clientes/deudores", response_model=list[DeudorOut])
def clientes_deudores(usuario: Usuario = Depends(usuario_actual), db: Session = Depends(get_db),
                       orden: Literal["monto", "antiguedad"] = "monto"):
    return consultas.deudores(db, usuario.negocio_id, orden)


@router.get("/clientes", response_model=list[ClienteBusqueda])
def buscar_clientes(usuario: Usuario = Depends(usuario_actual), db: Session = Depends(get_db), q: str = ""):
    return consultas.buscar_clientes(db, usuario.negocio_id, q)


@router.post("/clientes", response_model=ClienteBusqueda, status_code=201)
def crear_cliente(datos: ClienteCrear, usuario: Usuario = Depends(usuario_actual), db: Session = Depends(get_db)):
    cliente = operaciones.crear_cliente(db, usuario.negocio_id, datos.nombre, datos.alias, datos.telefono)
    return {"id": cliente.id, "nombre": cliente.nombre, "saldo": 0}


@router.get("/clientes/{cliente_id}", response_model=ClienteDetalle)
def detalle_cliente(cliente_id: int, usuario: Usuario = Depends(usuario_actual), db: Session = Depends(get_db)):
    return consultas.cliente(db, usuario.negocio_id, cliente_id)
