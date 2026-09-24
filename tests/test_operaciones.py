from datetime import date
from uuid import uuid4

import pytest
from sqlalchemy import func, select

from app import operaciones as op
from app.modelos import Arqueo, DiaOperativo, Movimiento, Turno


def mov(db, a, tipo, monto, caja=None, **campos):
    return op.crear_movimiento(db, a.n, ref_cliente=uuid4(), tipo=tipo, monto=monto, caja_id=caja or a.chica, **campos)


def test_dia_completo_contra_la_base(db, agencia):
    """Cada arqueo re-ancla, el traspaso sube lo contado, el ticket es acumulado del día (D17) y la rendición
    valida el arqueo de la noche más el traspaso de las 20:20."""
    a = agencia

    def arqueo(caja, turno, contado):
        r = op.guardar_arqueo(db, a.n, caja, turno, *contado)
        return (r.efectivo_esperado, r.boletas_esperadas), (r.diferencia_efectivo, r.diferencia_boletas), r.estado

    arqueo(a.grande, a.manana, (200000, 0))  # la primera partida de la grande
    mov(db, a, "fiado", 4000, cliente_id=a.cliente)
    mov(db, a, "pago_premio", 12000)
    op.cargar_ticket(db, a.n, a.manana, 90000, [])
    ticket = op.cargar_ticket(db, a.n, a.manana, 100000, [{"juego_id": a.juego, "monto": 8000}])  # recargado
    assert ticket == {"esperado": {"efectivo": 92000, "boletas": 12000}, "desglose": {
        "quiniela": 100000, "otros_juegos": 8000, "cobros": 0, "fiados": -4000, "mercado_pago": 0, "premios": -12000}}
    assert arqueo(a.chica, a.manana, (90000, 12000)) == ((92000, 12000), (-2000, 0), "con_diferencia")
    assert db.get(Turno, a.manana).estado == "cerrado"
    assert op.traspasar(db, a.n, a.chica) == {"efectivo": 90000, "boletas": 12000}  # lo contado, no lo esperado
    mov(db, a, "gasto", 4500, caja=a.grande)
    assert arqueo(a.grande, a.noche, (285500, 12000)) == ((285500, 12000), (0, 0), "cuadra")  # no se arrastra
    mov(db, a, "pago_premio", 3000)
    with pytest.raises(op.Invalido):  # el de la noche no puede dar menos que el de la mañana
        op.cargar_ticket(db, a.n, a.noche, 250000, [{"juego_id": a.juego, "monto": 7000}])
    ticket = op.cargar_ticket(db, a.n, a.noche, 250000, [{"juego_id": a.juego, "monto": 13000}])
    assert ticket["desglose"]["quiniela"] == 150000 and ticket["desglose"]["otros_juegos"] == 5000
    assert arqueo(a.chica, a.noche, (152000, 3000)) == ((152000, 3000), (0, 0), "cuadra")
    assert op.traspasar(db, a.n, a.chica) == {"efectivo": 152000, "boletas": 3000}
    op.cerrar_dia(db, a.n, a.dia)
    _, (manana, _) = op.abrir_dia(db, a.n, date(2026, 9, 23))
    lote = op.rendir(db, a.n, 14500)
    assert (lote.total_esperado, lote.total_contado, lote.diferencia, lote.cantidad_boletas) == (15000, 14500, -500, 2)
    assert arqueo(a.grande, manana.id, (437500, 0)) == ((437500, 0), (0, 0), "cuadra")  # boletas en cero


def test_ref_cliente_repetido_devuelve_el_mismo_movimiento(db, agencia):
    datos = dict(ref_cliente=uuid4(), tipo="fiado", monto=4000, caja_id=agencia.chica, cliente_id=agencia.cliente)
    primero = op.crear_movimiento(db, agencia.n, **datos)
    assert op.crear_movimiento(db, agencia.n, **datos).id == primero.id
    assert db.scalar(select(func.count()).where(Movimiento.ref_cliente == datos["ref_cliente"])) == 1


def test_contra_asiento_es_una_copia_y_no_se_anula(db, agencia):
    a = agencia
    fiado = mov(db, a, "fiado", 4000, cliente_id=a.cliente)
    with pytest.raises(op.NoEncontrado):  # otro negocio no lo ve (§7.4)
        op.anular_movimiento(db, a.n + 1, fiado.id, "Error")
    contra = op.anular_movimiento(db, a.n, fiado.id, "Error")
    assert (contra.tipo, contra.monto, contra.caja_id, contra.cliente_id, contra.anula_id, contra.es_ajuste) == (
        "fiado", 4000, a.chica, a.cliente, fiado.id, False)
    assert (fiado.anula_id, fiado.motivo_anulacion) == (None, None)  # el original no se toca
    for id_ in (contra.id, fiado.id):  # un contra-asiento restaría dos veces; y nada se anula dos veces
        with pytest.raises(op.Conflicto):
            op.anular_movimiento(db, a.n, id_, "Otra vez")


def test_despues_del_arqueo_anular_y_ajustar_no_mueven_la_partida(db, agencia):
    a = agencia
    premio = mov(db, a, "pago_premio", 12000)
    op.cargar_ticket(db, a.n, a.manana, 100000, [])
    arqueo = op.guardar_arqueo(db, a.n, a.chica, a.manana, 86000, 12000)  # faltan 2.000
    assert op.anular_movimiento(db, a.n, premio.id, "Duplicado").es_ajuste  # aquel arqueo ya lo contó
    gasto = mov(db, a, "gasto", 2000, corresponde_a_fecha=date(2026, 9, 22), explica_arqueo_id=arqueo.id)
    assert gasto.es_ajuste and db.get(Arqueo, arqueo.id).estado == "explicada"  # §7.8, D14
    assert op.traspasar(db, a.n, a.chica) == {"efectivo": 86000, "boletas": 12000}


def test_subagente_solo_en_la_caja_grande(db, agencia):  # D10
    with pytest.raises(op.Invalido):
        mov(db, agencia, "cobro_subagente", 27000)
    assert mov(db, agencia, "cobro_subagente", 27000, caja=agencia.grande).caja_id == agencia.grande


def test_arqueo_de_la_chica_sin_ticket_no_guarda_nada(db, agencia):  # §7.3
    mov(db, agencia, "pago_premio", 12000)
    with pytest.raises(op.Conflicto):
        op.guardar_arqueo(db, agencia.n, agencia.chica, agencia.manana, 0, 12000)
    assert db.scalar(select(func.count()).select_from(Arqueo).where(Arqueo.negocio_id == agencia.n)) == 0
    assert db.get(Turno, agencia.manana).estado == "abierto"


def test_el_dia_no_cierra_con_turnos_abiertos(db, agencia):  # §7.7
    with pytest.raises(op.Conflicto):
        op.cerrar_dia(db, agencia.n, agencia.dia)
    assert db.get(DiaOperativo, agencia.dia).estado == "abierto"
