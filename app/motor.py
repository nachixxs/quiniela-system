"""Motor de cajas: efectos (§5.2), saldos, esperados (§6, §7.3), arqueo y rendición (§6, §5.3),
ajustes tardíos (§7.8) y deuda de fiados (§5.6). Funciones puras, sin base ni SQLAlchemy.
Montos enteros en pesos."""
from dataclasses import dataclass

# §5.2: signo de cada tipo sobre (efectivo, boletas, deuda) en la caja donde se carga.
# Los traspasos se cargan en la caja origen; la caja destino recibe el signo contrario.
EFECTOS = {
    "apuesta_quiniela": (1, 0, 0),
    "venta_otro_juego": (1, 0, 0),
    "fiado": (-1, 0, 1),  # D1: el ticket lo cuenta como vendido y la plata no entró
    "cobro_fiado": (1, 0, -1),
    "cobro_subagente": (1, 0, 0),  # las boletas que trae van aparte, como pago_premio
    "ingreso_del_dueno": (1, 0, 0),
    "cobro_mercado_pago": (-1, 0, 0),
    "pago_premio": (-1, 1, 0),  # sale efectivo, entra boleta: el total no cambia
    "pago_banco": (-1, 0, 0),
    "sueldo": (-1, 0, 0),
    "gasto": (-1, 0, 0),
    "retiro_dueno": (-1, 0, 0),
    "traspaso": (-1, 0, 0),
    "traspaso_boletas": (0, -1, 0),
    "rendicion_boletas": (0, -1, 0),  # por todo el saldo de boletas: lo calcula quien la carga
}


@dataclass
class Mov:
    """Lo que el motor necesita de un movimiento."""
    tipo: str
    monto: int  # siempre positivo: el signo lo pone el tipo
    caja_id: int
    destino_id: int | None = None  # solo traspasos: la caja padre del origen (§5.4)
    cliente_id: int | None = None  # solo fiado y cobro_fiado
    anula_id: int | None = None  # contra-asiento (§7.1): mismo tipo y monto, efecto invertido
    es_ajuste: bool = False  # carga tardía (§7.8)


def _signo(m: Mov) -> int:
    return -1 if m.anula_id else 1


def saldo(caja_id: int, movs: list[Mov], partida: tuple[int, int] = (0, 0),
          con_ajustes: bool = False) -> tuple[int, int]:
    """(efectivo, boletas) de una caja: la partida más el efecto de cada movimiento que la toca.
    Un original y su contra-asiento suman cero. Los ajustes tardíos no cuentan (§7.8: la plata ya
    faltaba y el conteo la re-ancló), salvo con `con_ajustes`, para ver qué diferencia explican."""
    efectivo, boletas = partida
    for m in movs:
        if m.es_ajuste and not con_ajustes:
            continue
        lado = 1 if m.caja_id == caja_id else -1 if m.destino_id == caja_id else 0
        efectivo += EFECTOS[m.tipo][0] * m.monto * lado * _signo(m)
        boletas += EFECTOS[m.tipo][1] * m.monto * lado * _signo(m)
    return efectivo, boletas


def esperado(caja_id: int, movs: list[Mov], partida: tuple[int, int] = (0, 0),
             operativa: bool = False) -> tuple[int, int] | None:
    """Esperado de un control de §6: el saldo desde el último conteo físico (`partida`) con los
    movimientos posteriores. La rendición usa las boletas de la grande, antes de cargarla.
    §7.3: en una caja operativa es None hasta que hay una apuesta_quiniela sin anular (y no ajuste)."""
    if operativa and sum(_signo(m) for m in movs if m.tipo == "apuesta_quiniela" and not m.es_ajuste) <= 0:
        return None
    return saldo(caja_id, movs, partida)


def estado(diferencia: tuple[int, int], caja_id: int = 0, ajustes: list[Mov] | None = None) -> str:
    """Estado de un arqueo (D2, §7.8): cuadra solo si las dos diferencias dan cero. Con diferencia pasa
    a explicada cuando los ajustes enganchados a él (`explica_arqueo_id`, con sus contra-asientos)
    tienen en su caja exactamente ese efecto; si la cubren en parte, sigue con_diferencia."""
    if diferencia == (0, 0):
        return "cuadra"
    return "explicada" if saldo(caja_id, ajustes or [], con_ajustes=True) == diferencia else "con_diferencia"


def arqueo(esperado_: tuple[int, int] | None, contado: tuple[int, int]) -> dict:
    """Resultado de un arqueo (§6), con los nombres de columna de `Arqueo`. Se guarda siempre, cuadre
    o no (§7.2): el motor no ajusta ningún número. El próximo control parte de `contado` (re-anclaje)."""
    if esperado_ is None:
        raise ValueError("La caja no tiene esperado hasta cargar el ticket de la terminal (§7.3)")
    dif = (contado[0] - esperado_[0], contado[1] - esperado_[1])
    return {"efectivo_esperado": esperado_[0], "boletas_esperadas": esperado_[1],
            "efectivo_contado": contado[0], "boletas_contadas": contado[1],
            "diferencia_efectivo": dif[0], "diferencia_boletas": dif[1], "estado": estado(dif)}


def rendicion(caja_id: int, movs: list[Mov], partida: tuple[int, int], contadas: int) -> dict:
    """Números del lote (§5.3). Esperado: las boletas contadas en el arqueo de anoche (`partida`)
    más las que subieron después (traspaso de las 20:20), antes de cargar la rendicion_boletas.
    Esa rendicion_boletas se carga por `total_esperado` (el saldo): deja la caja en cero."""
    esperadas = esperado(caja_id, movs, partida)[1]
    return {"total_esperado": esperadas, "total_contado": contadas, "diferencia": contadas - esperadas}


def saldo_cliente(cliente_id: int, movs: list[Mov]) -> int:
    """Deuda de un cliente (§5.6): fiado − cobro_fiado. Negativa es saldo a favor."""
    return sum(EFECTOS[m.tipo][2] * m.monto * _signo(m) for m in movs if m.cliente_id == cliente_id)
