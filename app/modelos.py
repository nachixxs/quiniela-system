from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pwdlib import PasswordHash
from sqlalchemy import CheckConstraint, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

hasher = PasswordHash.recommended()  # argon2 (D4); lo usan seed y auth

# SPECS §5.2, en ASCII. El efecto de cada tipo (signo) lo aplica el motor, no la base.
TipoMovimiento = Literal[
    "apuesta_quiniela", "venta_otro_juego", "fiado", "cobro_fiado", "cobro_subagente",
    "ingreso_del_dueno", "cobro_mercado_pago", "pago_premio", "pago_banco", "sueldo", "gasto",
    "retiro_dueno", "traspaso", "traspaso_boletas", "rendicion_boletas",
]
Estado = Literal["abierto", "cerrado"]


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
    id: Mapped[str] = mapped_column(primary_key=True)  # sha256 del token (D6); el token va solo en la cookie
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"))
    negocio_id: Mapped[int] = mapped_column(ForeignKey("negocio.id"))
    creada: Mapped[datetime] = mapped_column(server_default=func.now())
    expira: Mapped[datetime]


class Caja(Base):
    __tablename__ = "caja"
    id: Mapped[int] = mapped_column(primary_key=True)
    negocio_id: Mapped[int] = mapped_column(ForeignKey("negocio.id"))
    nombre: Mapped[str]
    tipo: Mapped[Literal["operativa", "central"]]
    caja_padre_id: Mapped[int | None] = mapped_column(ForeignKey("caja.id"))  # a quien traspasa


class DiaOperativo(Base):
    __tablename__ = "dia_operativo"
    __table_args__ = (UniqueConstraint("negocio_id", "fecha"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    negocio_id: Mapped[int] = mapped_column(ForeignKey("negocio.id"))
    fecha: Mapped[date]
    estado: Mapped[Estado] = mapped_column(default="abierto")


class Turno(Base):
    __tablename__ = "turno"
    id: Mapped[int] = mapped_column(primary_key=True)
    negocio_id: Mapped[int] = mapped_column(ForeignKey("negocio.id"))
    dia_id: Mapped[int] = mapped_column(ForeignKey("dia_operativo.id"))
    nombre: Mapped[str]  # mañana | noche; texto porque los turnos son configurables (§10)
    estado: Mapped[Estado] = mapped_column(default="abierto")
    ticket_terminal: Mapped[dict | None] = mapped_column(JSONB)  # JSON abierto hasta ver un ticket real


class Cliente(Base):
    __tablename__ = "cliente"  # el saldo no se guarda: fiado − cobro_fiado (§5.6)
    id: Mapped[int] = mapped_column(primary_key=True)
    negocio_id: Mapped[int] = mapped_column(ForeignKey("negocio.id"))
    nombre: Mapped[str]
    alias: Mapped[str | None]
    telefono: Mapped[str | None]
    activo: Mapped[bool] = mapped_column(default=True)


class Juego(Base):
    __tablename__ = "juego"
    id: Mapped[int] = mapped_column(primary_key=True)
    negocio_id: Mapped[int] = mapped_column(ForeignKey("negocio.id"))
    nombre: Mapped[str]
    es_quiniela: Mapped[bool] = mapped_column(default=False)  # la quiniela va aparte en el ticket


class Arqueo(Base):
    __tablename__ = "arqueo"
    id: Mapped[int] = mapped_column(primary_key=True)
    negocio_id: Mapped[int] = mapped_column(ForeignKey("negocio.id"))
    caja_id: Mapped[int] = mapped_column(ForeignKey("caja.id"))
    turno_id: Mapped[int] = mapped_column(ForeignKey("turno.id"))
    momento: Mapped[datetime] = mapped_column(server_default=func.now())
    efectivo_esperado: Mapped[int]
    efectivo_contado: Mapped[int]
    boletas_esperadas: Mapped[int]
    boletas_contadas: Mapped[int]
    diferencia_efectivo: Mapped[int]  # contado − esperado, dos columnas (D2)
    diferencia_boletas: Mapped[int]
    estado: Mapped[Literal["cuadra", "con_diferencia", "explicada"]]
    nota: Mapped[str | None]


class Movimiento(Base):
    __tablename__ = "movimiento"
    __table_args__ = (CheckConstraint("monto > 0", name="monto_positivo"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    negocio_id: Mapped[int] = mapped_column(ForeignKey("negocio.id"))
    dia_id: Mapped[int] = mapped_column(ForeignKey("dia_operativo.id"))
    turno_id: Mapped[int] = mapped_column(ForeignKey("turno.id"))
    caja_id: Mapped[int] = mapped_column(ForeignKey("caja.id"))
    tipo: Mapped[TipoMovimiento]
    monto: Mapped[int]  # siempre positivo: el signo lo pone el tipo (§5.1)
    juego_id: Mapped[int | None] = mapped_column(ForeignKey("juego.id"))
    cliente_id: Mapped[int | None] = mapped_column(ForeignKey("cliente.id"))
    contraparte: Mapped[str | None]
    nota: Mapped[str | None]
    creado_en: Mapped[datetime] = mapped_column(server_default=func.now())
    corresponde_a_fecha: Mapped[date]  # la del día, salvo ajuste tardío (§7.8)
    es_ajuste: Mapped[bool] = mapped_column(default=False)
    explica_arqueo_id: Mapped[int | None] = mapped_column(ForeignKey("arqueo.id"))
    # §7.1: el original nunca se edita; el contra-asiento apunta a él y lleva el motivo
    anula_id: Mapped[int | None] = mapped_column(ForeignKey("movimiento.id"), unique=True)
    motivo_anulacion: Mapped[str | None]
    ref_cliente: Mapped[UUID | None] = mapped_column(unique=True)  # idempotencia (CONTRATO-API)


class LoteRendicion(Base):
    __tablename__ = "lote_rendicion"
    id: Mapped[int] = mapped_column(primary_key=True)
    negocio_id: Mapped[int] = mapped_column(ForeignKey("negocio.id"))
    fecha: Mapped[date]
    total_esperado: Mapped[int]
    total_contado: Mapped[int]
    diferencia: Mapped[int]
    cantidad_boletas: Mapped[int]
