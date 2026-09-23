from fastapi import APIRouter, Depends

from app.auth import no_implementado, usuario_actual
from app.modelos import Usuario
from app.schemas import AsistenteOut, AsistenteRequest

router = APIRouter()


@router.post("/asistente", response_model=AsistenteOut)
def preguntar(datos: AsistenteRequest, usuario: Usuario = Depends(usuario_actual)):
    raise no_implementado()
