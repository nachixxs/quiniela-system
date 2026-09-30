import os

import anthropic
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import asistente
from app.auth import usuario_actual
from app.db import get_db
from app.modelos import Usuario
from app.schemas import AsistenteOut, AsistenteRequest

MAX_PREGUNTA = 500  # D57
router = APIRouter()


def _no_disponible(detalle: str) -> HTTPException:
    return HTTPException(503, {"error": "asistente_no_disponible", "detalle": detalle})


@router.post("/asistente", response_model=AsistenteOut)
def preguntar(datos: AsistenteRequest, usuario: Usuario = Depends(usuario_actual), db: Session = Depends(get_db)):
    """§11.3: fuera del camino crítico. Sin clave (o vacía, como la pasa compose) o con la API caída, 503 y el resto
    del sistema sigue igual. No se loguean preguntas ni respuestas: traen datos de clientes."""
    if not datos.pregunta.strip() or len(datos.pregunta) > MAX_PREGUNTA:
        raise HTTPException(400, {"error": "pregunta_invalida",
                                  "detalle": f"La pregunta va de 1 a {MAX_PREGUNTA} caracteres."})
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise _no_disponible("El asistente no está configurado. El resto del sistema funciona igual.")
    try:
        respuesta, usadas = asistente.responder(db, usuario.negocio_id, datos.pregunta, datos.arqueo_id)
    except asistente.NoDisponible as e:
        raise _no_disponible(str(e))
    except anthropic.AnthropicError as e:  # conexión, timeout, 429, 5xx, clave inválida
        asistente.log.warning("asistente: falla de la API (%s)", type(e).__name__)
        raise _no_disponible("El asistente no está disponible ahora. El resto del sistema funciona igual.")
    return {"respuesta": respuesta, "tools_usadas": usadas}
