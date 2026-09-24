import os

# antes de importar app: sin DATABASE_URL, los tests van a su base y no a la de desarrollo (el CI la define)
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://quiniela_test:quiniela_test@127.0.0.1:5433/quiniela_test")

from datetime import date
from types import SimpleNamespace

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy.orm import Session

from app.db import engine
from app.modelos import Caja, Cliente, Juego, Negocio, Usuario, hasher
from app.operaciones import abrir_dia


@pytest.fixture(scope="session")
def tablas():
    command.upgrade(Config("alembic.ini"), "head")  # un modelo sin migración rompe los tests


@pytest.fixture
def db(tablas):
    """Sesión en una transacción que se deshace al final: los commit() quedan en savepoints."""
    with engine.connect() as conexion:
        transaccion = conexion.begin()
        with Session(bind=conexion, join_transaction_mode="create_savepoint") as sesion:
            yield sesion
        transaccion.rollback()


@pytest.fixture
def usuario_test(db):
    password = "clave-de-test"
    negocio = Negocio(nombre="Agencia de Prueba")
    db.add(negocio)
    db.flush()
    usuario = Usuario(negocio_id=negocio.id, usuario="test-login", nombre="Usuario de Prueba",
                      password_hash=hasher.hash(password))
    db.add(usuario)
    db.flush()
    return negocio, usuario, password


@pytest.fixture
def agencia(db):
    """Negocio con caja grande, caja chica que le traspasa, un cliente y un juego, y el martes 22/09 abierto."""
    negocio = Negocio(nombre="Quiniela La Estrella")
    db.add(negocio)
    db.flush()
    grande = Caja(negocio_id=negocio.id, nombre="Caja grande", tipo="central")
    db.add(grande)
    db.flush()
    chica = Caja(negocio_id=negocio.id, nombre="Caja chica", tipo="operativa", caja_padre_id=grande.id)
    cliente = Cliente(negocio_id=negocio.id, nombre="Rubén Ficticio")
    juego = Juego(negocio_id=negocio.id, nombre="Quini 6")
    db.add_all([chica, cliente, juego])
    db.flush()
    dia, (manana, noche) = abrir_dia(db, negocio.id, date(2026, 9, 22))
    return SimpleNamespace(n=negocio.id, grande=grande.id, chica=chica.id, cliente=cliente.id, juego=juego.id,
                           dia=dia.id, manana=manana.id, noche=noche.id)
