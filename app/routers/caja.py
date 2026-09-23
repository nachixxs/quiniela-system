from fastapi import APIRouter, Depends

from app.auth import no_implementado, usuario_actual
from app.modelos import Usuario
from app.schemas import ArqueoOut, ArqueoRequest, RendicionOut, RendicionRequest, Saldo, TraspasoRequest

router = APIRouter()


@router.post("/traspaso", response_model=Saldo)
def traspaso(datos: TraspasoRequest, usuario: Usuario = Depends(usuario_actual)):
    raise no_implementado()


@router.post("/arqueo", response_model=ArqueoOut)
def arqueo(datos: ArqueoRequest, usuario: Usuario = Depends(usuario_actual)):
    raise no_implementado()


@router.post("/rendicion", response_model=RendicionOut)
def rendicion(datos: RendicionRequest, usuario: Usuario = Depends(usuario_actual)):
    raise no_implementado()
