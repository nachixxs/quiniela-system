from fastapi import APIRouter, Depends

from app.auth import usuario_actual
from app.modelos import Usuario
from app.routers.comun import no_implementado
from app.schemas import CajaEstado, ClienteBusqueda, ClienteCrear, ClienteDetalle, DeudorOut, JuegoOut

router = APIRouter()


@router.get("/cajas", response_model=list[CajaEstado])
def listar_cajas(usuario: Usuario = Depends(usuario_actual)) -> list[CajaEstado]:
    raise no_implementado()


@router.get("/juegos", response_model=list[JuegoOut])
def listar_juegos(usuario: Usuario = Depends(usuario_actual)) -> list[JuegoOut]:
    raise no_implementado()


@router.get("/clientes/deudores", response_model=list[DeudorOut])
def clientes_deudores(usuario: Usuario = Depends(usuario_actual), orden: str = "monto") -> list[DeudorOut]:
    raise no_implementado()


@router.get("/clientes", response_model=list[ClienteBusqueda])
def buscar_clientes(usuario: Usuario = Depends(usuario_actual), q: str = "") -> list[ClienteBusqueda]:
    raise no_implementado()


@router.post("/clientes", response_model=ClienteBusqueda, status_code=201)
def crear_cliente(datos: ClienteCrear, usuario: Usuario = Depends(usuario_actual)) -> ClienteBusqueda:
    raise no_implementado()


@router.get("/clientes/{cliente_id}", response_model=ClienteDetalle)
def detalle_cliente(cliente_id: int, usuario: Usuario = Depends(usuario_actual)) -> ClienteDetalle:
    raise no_implementado()
