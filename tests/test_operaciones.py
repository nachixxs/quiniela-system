from datetime import date
from uuid import uuid4

import pytest
from sqlalchemy import delete, func, select, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app import consultas
from app import operaciones as op
from app.db import engine
from app.modelos import Arqueo, DiaOperativo, Movimiento, Negocio, Turno


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
        "quiniela": 100000, "otros_juegos": 8000, "cobros": 0, "fiados": -4000, "mercado_pago": 0, "premios": -12000,
        "otros_pagos": 0}}
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
    gasto = mov(db, a, "gasto", 2000, corresponde_a_fecha=date(2026, 9, 21), explica_arqueo_id=arqueo.id)
    assert gasto.es_ajuste and db.get(Arqueo, arqueo.id).estado == "explicada"  # §7.8, D14
    assert op.traspasar(db, a.n, a.chica) == {"efectivo": 86000, "boletas": 12000}


def test_un_ajuste_es_de_un_dia_anterior_al_abierto(db, agencia):  # D22
    with pytest.raises(op.Invalido, match="anterior al día abierto"):  # hoy (o después) no es un ajuste
        mov(db, agencia, "gasto", 1000, corresponde_a_fecha=date(2026, 9, 22))


def test_el_traspaso_no_se_lleva_lo_cargado_despues_del_arqueo(db, agencia):
    """16:40: la mañana ya está arqueada y se paga un gasto del turno noche antes de traspasar (DIA-SIMULADO)."""
    a = agencia
    op.cargar_ticket(db, a.n, a.manana, 50000, [])
    op.guardar_arqueo(db, a.n, a.chica, a.manana, 50000, 0)
    mov(db, a, "gasto", 1000)
    assert op.traspasar(db, a.n, a.chica) == {"efectivo": 50000, "boletas": 0}
    with pytest.raises(op.Conflicto):  # el mismo arqueo no se traspasa dos veces
        op.traspasar(db, a.n, a.chica)
    ticket = op.cargar_ticket(db, a.n, a.noche, 80000, [])  # la noche vendió 30.000 y el gasto quedó en la chica
    assert ticket["esperado"]["efectivo"] == 29000 and ticket["desglose"]["otros_pagos"] == -1000
    assert op.guardar_arqueo(db, a.n, a.chica, a.noche, 29000, 0).estado == "cuadra"
    assert op.guardar_arqueo(db, a.n, a.grande, a.noche, 50000, 0).estado == "cuadra"


def test_subagente_solo_en_la_caja_grande(db, agencia):  # D10
    with pytest.raises(op.Invalido):
        mov(db, agencia, "cobro_subagente", 27000)


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


def test_saldo_del_cliente_sin_anulados_y_a_favor(db, agencia):  # §5.6
    a = agencia
    fiado = mov(db, a, "fiado", 4000, cliente_id=a.cliente)
    mov(db, a, "fiado", 3000, cliente_id=a.cliente)
    op.anular_movimiento(db, a.n, fiado.id, "Era de otro cliente")
    assert consultas.buscar_clientes(db, a.n, "rub") == [{"id": a.cliente, "nombre": "Rubén Ficticio", "saldo": 3000}]
    assert [d["saldo"] for d in consultas.deudores(db, a.n)] == [3000]
    mov(db, a, "cobro_fiado", 5000, cliente_id=a.cliente)  # pagó de más: queda a favor
    detalle = consultas.cliente(db, a.n, a.cliente)
    assert detalle["saldo"] == -2000 and len(detalle["movimientos"]) == 4
    assert consultas.deudores(db, a.n) == []


def test_la_chica_no_tiene_esperado_hasta_el_ticket(db, agencia):  # §7.3
    mov(db, agencia, "pago_premio", 12000)

    def chica():
        return next(c for c in consultas.cajas(db, agencia.n) if c["id"] == agencia.chica)

    assert chica()["esperado"] is None
    op.cargar_ticket(db, agencia.n, agencia.manana, 100000, [])
    assert chica()["esperado"] == {"efectivo": 88000, "boletas": 12000}


