import pytest
from sqlalchemy.orm import Session

from app.db import Base, engine
from app.modelos import Negocio, Usuario, hasher


@pytest.fixture(scope="session")
def tablas():
    Base.metadata.create_all(engine)  # no hace nada si ya las creó Alembic


@pytest.fixture
def db(tablas):
    """Sesión dentro de una transacción que se deshace al terminar el test.

    Los commit() del código quedan en savepoints: nada llega a la base.
    Para la API: app.dependency_overrides[get_db] = lambda: db
    """
    with engine.connect() as conexion:
        transaccion = conexion.begin()
        with Session(bind=conexion, join_transaction_mode="create_savepoint") as sesion:
            yield sesion
        transaccion.rollback()


@pytest.fixture
def usuario_test(db):
    """Devuelve (negocio, usuario, password) ficticios, con la contraseña en claro."""
    password = "clave-de-test"
    negocio = Negocio(nombre="Agencia de Prueba")
    db.add(negocio)
    db.flush()
    usuario = Usuario(negocio_id=negocio.id, usuario="test-login", nombre="Usuario de Prueba",
                      password_hash=hasher.hash(password))
    db.add(usuario)
    db.flush()
    return negocio, usuario, password
