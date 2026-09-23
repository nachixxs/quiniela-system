from datetime import datetime

from pwdlib import PasswordHash
from sqlalchemy import ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

hasher = PasswordHash.recommended()  # argon2 (D4); lo usan seed y auth


class Negocio(Base):
    __tablename__ = "negocio"
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str]


class Usuario(Base):
    __tablename__ = "usuario"
    id: Mapped[int] = mapped_column(primary_key=True)
    negocio_id: Mapped[int] = mapped_column(ForeignKey("negocio.id"))
    usuario: Mapped[str] = mapped_column(unique=True)
    nombre: Mapped[str]
    password_hash: Mapped[str]


class Sesion(Base):
    __tablename__ = "sesion"
    id: Mapped[str] = mapped_column(primary_key=True)  # secrets.token_urlsafe, va en la cookie
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"))
    negocio_id: Mapped[int] = mapped_column(ForeignKey("negocio.id"))
    creada: Mapped[datetime] = mapped_column(server_default=func.now())
    expira: Mapped[datetime]
