from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app import operaciones
from app.auth import hash_token
from app.db import get_db
from app.main import app
from app.modelos import Caja, Cliente, Negocio, Sesion, Usuario, hasher
from app.routers.auth import FALLOS


@pytest.fixture(autouse=True)
def _limpiar_fallos_login():
    FALLOS.clear()
    yield
    FALLOS.clear()


def _sesion(db, negocio_id: int, nombre: str = "Operador") -> str:
    """Usuario y sesión de `negocio_id`, sin pasar por /auth/login: más rápido para tests que no
    prueban el login en sí. Devuelve el token de cookie."""
    usuario = Usuario(negocio_id=negocio_id, usuario=f"{nombre}-{negocio_id}-{uuid4()}", nombre=nombre,
                      password_hash=hasher.hash("clave"))
    db.add(usuario)
    db.flush()
    token = f"token-{usuario.id}"
    db.add(Sesion(id=hash_token(token), usuario_id=usuario.id, negocio_id=negocio_id,
                  expira=datetime.now(UTC) + timedelta(hours=1)))
    db.flush()
    return token


def test_flujo_login_yo_logout(db, usuario_test):
    negocio, usuario, password = usuario_test
    app.dependency_overrides[get_db] = lambda: db
    cliente = TestClient(app, base_url="https://testserver")

    assert cliente.post("/api/auth/login", json={"usuario": usuario.usuario, "password": "mala"}).status_code == 401
    assert cliente.post("/api/auth/login", json={"usuario": usuario.usuario, "password": password}).status_code == 204

    token = cliente.cookies.get("sesion")
    assert db.get(Sesion, token) is None
    assert db.get(Sesion, hash_token(token)) is not None

    resp = cliente.get("/api/auth/yo")
    assert resp.json() == {"id": usuario.id, "nombre": usuario.nombre,
                            "negocio": {"id": negocio.id, "nombre": negocio.nombre}}

    assert cliente.post("/api/auth/logout").status_code == 204
    assert cliente.get("/api/auth/yo").status_code == 401

    app.dependency_overrides.clear()


def test_login_bloquea_tras_5_fallidos_aunque_la_clave_sea_correcta(db, usuario_test):
    _, usuario, password = usuario_test
    app.dependency_overrides[get_db] = lambda: db
    cliente = TestClient(app, base_url="https://testserver")
    datos = {"usuario": usuario.usuario, "password": "mala"}
    try:
        assert [cliente.post("/api/auth/login", json=datos).status_code for _ in range(5)] == [401] * 5
        resp = cliente.post("/api/auth/login", json={**datos, "password": password})
        assert resp.status_code == 429
        assert resp.json()["error"] == "demasiados_intentos"
        # otro usuario desde la misma IP también queda bloqueado
        assert cliente.post("/api/auth/login", json={"usuario": "otro", "password": "x"}).status_code == 429
    finally:
        app.dependency_overrides.clear()


def test_negocio_id_rechazado_en_body_y_query(db):
    app.dependency_overrides[get_db] = lambda: db
    cliente = TestClient(app, base_url="https://testserver")

    resp_body = cliente.post("/api/movimientos", json={"negocio_id": 1, "monto": 100})
    assert resp_body.status_code == 400
    assert resp_body.json()["error"] == "negocio_id_no_permitido"

    resp_query = cliente.get("/api/cajas?negocio_id=1")
    assert resp_query.status_code == 400
    assert resp_query.json()["error"] == "negocio_id_no_permitido"

    app.dependency_overrides.clear()


def test_formato_422_datos_invalidos(db, usuario_test):
    negocio, usuario, password = usuario_test
    app.dependency_overrides[get_db] = lambda: db
    cliente = TestClient(app, base_url="https://testserver")

    resp = cliente.post("/api/auth/login", json={"usuario": usuario.usuario, "password": ["no-debe-filtrarse"]})
    assert resp.status_code == 422
    cuerpo = resp.json()
    assert cuerpo["error"] == "datos_invalidos"
    assert isinstance(cuerpo["detalle"], str)
    assert "no-debe-filtrarse" not in resp.text

    app.dependency_overrides.clear()


def test_aislamiento_por_negocio_id(db, agencia):
    """Un usuario de otro negocio no ve un cliente ajeno ni puede anular un movimiento ajeno (§7.4)."""
    otro_negocio = Negocio(nombre="Otro Negocio")
    db.add(otro_negocio)
    db.flush()
    token_ajeno = _sesion(db, otro_negocio.id)
    token_propio = _sesion(db, agencia.n)
    movimiento = operaciones.crear_movimiento(db, agencia.n, ref_cliente=uuid4(), tipo="fiado", monto=1000,
                                              caja_id=agencia.chica, cliente_id=agencia.cliente)

    app.dependency_overrides[get_db] = lambda: db
    cliente = TestClient(app, base_url="https://testserver")

    cliente.cookies.set("sesion", token_ajeno)
    assert cliente.get(f"/api/clientes/{agencia.cliente}").status_code == 404
    resp = cliente.post(f"/api/movimientos/{movimiento.id}/anular", json={"motivo": "prueba"})
    assert resp.status_code == 404

    cliente.cookies.set("sesion", token_propio)
    assert cliente.get(f"/api/clientes/{agencia.cliente}").status_code == 200

    app.dependency_overrides.clear()


def test_recorrido_feliz_http(db):
    """Abrir día, un fiado, ver el saldo del cliente, y un error de dominio (409) con el formato único."""
    negocio = Negocio(nombre="Recorrido Feliz")
    db.add(negocio)
    db.flush()
    grande = Caja(negocio_id=negocio.id, nombre="Caja grande", tipo="central")
    db.add(grande)
    db.flush()
    chica = Caja(negocio_id=negocio.id, nombre="Caja chica", tipo="operativa", caja_padre_id=grande.id)
    cliente_db = Cliente(negocio_id=negocio.id, nombre="Cliente Feliz")
    db.add_all([chica, cliente_db])
    db.flush()
    token = _sesion(db, negocio.id)

    app.dependency_overrides[get_db] = lambda: db
    cliente = TestClient(app, base_url="https://testserver")
    cliente.cookies.set("sesion", token)

    assert cliente.post("/api/dia/abrir").status_code == 201

    resp = cliente.post("/api/movimientos", json={"ref_cliente": str(uuid4()), "tipo": "fiado", "monto": 5000,
                                                    "caja_id": chica.id, "cliente_id": cliente_db.id})
    assert resp.status_code == 201

    resp = cliente.get(f"/api/clientes/{cliente_db.id}")
    assert resp.status_code == 200
    assert resp.json()["saldo"] == 5000

    resp = cliente.post("/api/dia/abrir")  # ya hay un día abierto: error de dominio (Conflicto)
    assert resp.status_code == 409
    assert resp.json()["error"] == "dia_existente"
    assert isinstance(resp.json()["detalle"], str)

    app.dependency_overrides.clear()


def test_413_body_grande(db):
    app.dependency_overrides[get_db] = lambda: db
    cliente = TestClient(app, base_url="https://testserver")

    resp = cliente.post("/api/clientes", content=b"x" * 70_000, headers={"content-type": "application/json"})
    assert resp.status_code == 413
    assert resp.json()["error"] == "cuerpo_muy_grande"

    resp_get = cliente.request("GET", "/api/cajas", content=b"x" * 70_000, headers={"content-type": "application/json"})
    assert resp_get.status_code == 413
    assert resp_get.json()["error"] == "cuerpo_muy_grande"

    app.dependency_overrides.clear()
