import secrets
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import COOKIE_SESION, DURACION_SESION_HORAS, usuario_actual
from app.db import get_db
from app.modelos import Negocio, Sesion, Usuario, hasher

router = APIRouter()


class LoginRequest(BaseModel):
    usuario: str
    password: str


@router.post("/login", status_code=204)
def login(datos: LoginRequest, response: Response, db: Session = Depends(get_db)) -> None:
    usuario = db.query(Usuario).filter_by(usuario=datos.usuario).first()
    if usuario is None or not hasher.verify(datos.password, usuario.password_hash):
        raise HTTPException(401, {"error": "credenciales_invalidas", "detalle": "Usuario o contraseña incorrectos."})
    sesion = Sesion(id=secrets.token_urlsafe(32), usuario_id=usuario.id, negocio_id=usuario.negocio_id,
                     expira=datetime.now(UTC) + timedelta(hours=DURACION_SESION_HORAS))
    db.add(sesion)
    db.commit()
    response.set_cookie(COOKIE_SESION, sesion.id, httponly=True, samesite="lax", secure=True,
                         max_age=DURACION_SESION_HORAS * 3600)


@router.post("/logout", status_code=204)
def logout(response: Response, sesion: str | None = Cookie(default=None, alias=COOKIE_SESION),
           db: Session = Depends(get_db)) -> None:
    if sesion:
        db.query(Sesion).filter_by(id=sesion).delete()
        db.commit()
    response.delete_cookie(COOKIE_SESION)


@router.get("/yo")
def yo(usuario: Usuario = Depends(usuario_actual), db: Session = Depends(get_db)) -> dict:
    negocio = db.get(Negocio, usuario.negocio_id)
    return {"id": usuario.id, "nombre": usuario.nombre, "negocio": {"id": negocio.id, "nombre": negocio.nombre}}
