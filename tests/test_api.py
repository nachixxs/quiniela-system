from fastapi.testclient import TestClient

from app.auth import hash_token
from app.db import get_db
from app.main import app
from app.modelos import Sesion


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
    cliente.post("/api/auth/login", json={"usuario": usuario.usuario, "password": password})

    resp = cliente.post("/api/clientes", json={"alias": "sin nombre"})
    assert resp.status_code == 422
    assert resp.json()["error"] == "datos_invalidos"
    assert "detalle" in resp.json()

    app.dependency_overrides.clear()


def test_endpoint_nuevo_sin_sesion_da_401(db):
    app.dependency_overrides[get_db] = lambda: db
    cliente = TestClient(app, base_url="https://testserver")

    assert cliente.get("/api/cajas").status_code == 401

    app.dependency_overrides.clear()
