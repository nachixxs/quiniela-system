from fastapi import APIRouter, Depends

from app.auth import usuario_actual
from app.modelos import Usuario
from app.routers.comun import no_implementado
from app.schemas import AsistenteOut, AsistenteRequest

router = APIRouter()


@router.post("/asistente", response_model=AsistenteOut)
def preguntar(datos: AsistenteRequest, usuario: Usuario = Depends(usuario_actual)) -> AsistenteOut:
    raise no_implementado()
