"""Motor, parte 1: efectos de §5.2, saldos, esperados de §6 con §7.3 y deuda de fiados.
Sin base de datos. Números propios, no los del día simulado."""
from typing import get_args

import pytest

from app.modelos import TipoMovimiento
from app.motor import EFECTOS, Mov, esperado, saldo, saldo_cliente

GRANDE, CHICA, OTRA = 1, 2, 3
CLIENTE, OTRO_CLIENTE = 10, 11


@pytest.mark.parametrize("tipo, efectivo, boletas", [
    ("apuesta_quiniela", 1000, 0),
    ("venta_otro_juego", 1000, 0),
    ("fiado", -1000, 0),  # D1
    ("cobro_fiado", 1000, 0),
    ("cobro_subagente", 1000, 0),
    ("ingreso_del_dueno", 1000, 0),
    ("cobro_mercado_pago", -1000, 0),
    ("pago_premio", -1000, 1000),
    ("pago_banco", -1000, 0),
    ("sueldo", -1000, 0),
    ("gasto", -1000, 0),
    ("retiro_dueno", -1000, 0),
    ("traspaso", -1000, 0),
    ("traspaso_boletas", 0, -1000),
    ("rendicion_boletas", 0, -1000),
])
def test_efecto_de_cada_tipo_en_la_caja_donde_se_carga(tipo, efectivo, boletas):
    assert saldo(CHICA, [Mov(tipo, 1000, CHICA)], (5000, 3000)) == (5000 + efectivo, 3000 + boletas)


def test_todo_tipo_que_acepta_la_base_tiene_efecto():
    assert set(EFECTOS) == set(get_args(TipoMovimiento))


def test_premio_no_desbalancea_el_total():
    efectivo, boletas = saldo(CHICA, [Mov("pago_premio", 12000, CHICA)], (50000, 0))
    assert (efectivo, boletas) == (38000, 12000)
    assert efectivo + boletas == 50000


def test_subagente_con_boletas_suma_efectivo_y_boletas():
    # trae 15.000 en efectivo y 5.000 en boletas: cobro por el total y pago_premio por las boletas
    movs = [Mov("cobro_subagente", 20000, CHICA), Mov("pago_premio", 5000, CHICA)]
    assert saldo(CHICA, movs) == (15000, 5000)


@pytest.mark.parametrize("tipo", sorted(EFECTOS))
def test_contra_asiento_cancela_el_original(tipo):
    destino = GRANDE if tipo.startswith("traspaso") else None
    movs = [Mov(tipo, 7000, CHICA, destino, CLIENTE), Mov(tipo, 7000, CHICA, destino, CLIENTE, anula_id=1)]
    assert saldo(CHICA, movs, (5000, 3000)) == (5000, 3000)
    assert saldo(GRANDE, movs) == (0, 0)
    assert saldo_cliente(CLIENTE, movs) == 0


def test_traspaso_resta_en_la_chica_y_suma_en_la_grande():
    movs = [Mov("traspaso", 90000, CHICA, GRANDE), Mov("traspaso_boletas", 14000, CHICA, GRANDE)]
    assert saldo(CHICA, movs, (90000, 14000)) == (0, 0)
    assert saldo(GRANDE, movs, (300000, 0)) == (390000, 14000)
    assert saldo(OTRA, movs) == (0, 0)


@pytest.mark.parametrize("movs", [
    [],
    [Mov("fiado", 4000, CHICA, cliente_id=CLIENTE), Mov("pago_premio", 12000, CHICA)],
    [Mov("apuesta_quiniela", 100000, CHICA), Mov("apuesta_quiniela", 100000, CHICA, anula_id=1)],
], ids=["turno_vacio", "fiados_y_premios_sin_ticket", "ticket_anulado"])
def test_esperado_de_la_chica_no_existe_sin_ticket(movs):
    assert esperado(CHICA, movs, operativa=True) is None


TURNO_CHICA = [  # esperado: efectivo −4.000 +3.000 −10.000 −5.000 +6.000 +100.000, boletas 10.000
    Mov("fiado", 4000, CHICA, cliente_id=CLIENTE),
    Mov("cobro_fiado", 3000, CHICA, cliente_id=OTRO_CLIENTE),
    Mov("pago_premio", 10000, CHICA),
    Mov("cobro_mercado_pago", 5000, CHICA),
    Mov("venta_otro_juego", 6000, CHICA),
    Mov("apuesta_quiniela", 100000, CHICA),
]
TRASPASO_NOCHE = [Mov("traspaso", 80000, CHICA, GRANDE), Mov("traspaso_boletas", 9000, CHICA, GRANDE)]
RECARGA_TICKET = [Mov("apuesta_quiniela", 100000, CHICA, anula_id=6), Mov("apuesta_quiniela", 100000, CHICA)]
TARDE_GRANDE = [  # traspaso de las 17:00 + cobros − pagados
    Mov("traspaso", 90000, CHICA, GRANDE), Mov("traspaso_boletas", 10000, CHICA, GRANDE),
    Mov("ingreso_del_dueno", 20000, GRANDE), Mov("pago_banco", 150000, GRANDE), Mov("pago_premio", 5000, GRANDE),
]


@pytest.mark.parametrize("caja, movs, partida, operativa, resultado", [
    # rendición: las boletas del arqueo de anoche (30.000) más las del traspaso (9.000)
    (GRANDE, TRASPASO_NOCHE, (200000, 30000), False, (280000, 39000)),
    # grande mañana: con la rendición cargada, boletas en cero
    (GRANDE, TRASPASO_NOCHE + [Mov("rendicion_boletas", 39000, GRANDE)], (200000, 30000), False, (280000, 0)),
    (CHICA, TURNO_CHICA, (0, 0), True, (90000, 10000)),
    # chica desde su conteo de anoche: el traspaso la deja en cero antes del turno
    (CHICA, TRASPASO_NOCHE + TURNO_CHICA, (80000, 9000), True, (90000, 10000)),
    (CHICA, TURNO_CHICA + RECARGA_TICKET, (0, 0), True, (90000, 10000)),
    # grande noche: desde el arqueo de la mañana; los movimientos de la chica no la tocan
    (GRANDE, TURNO_CHICA + TARDE_GRANDE, (280000, 0), False, (235000, 15000)),
], ids=["rendicion", "grande_manana", "chica", "chica_desde_su_conteo", "chica_ticket_recargado", "grande_noche"])
def test_esperado_de_cada_control(caja, movs, partida, operativa, resultado):
    assert esperado(caja, movs, partida, operativa) == resultado


@pytest.mark.parametrize("movs, deuda", [
    ([Mov("fiado", 12000, CHICA, cliente_id=CLIENTE), Mov("fiado", 5000, CHICA, cliente_id=CLIENTE),
      Mov("cobro_fiado", 7000, CHICA, cliente_id=CLIENTE)], 10000),
    ([Mov("fiado", 2500, CHICA, cliente_id=CLIENTE), Mov("cobro_fiado", 5000, CHICA, cliente_id=CLIENTE)], -2500),
    ([Mov("cobro_fiado", 5000, CHICA, cliente_id=CLIENTE), Mov("fiado", 1000, GRANDE, cliente_id=CLIENTE)], -4000),
], ids=["cobro_parcial", "saldo_a_favor", "a_favor_se_consume_con_el_proximo_fiado"])
def test_saldo_de_cliente(movs, deuda):
    otros = [Mov("fiado", 9000, CHICA, cliente_id=OTRO_CLIENTE), Mov("apuesta_quiniela", 50000, CHICA)]
    assert saldo_cliente(CLIENTE, movs + otros) == deuda
