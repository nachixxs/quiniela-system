import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy.orm import Session

from app.db import engine
from app.modelos import Negocio, Usuario, hasher


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
