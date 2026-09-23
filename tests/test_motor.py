from typing import get_args

import pytest

from app.modelos import TipoMovimiento
from app.motor import EFECTOS, Mov, arqueo, esperado, estado, rendicion, saldo, saldo_cliente

GRANDE, CHICA = 1, 2
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


@pytest.mark.parametrize("tipo", sorted(EFECTOS))
def test_contra_asiento_cancela_el_original(tipo):
    destino = GRANDE if tipo.startswith("traspaso") else None
    movs = [Mov(tipo, 7000, CHICA, destino, CLIENTE), Mov(tipo, 7000, CHICA, destino, CLIENTE, anula_id=1)]
    assert saldo(CHICA, movs, (5000, 3000)) == (5000, 3000)
    assert saldo(GRANDE, movs) == (0, 0)
    assert saldo_cliente(CLIENTE, movs) == 0


def test_esperado_de_la_chica_no_existe_sin_ticket():
    movs = [Mov("apuesta_quiniela", 100000, CHICA), Mov("apuesta_quiniela", 100000, CHICA, anula_id=1)]
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


@pytest.mark.parametrize("caja, movs, partida, operativa, resultado", [
    # grande mañana: con la rendición cargada, boletas en cero
    (GRANDE, TRASPASO_NOCHE + [Mov("rendicion_boletas", 39000, GRANDE)], (200000, 30000), False, (280000, 0)),
    # chica desde su conteo de anoche: el traspaso la deja en cero antes del turno
    (CHICA, TRASPASO_NOCHE + TURNO_CHICA, (80000, 9000), True, (90000, 10000)),
    (CHICA, TURNO_CHICA + RECARGA_TICKET, (0, 0), True, (90000, 10000)),
], ids=["grande_manana", "chica_desde_su_conteo", "chica_ticket_recargado"])
def test_esperado_de_cada_control(caja, movs, partida, operativa, resultado):
    assert esperado(caja, movs, partida, operativa) == resultado


def test_saldo_de_cliente():  # el saldo a favor se consume con el próximo fiado; los demás no lo tocan
    movs = [Mov("cobro_fiado", 5000, CHICA, cliente_id=CLIENTE), Mov("fiado", 1000, GRANDE, cliente_id=CLIENTE),
            Mov("fiado", 9000, CHICA, cliente_id=OTRO_CLIENTE), Mov("apuesta_quiniela", 50000, CHICA)]
    assert saldo_cliente(CLIENTE, movs) == -4000


def test_arqueo_con_los_nombres_de_columna():
    assert arqueo(esperado(CHICA, TURNO_CHICA, operativa=True), (90000, 10000)) == {
        "efectivo_esperado": 90000, "boletas_esperadas": 10000, "efectivo_contado": 90000,
        "boletas_contadas": 10000, "diferencia_efectivo": 0, "diferencia_boletas": 0, "estado": "cuadra"}


def test_no_hay_arqueo_de_la_chica_sin_ticket():
    with pytest.raises(ValueError, match="ticket"):
        arqueo(esperado(CHICA, TURNO_CHICA[:-1], operativa=True), (90000, 10000))


@pytest.mark.parametrize("contadas, diferencia", [(39000, 0), (38500, -500)], ids=["cuadra", "falta_una_boleta"])
def test_rendicion_contra_el_lote(contadas, diferencia):
    # boletas del arqueo de anoche (30.000) más las del traspaso (9.000); las de la chica no cuentan
    lote = rendicion(GRANDE, TURNO_CHICA + TRASPASO_NOCHE, (200000, 30000), contadas)
    assert lote == {"total_esperado": 39000, "total_contado": contadas, "diferencia": diferencia}


PREMIO_OLVIDADO = Mov("pago_premio", 2000, CHICA, es_ajuste=True)
PREMIO_ANULADO = Mov("pago_premio", 2000, CHICA, anula_id=1, es_ajuste=True)  # su contra-asiento: una copia
FIADO_OLVIDADO = Mov("fiado", 3000, CHICA, cliente_id=CLIENTE, es_ajuste=True)


@pytest.mark.parametrize("movs, resultado", [
    (TURNO_CHICA + [PREMIO_OLVIDADO], (90000, 10000)),
    (TURNO_CHICA + [PREMIO_OLVIDADO, PREMIO_ANULADO], (90000, 10000)),
    (TURNO_CHICA[:-1] + [Mov("apuesta_quiniela", 100000, CHICA, es_ajuste=True)], None),  # no es el ticket de hoy
], ids=["premio_olvidado", "ajuste_anulado", "ticket_de_otro_dia"])
def test_ajuste_tardio_no_cambia_el_esperado_de_hoy(movs, resultado):
    assert esperado(CHICA, movs, operativa=True) == resultado


def test_fiado_olvidado_suma_a_la_deuda_del_cliente():
    assert saldo_cliente(CLIENTE, TURNO_CHICA + [FIADO_OLVIDADO]) == 7000


@pytest.mark.parametrize("diferencia, ajustes, resultado", [
    ((-3000, 2000), [PREMIO_OLVIDADO], "con_diferencia"),
    ((-3000, 2000), [PREMIO_OLVIDADO, Mov("gasto", 1000, CHICA, es_ajuste=True)], "explicada"),
    ((-2000, 2000), [PREMIO_OLVIDADO, PREMIO_ANULADO], "con_diferencia"),
], ids=["lo_cubre_en_parte", "dos_ajustes", "ajuste_anulado"])
def test_estado_de_un_arqueo_segun_sus_ajustes(diferencia, ajustes, resultado):
    assert estado(diferencia, CHICA, ajustes) == resultado


