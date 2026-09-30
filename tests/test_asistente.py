"""Asistente (§11) con un cliente falso de Anthropic: ningún test llama a la API real."""
import json
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace as NS
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app import asistente, operaciones as op
from app.asistente import tools
from app.auth import hash_token
from app.db import get_db
from app.main import app
from app.modelos import Negocio, Sesion, Usuario


def _resp(stop, *bloques):
    return NS(stop_reason=stop, content=list(bloques), usage=NS(input_tokens=1, cache_read_input_tokens=0,
                                                                   cache_creation_input_tokens=0, output_tokens=1))


def _pedido(tool, id_, /, **entrada):
    return NS(type="tool_use", id=id_, name=tool, input=entrada)


def _falso(*respuestas):  # hace de anthropic.Anthropic: respuestas grabadas en orden, la última se repite
    llamadas, grabadas = [], list(respuestas)
    crear = lambda **p: llamadas.append(p) or (grabadas.pop(0) if len(grabadas) > 1 else grabadas[0])  # noqa: E731
    return NS(beta=NS(messages=NS(create=crear)), llamadas=llamadas)


@pytest.fixture
def http(db, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "clave-falsa")
    def sesion(negocio_id):
        usuario = Usuario(negocio_id=negocio_id, usuario=f"op-{uuid4()}", nombre="Operador", password_hash="x")
        db.add(usuario)
        db.flush()
        db.add(Sesion(id=hash_token(f"t-{usuario.id}"), usuario_id=usuario.id, negocio_id=negocio_id,
                      expira=datetime.now(UTC) + timedelta(hours=1)))
        return TestClient(app, base_url="https://testserver", cookies={"sesion": f"t-{usuario.id}"})
    app.dependency_overrides[get_db] = lambda: db
    yield sesion
    app.dependency_overrides.clear()


@pytest.fixture
def arqueo(db, agencia):
    """Chica de la mañana: ticket 100.000, fiado 30.000 y gasto 5.000 → esperaba 65.000, contó 35.000: faltan 30.000."""
    for tipo, monto in (("fiado", 30000), ("gasto", 5000)):
        op.crear_movimiento(db, agencia.n, ref_cliente=uuid4(), tipo=tipo, monto=monto, caja_id=agencia.chica,
                            cliente_id=agencia.cliente if tipo == "fiado" else None)
    op.cargar_ticket(db, agencia.n, agencia.manana, 100000, [])
    return op.guardar_arqueo(db, agencia.n, agencia.chica, agencia.manana, 35000, 0)


@pytest.mark.parametrize("clave", [None, ""])  # compose la pasa vacía
def test_sin_api_key_503_sin_llamar_a_nada(agencia, http, monkeypatch, clave):
    monkeypatch.setattr(asistente, "cliente", lambda: pytest.fail("no tiene que llamar a la API"))
    monkeypatch.setenv("ANTHROPIC_API_KEY", clave) if clave is not None else monkeypatch.delenv("ANTHROPIC_API_KEY")
    r = http(agencia.n).post("/api/asistente", json={"pregunta": "¿Cuánto debe Rubén?"})
    assert (r.status_code, r.json()["error"]) == (503, "asistente_no_disponible")


def test_aislamiento_por_negocio(db, arqueo, http, monkeypatch):
    otro = Negocio(nombre="Otra Agencia")
    db.add(otro)
    db.flush()
    assert "negocio_id" not in json.dumps(tools.TOOLS)  # el modelo no puede elegir el negocio
    ajeno = lambda tool, /, **e: tools.ejecutar(db, otro.id, _pedido(tool, "x", **e))  # noqa: E731
    assert json.loads(ajeno("clientes", nombre="Rubén")["content"]) == {"clientes": []}
    assert json.loads(ajeno("movimientos", fecha="2026-09-22")["content"]) == {"total": 0, "movimientos": []}
    assert ajeno("diagnosticar_arqueo", arqueo_id=arqueo.id)["is_error"]
    monkeypatch.setattr(asistente, "cliente", lambda: pytest.fail("un arqueo ajeno no llega a la API"))
    r = http(otro.id).post("/api/asistente", json={"pregunta": "¿Por qué no cerró?", "arqueo_id": arqueo.id})
    assert (r.status_code, r.json()["error"]) == (404, "no_encontrado")


def test_loop_de_tools_y_tope_de_vueltas(db, arqueo, agencia, http, monkeypatch):
    falso = _falso(_resp("tool_use", _pedido("mercado_pago", "t1"), _pedido("clientes", "t2", nombre="Rubén")),
                  _resp("end_turn", NS(type="text", text="Faltan $30.000. Hay un fiado de Rubén por $30.000.")))
    monkeypatch.setattr(asistente, "cliente", lambda: falso)
    r = http(agencia.n).post("/api/asistente", json={"pregunta": "¿Por qué no cerró?", "arqueo_id": arqueo.id})
    assert r.json() == {"respuesta": "Faltan $30.000. Hay un fiado de Rubén por $30.000.",
                        "tools_usadas": ["diagnosticar_arqueo", "mercado_pago", "clientes"]}
    primero, resultados = falso.llamadas[0], falso.llamadas[1]["messages"][2]["content"]  # en un solo mensaje
    assert primero["output_config"] == {"effort": "medium"} and "<diagnostico>" in primero["messages"][0]["content"]
    assert [t["tool_use_id"] for t in resultados] == ["t1", "t2"] and not any("is_error" in t for t in resultados)
    falso = _falso(_resp("tool_use", _pedido("mercado_pago", "t")))  # nunca termina: corta en MAX_VUELTAS
    assert asistente.responder(db, agencia.n, "¿MP?")[1] == ["mercado_pago"] * asistente.MAX_VUELTAS
    assert len(falso.llamadas) == asistente.MAX_VUELTAS


def test_diagnostico_encuentra_el_movimiento_por_el_monto_exacto(db, arqueo, agencia):
    diag = tools.diagnosticar_arqueo(db, agencia.n, arqueo.id)
    assert [(m["tipo"], m["monto"], m["cliente"]) for m in diag["movimientos_por_el_monto"]] == [
        ("fiado", 30000, "Rubén Ficticio")]  # el gasto de 5.000 no