def test_cierre_del_mes_por_corresponde_a_fecha_y_sin_anulados(db, agencia):  # D39
    """Septiembre contra agosto: el ticket recargado y el gasto anulado no cuentan, cada carga tardía cae en el mes
    de su fecha, el arqueo que no cuadra suma en los contadores y en la diferencia y el explicado solo en los
    contadores: su plata ya está en gastos (D40)."""
    a = agencia
    mov(db, a, "fiado", 4000, cliente_id=a.cliente)
    mov(db, a, "cobro_fiado", 1000, cliente_id=a.cliente)
    mov(db, a, "pago_premio", 12000)
    op.anular_movimiento(db, a.n, mov(db, a, "gasto", 3000).id, "Cargado dos veces")
    mov(db, a, "sueldo", 5000, corresponde_a_fecha=date(2026, 8, 31))  # tardía del mes anterior
    mov(db, a, "cobro_subagente", 27000, caja=a.grande)
    op.guardar_arqueo(db, a.n, a.grande, a.manana, 27000, 0)  # cuadra
    op.cargar_ticket(db, a.n, a.manana, 90000, [])
    op.cargar_ticket(db, a.n, a.manana, 100000, [{"juego_id": a.juego, "monto": 8000}])  # recargado
    op.guardar_arqueo(db, a.n, a.chica, a.manana, 91000, 12500)  # esperaba 93.000 y 12.000
    arqueo = op.guardar_arqueo(db, a.n, a.grande, a.noche, 25000, 0)  # faltan 2.000
    mov(db, a, "gasto", 2000, caja=a.grande, corresponde_a_fecha=date(2026, 9, 10), explica_arqueo_id=arqueo.id)
    reporte = consultas.reporte_mes(db, a.n, date(2026, 9, 1))
    assert reporte["actual"] == {
        "ventas_por_juego": [{"juego_id": 0, "nombre": "Quiniela", "total": 100000},  # sin juego es_quiniela
                             {"juego_id": a.juego, "nombre": "Quini 6", "total": 8000}],
        "total_vendido": 108000, "cobros_fiado": 1000, "cobros_subagente": 27000, "ingresos_del_dueno": 0,
        "premios_pagados": 12000, "cobros_mercado_pago": 0, "pagos_banco": 0, "sueldos": 0, "gastos": 2000,
        "retiros_dueno": 0, "fiado": 4000, "arqueos_hechos": 3, "arqueos_cuadran": 1, "arqueos_con_diferencia": 1,
        "arqueos_explicados": 1, "diferencia_efectivo": -2000, "diferencia_boletas": 500, "diferencia_total": -1500}
    assert {k: v for k, v in reporte["anterior"].items() if v} == {"sueldos": 5000}  # todo lo demás en cero
    assert (reporte["mes"], reporte["deuda_total_hoy"]) == ("2026-09", 3000)
    por_dia = reporte["ventas_por_dia"]
    assert len(por_dia) == 30 and por_dia[0] == {"fecha": date(2026, 9, 1), "total": 0}
    assert por_dia[21] == {"fecha": date(2026, 9, 22), "total": 108000} and sum(d["total"] for d in por_dia) == 108000


def test_dos_escrituras_del_mismo_negocio_van_en_fila(tablas):
    """Dos conexiones: mientras una escritura tiene los turnos (_turno), la rendición del mismo negocio espera,
    acá hasta el lock_timeout. Sin el lock, un doble toque pasa dos veces los chequeos y duplica el efecto."""
    with Session(engine) as a, Session(engine) as b:
        negocio = Negocio(nombre="Negocio Concurrente")
        a.add(negocio)
        a.flush()
        n = negocio.id
        op.abrir_dia(a, n, date(2026, 9, 22))  # commit de verdad: la otra conexión lo ve
        try:
            op._turno(a, n)  # toma el lock y no termina
            b.execute(text("SET LOCAL lock_timeout = '200ms'"))
            with pytest.raises(OperationalError, match="lock timeout"):
                op.rendir(b, n, 0)
        finally:
            a.rollback()
            b.rollback()
            a.execute(delete(Turno).where(Turno.negocio_id == n))
            a.execute(delete(DiaOperativo).where(DiaOperativo.negocio_id == n))
            a.execute(delete(Negocio).where(Negocio.id == n))
            a.commit()