RUBEN, MARTA = 20, 21


def _control(caja, movs, partida, contado, operativa=False):
    """(esperado, diferencia, estado) del arqueo de `caja`, desde el conteo `partida` con `movs`."""
    r = arqueo(esperado(caja, movs, partida, operativa), contado)
    return ((r["efectivo_esperado"], r["boletas_esperadas"]),
            (r["diferencia_efectivo"], r["diferencia_boletas"]), r["estado"])


def test_dia_simulado_completo():
    """DIA-SIMULADO.md, pasos 1 a 11. Cada control parte de lo contado en el anterior de su caja, cada
    traspaso sube lo contado en la chica y los movimientos de una caja no tocan a la otra."""
    grande, chica = (350000, 42000), (180000, 15500)  # lunes: arqueo grande noche y chica de las 20:20
    noche_lunes = [Mov("traspaso", 180000, CHICA, GRANDE), Mov("traspaso_boletas", 15500, CHICA, GRANDE)]
    lote = rendicion(GRANDE, noche_lunes, grande, 57500)  # P1
    assert lote == {"total_esperado": 57500, "total_contado": 57500, "diferencia": 0}
    rendicion_1 = [Mov("rendicion_boletas", lote["total_esperado"], GRANDE)]  # por el saldo de boletas
    p2 = _control(GRANDE, noche_lunes + rendicion_1, grande, (527000, 0))
    assert p2 == ((530000, 0), (-3000, 0), "con_diferencia")
    grande = (527000, 0)
    manana = [
        Mov("fiado", 4000, CHICA, cliente_id=RUBEN), Mov("fiado", 2500, CHICA, cliente_id=MARTA),
        Mov("cobro_fiado", 6000, CHICA, cliente_id=RUBEN), Mov("pago_premio", 12000, CHICA),
        Mov("pago_premio", 3500, CHICA), Mov("cobro_mercado_pago", 9000, CHICA),
        Mov("cobro_subagente", 27000, CHICA), Mov("pago_premio", 7000, CHICA),  # D9: 20.000 + 7.000 en boletas
        Mov("venta_otro_juego", 8000, CHICA), Mov("venta_otro_juego", 5000, CHICA),
        Mov("apuesta_quiniela", 150000, CHICA),
    ]
    p3 = _control(CHICA, noche_lunes + manana, chica, (158000, 22500), operativa=True)
    assert p3 == ((158000, 22500), (0, 0), "cuadra")
    chica = (158000, 22500)
    traspaso_17 = [Mov("traspaso", 158000, CHICA, GRANDE), Mov("traspaso_boletas", 22500, CHICA, GRANDE)]
    tarde = [Mov("ingreso_del_dueno", 30000, GRANDE), Mov("pago_banco", 250000, GRANDE),
             Mov("sueldo", 60000, GRANDE), Mov("gasto", 4500, GRANDE), Mov("retiro_dueno", 20000, GRANDE),
             Mov("pago_premio", 25000, GRANDE)]
    p4 = _control(GRANDE, manana + traspaso_17 + tarde, grande, (355500, 47500))
    assert p4 == ((355500, 47500), (0, 0), "cuadra")  # el faltante de la mañana no se arrastró
    grande = (355500, 47500)
    noche = [
        Mov("fiado", 3000, CHICA, cliente_id=RUBEN), Mov("pago_premio", 18000, CHICA),
        Mov("cobro_mercado_pago", 5500, CHICA), Mov("cobro_fiado", 2500, CHICA, cliente_id=MARTA),
        Mov("venta_otro_juego", 4000, CHICA), Mov("venta_otro_juego", 6000, CHICA),
        Mov("apuesta_quiniela", 120000, CHICA),
    ]
    p5 = _control(CHICA, traspaso_17 + noche, chica, (104000, 20000), operativa=True)
    assert p5 == ((106000, 18000), (-2000, 2000), "con_diferencia")  # suman cero y no cuadra (D2)
    chica = (104000, 20000)
    traspaso_2020 = [Mov("traspaso", 104000, CHICA, GRANDE), Mov("traspaso_boletas", 20000, CHICA, GRANDE)]
    lote = rendicion(GRANDE, noche + traspaso_2020, grande, 67500)  # P6, miércoles
    assert lote == {"total_esperado": 67500, "total_contado": 67500, "diferencia": 0}
    miercoles = noche + traspaso_2020 + [Mov("rendicion_boletas", lote["total_esperado"], GRANDE)]
    assert _control(GRANDE, miercoles, grande, (459500, 0)) == ((459500, 0), (0, 0), "cuadra")  # P7
    assert estado(p5[1], CHICA, [PREMIO_OLVIDADO]) == "explicada"  # P8: el premio de 2.000 del martes
    assert saldo(CHICA, traspaso_2020 + [PREMIO_OLVIDADO], chica) == (0, 0)  # el miércoles arranca en cero
    martes = [Mov("fiado", 10000, CHICA, cliente_id=RUBEN)] + manana + noche  # P9, con la deuda del lunes
    assert (saldo_cliente(RUBEN, martes), saldo_cliente(MARTA, martes)) == (11000, 0)
