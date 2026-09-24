import hashlib
import threading
from datetime import UTC, datetime

from fastapi import Cookie, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.modelos import Sesion, Usuario, hasher

COOKIE_SESION = "sesion"
DURACION_SESION_HORAS = 12

# Cada hasher.verify de argon2 usa ~64 MiB (auditoría 3.C2): con 40 logins juntos, se comen los
# 512 MB de Render. El semáforo limita a 2 a la vez; sin cupo en 5 s, 429 en vez de tirar el proceso.
SEMAFORO_LOGIN = threading.BoundedSemaphore(2)


def no_implementado() -> HTTPException:
    """Stub compartido: lo conecta la 3.A3 a la lógica de dominio (backend-dev)."""
    return HTTPException(501, {"error": "no_implementado", "detalle": "Endpoint pendiente de conectar."})


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def verificar_password(password: str, hash_: str) -> bool:
    """`hash_` puede ser el real o el HASH_DUMMY, para no filtrar por tiempo si el usuario existe."""
    if not SEMAFORO_LOGIN.acquire(timeout=5):
        raise HTTPException(429, {"error": "demasiados_intentos", "detalle": "Probá de nuevo en unos segundos."})
    try:
        return hasher.verify(password, hash_)
    finally:
        SEMAFORO_LOGIN.release()


def usuario_actual(sesion: str | None = Cookie(default=None, alias=COOKIE_SESION),
                    db: Session = Depends(get_db)) -> Usuario:
    fila = db.get(Sesion, hash_token(sesion)) if sesion else None
    usuario = db.get(Usuario, fila.usuario_id) if fila and fila.expira >= datetime.now(UTC) else None
    if usuario is None:
        raise HTTPException(401, {"error": "no_autenticado", "detalle": "Sesión inválida o vencida."})
    return usuario
