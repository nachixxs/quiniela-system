from fastapi import APIRouter, Depends

from app.auth import usuario_actual
from app.modelos import Usuario
from app.routers.comun import no_implementado
from app.schemas import ArqueoOut, ArqueoRequest, RendicionOut, RendicionRequest, TraspasoOut, TraspasoRequest

router = APIRouter()


@router.post("/traspaso", response_model=TraspasoOut)
def traspaso(datos: TraspasoRequest, usuario: Usuario = Depends(usuario_actual)) -> TraspasoOut:
    raise no_implementado()


@router.post("/arqueo", response_model=ArqueoOut)
def arqueo(datos: ArqueoRequest, usuario: Usuario = Depends(usuario_actual)) -> ArqueoOut:
    raise no_implementado()


@router.post("/rendicion", response_model=RendicionOut)
def rendicion(datos: RendicionRequest, usuario: Usuario = Depends(usuario_actual)) -> RendicionOut:
    raise no_implementado()
