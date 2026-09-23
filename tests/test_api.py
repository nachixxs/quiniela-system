from fastapi.testclient import TestClient

from app.db import get_db
from app.main import app


def test_flujo_login_yo_logout(db, usuario_test):
    negocio, usuario, password = usuario_test
    app.dependency_overrides[get_db] = lambda: db
    cliente = TestClient(app, base_url="https://testserver")

    assert cliente.post("/api/auth/login", json={"usuario": usuario.usuario, "password": "mala"}).status_code == 401
    assert cliente.post("/api/auth/login", json={"usuario": usuario.usuario, "password": password}).status_code == 204

    resp = cliente.get("/api/auth/yo")
    assert resp.json() == {"id": usuario.id, "nombre": usuario.nombre,
                            "negocio": {"id": negocio.id, "nombre": negocio.nombre}}

    assert cliente.post("/api/auth/logout").status_code == 204
    assert cliente.get("/api/auth/yo").status_code == 401

    app.dependency_overrides.clear()
