from fastapi import APIRouter, Depends, HTTPException

from app.auth import usuario_actual
from app.modelos import Usuario
from app.schemas import AsistenteOut, AsistenteRequest

router = APIRouter()


@router.post("/asistente", response_model=AsistenteOut)
def preguntar(datos: AsistenteRequest, usuario: Usuario = Depends(usuario_actual)):
    raise HTTPException(501, {"error": "no_implementado", "detalle": "Endpoint pendiente de conectar."})
