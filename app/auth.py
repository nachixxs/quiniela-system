from datetime import UTC, datetime

from fastapi import Cookie, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.modelos import Sesion, Usuario

COOKIE_SESION = "sesion"
DURACION_SESION_HORAS = 12


def usuario_actual(sesion: str | None = Cookie(default=None, alias=COOKIE_SESION),
                    db: Session = Depends(get_db)) -> Usuario:
    fila = db.get(Sesion, sesion) if sesion else None
    usuario = db.get(Usuario, fila.usuario_id) if fila and fila.expira >= datetime.now(UTC) else None
    if usuario is None:
        raise HTTPException(401, {"error": "no_autenticado", "detalle": "Sesión inválida o vencida."})
    return usuario
