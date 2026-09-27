"""Consultas de solo lectura del contrato: pantalla de inicio, cajas, clientes, movimientos y reportes. Cada query
filtra por negocio_id (§7.4) y la plata la cuenta motor.py. Devuelven dicts o filas del ORM con los campos de los
schemas de salida; lo que no existe es NoEncontrado, como en operaciones.py."""
from collections import defaultdict
from datetime import date, datetime, timedelta
from operator import eq, ge, gt, le

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app import motor
from app.modelos import Arqueo, Caja, Cliente, DiaOperativo, Juego, LoteRendicion, Movimiento, Turno
from app.operaciones import ARGENTINA, VENTAS, NoEncontrado, _mov, control, obtener

POR_PAGINA = 50
PERIODOS = {"dia": "%Y-%m-%d", "semana": "%G-W%V", "mes": "%Y-%m"}  # semana ISO: 2026-W39
TOTALES_MES = {"cobros_fiado": "cobro_fiado", "cobros_subagente": "cobro_subagente",
               "ingresos_del_dueno": "ingreso_del_dueno", "premios_pagados": "pago_premio",
               "cobros_mercado_pago": "cobro_mercado_pago", "pagos_banco": "pago_banco", "sueldos": "sueldo",
               "gastos": "gasto", "retiros_dueno": "retiro_dueno", "fiado": "fiado"}  # clave del contrato: tipo


def _si(*filtros) -> list:
    """Las condiciones de los filtros opcionales que vinieron: (columna, operador, valor), sin los valores None."""
    return [operador(columna, valor) for columna, operador, valor in filtros if valor is not None]


def _vivos(negocio_id: int) -> tuple:
    """Movimientos que valen: ni anulados ni contra-asientos, porque un par anulado suma cero (§7.1)."""
    anulados = select(Movimiento.anula_id).where(Movimiento.negocio_id == negocio_id, Movimiento.anula_id.is_not(None))
    return Movimiento.negocio_id == negocio_id, Movimiento.anula_id.is_(None), Movimiento.id.not_in(anulados)


def cajas(db: Session, negocio_id: int) -> list[dict]:
    """GET /cajas: saldo desde el último arqueo (§6) y esperado. El de la chica es None hasta el ticket (§7.3), y
    antes del ticket su efectivo es parcial: ya restó fiados y premios pero las ventas todavía no sumaron."""
    filas = []
    for caja in db.scalars(select(Caja).where(Caja.negocio_id == negocio_id).order_by(Caja.id)).all():
        movs, partida = control(db, negocio_id, caja)
        efectivo, boletas = motor.saldo(caja.id, movs, partida)
        esperado = motor.esperado(caja.id, movs, partida, caja.tipo == "operativa")
        filas.append({"id": caja.id, "nombre": caja.nombre, "tipo": caja.tipo, "efectivo": efectivo, "boletas": boletas,
                      "esperado": None if esperado is None else {"efectivo": esperado[0], "boletas": esperado[1]}})
    return filas


def dia_actual(db: Session, negocio_id: int) -> dict:
    """GET /dia/actual: el último día abierto, o el último cerrado. Pendientes: la rendición, mientras el día
    abierto no tenga su lote; el arqueo de la grande en cada turno hasta el actual; el de la chica, cuando su turno
    ya tiene ticket. Un arqueo pendiente se nombra caja_turno: "caja_grande_noche"."""
    dia = db.scalar(select(DiaOperativo).where(DiaOperativo.negocio_id == negocio_id)
                    .order_by(DiaOperativo.id.desc()).limit(1))
    if dia is None:
        raise NoEncontrado("sin_dia", "Todavía no se abrió ningún día.")
    turnos = db.scalars(select(Turno).where(Turno.negocio_id == negocio_id, Turno.dia_id == dia.id)
                        .order_by(Turno.id)).all()
    estado = cajas(db, negocio_id)
    hechos = set(db.execute(select(Arqueo.caja_id, Arqueo.turno_id).where(
        Arqueo.negocio_id == negocio_id, Arqueo.turno_id.in_([t.id for t in turnos]))).all())
    actual = next((t.id for t in turnos if t.estado == "abierto"), turnos[-1].id)
    pendientes = [f"{c['nombre'].lower().replace(' ', '_')}_{t.nombre}" for t in turnos for c in estado
                  if (c["id"], t.id) not in hechos
                  and (t.ticket_terminal is not None if c["tipo"] == "operativa" else t.id <= actual)]
    rendido = db.scalar(select(LoteRendicion.id).where(LoteRendicion.negocio_id == negocio_id,
                                                       LoteRendicion.fecha == dia.fecha))
    return {"dia": dia, "rendicion_pendiente": dia.estado == "abierto" and rendido is None,
            "turnos": [{"id": t.id, "nombre": t.nombre, "estado": t.estado,
                        "tiene_ticket": t.ticket_terminal is not None} for t in turnos],
            "cajas": estado, "arqueos_pendientes": pendientes}


def juegos(db: Session, negocio_id: int) -> list[Juego]:
    """GET /juegos: los de la pantalla 8.2. La quiniela no, que va aparte en el ticket."""
    return db.scalars(select(Juego).where(Juego.negocio_id == negocio_id, Juego.es_quiniela.is_(False))
                      .order_by(Juego.id)).all()


def _por_cliente(db: Session, negocio_id: int, *condiciones) -> dict[int, list[Movimiento]]:
    por_cliente = defaultdict(list)
    consulta = select(Movimiento).where(Movimiento.negocio_id == negocio_id, Movimiento.cliente_id.is_not(None),
                                        *condiciones)
    for m in db.scalars(consulta.order_by(Movimiento.id)):
        por_cliente[m.cliente_id].append(m)
    return por_cliente


def _saldo(cliente_id: int, movs: list[Movimiento]) -> int:
    return motor.saldo_cliente(cliente_id, [_mov(m, {}) for m in movs])


def _dias_deuda(movs: list[Movimiento], hoy: date) -> int:
    """Días del fiado más viejo que los cobros no cubren: cada cobro paga primero lo más viejo."""
    anulados = {m.anula_id for m in movs}
    vivos = [m for m in movs if m.anula_id is None and m.id not in anulados]
    cubierto = sum(m.monto for m in vivos if m.tipo == "cobro_fiado")
    for m in vivos:
        if m.tipo == "fiado":
            cubierto -= m.monto
            if cubierto < 0:
                return (hoy - m.corresponde_a_fecha).days
    return 0


def buscar_clientes(db: Session, negocio_id: int, q: str = "") -> list[dict]:
    """GET /clientes?q=: autocompletado de clientes activos por nombre o alias, con índices de trigramas. Hasta 20."""
    patron = f"%{q.strip()}%"
    clientes = db.scalars(select(Cliente).where(Cliente.negocio_id == negocio_id, Cliente.activo.is_(True),
                                                or_(Cliente.nombre.ilike(patron), Cliente.alias.ilike(patron)))
                          .order_by(Cliente.nombre).limit(20)).all()
    movs = _por_cliente(db, negocio_id, Movimiento.cliente_id.in_([c.id for c in clientes]))
    return [{"id": c.id, "nombre": c.nombre, "saldo": _saldo(c.id, movs[c.id])} for c in clientes]


def cliente(db: Session, negocio_id: int, cliente_id: int) -> dict:
    """GET /clientes/{id}: el saldo (§5.6: negativo es a favor) y los movimientos que lo componen, nuevos primero."""
    c = obtener(db, Cliente, negocio_id, cliente_id)
    movs = _por_cliente(db, negocio_id, Movimiento.cliente_id == c.id)[c.id]
    return {"id": c.id, "nombre": c.nombre, "saldo": _saldo(c.id, movs), "movimientos": movs[::-1]}


def deudores(db: Session, negocio_id: int, orden: str = "monto") -> list[dict]:
    """GET /clientes/deudores: los de saldo positivo, de mayor a menor saldo o días de deuda (`antiguedad`)."""
    hoy = datetime.now(ARGENTINA).date()
    nombres = dict(db.execute(select(Cliente.id, Cliente.nombre).where(Cliente.negocio_id == negocio_id)).all())
    filas = [{"id": id_, "nombre": nombres[id_], "saldo": _saldo(id_, movs),
              "dias_deuda_mas_vieja": _dias_deuda(movs, hoy)} for id_, movs in _por_cliente(db, negocio_id).items()]
    clave = "saldo" if orden == "monto" else "dias_deuda_mas_vieja"
    return sorted((f for f in filas if f["saldo"] > 0), key=lambda f: (f[clave], f["saldo"]), reverse=True)


def movimientos(db: Session, negocio_id: int, *, turno_id: int | None = None, caja_id: int | None = None,
                tipo: str | None = None, cliente_id: int | None = None, desde: date | None = None,
                hasta: date | None = None, pagina: int = 1) -> dict:
    """GET /movimientos: nuevos primero, de a POR_PAGINA. `desde` y `hasta` van contra corresponde_a_fecha."""
    pagina = max(pagina, 1)
    consulta = select(Movimiento).where(Movimiento.negocio_id == negocio_id, *_si(
        (Movimiento.turno_id, eq, turno_id), (Movimiento.caja_id, eq, caja_id), (Movimiento.tipo, eq, tipo),
        (Movimiento.cliente_id, eq, cliente_id), (Movimiento.corresponde_a_fecha, ge, desde),
        (Movimiento.corresponde_a_fecha, le, hasta)))
    total = db.scalar(select(func.count()).select_from(consulta.subquery()))
    items = db.scalars(consulta.order_by(Movimiento.id.desc()).offset((pagina - 1) * POR_PAGINA).limit(POR_PAGINA))
    return {"items": items.all(), "total": total, "pagina": pagina}


# --- Reportes (§8.6): campos provisorios hasta la pantalla del CP4 (D13) ---
def _arqueos_por_dia(negocio_id: int, *condiciones):
    return (select(Arqueo).join(Turno, Arqueo.turno_id == Turno.id).join(DiaOperativo, Turno.dia_id == DiaOperativo.id)
            .where(Arqueo.negocio_id == negocio_id, *condiciones))


def reporte_dia(db: Session, negocio_id: int, fecha: date) -> dict:
    """GET /reportes/dia/{fecha}: totales por tipo de lo que corresponde a esa fecha (con ajustes tardíos), apuestas
    (quiniela y otros juegos), boletas (premios pagados) y los arqueos del día."""
    totales = dict(db.execute(select(Movimiento.tipo, func.sum(Movimiento.monto)).where(
        *_vivos(negocio_id), Movimiento.corresponde_a_fecha == fecha).group_by(Movimiento.tipo)).all())
    return {"fecha": fecha, "totales_por_tipo": totales, "apuestas": sum(totales.get(t, 0) for t in VENTAS),
            "boletas": totales.get("pago_premio", 0),
            "arqueos": db.scalars(_arqueos_por_dia(negocio_id, DiaOperativo.fecha == fecha).order_by(Arqueo.id)).all()}


def diferencias(db: Session, negocio_id: int, desde: date | None = None, hasta: date | None = None,
                caja_id: int | None = None, turno: str | None = None) -> list[Arqueo]:
    """GET /reportes/diferencias: todos los arqueos con su estado, nuevos primero. `turno` es mañana o noche."""
    return db.scalars(_arqueos_por_dia(negocio_id, *_si(
        (DiaOperativo.fecha, ge, desde), (DiaOperativo.fecha, le, hasta), (Arqueo.caja_id, eq, caja_id),
        (Turno.nombre, eq, turno))).order_by(Arqueo.id.desc())).all()


def mercado_pago(db: Session, negocio_id: int) -> dict:
    """GET /reportes/mercado-pago: lo cobrado por Mercado Pago desde el último ingreso_del_dueno, que es cuando el
    dueño trae esa plata del banco (§5.2). Sin ingresos todavía, desde el principio (`desde` None)."""
    desde = db.scalar(select(func.max(Movimiento.creado_en)).where(*_vivos(negocio_id),
                                                                   Movimiento.tipo == "ingreso_del_dueno"))
    acumulado = db.scalar(select(func.coalesce(func.sum(Movimiento.monto), 0)).where(
        *_vivos(negocio_id), Movimiento.tipo == "cobro_mercado_pago", *_si((Movimiento.creado_en, gt, desde))))
    return {"acumulado": acumulado, "desde": desde}


def ventas_por_juego(db: Session, negocio_id: int, desde: date | None = None, hasta: date | None = None,
                     agrupar: str = "dia") -> list[dict]:
    """GET /reportes/ventas-por-juego: lo vendido según los tickets, por periodo y juego. La quiniela va con el id
    del juego marcado es_quiniela (0 si no hay): en el movimiento no lleva juego."""
    quiniela = db.scalar(select(Juego.id).where(Juego.negocio_id == negocio_id, Juego.es_quiniela.is_(True))) or 0
    ventas = select(Movimiento.corresponde_a_fecha, Movimiento.juego_id, func.sum(Movimiento.monto)).where(
        *_vivos(negocio_id), Movimiento.tipo.in_(VENTAS),
        *_si((Movimiento.corresponde_a_fecha, ge, desde), (Movimiento.corresponde_a_fecha, le, hasta)))
    totales = defaultdict(int)
    for fecha, juego_id, monto in db.execute(ventas.group_by(Movimiento.corresponde_a_fecha, Movimiento.juego_id)):
        totales[fecha.strftime(PERIODOS[agrupar]), juego_id or quiniela] += monto
    return [{"periodo": periodo, "juego_id": juego_id, "total": total}
            for (periodo, juego_id), total in sorted(totales.items())]


def rendiciones(db: Session, negocio_id: int, desde: date | None = None,
                hasta: date | None = None) -> list[LoteRendicion]:
    """GET /reportes/rendiciones: los lotes archivados, nuevos primero."""
    return db.scalars(select(LoteRendicion).where(
        LoteRendicion.negocio_id == negocio_id,
        *_si((LoteRendicion.fecha, ge, desde), (LoteRendicion.fecha, le, hasta))
    ).order_by(LoteRendicion.fecha.desc())).all()


def _resumen(db: Session, negocio_id: int, desde: date, hasta: date) -> dict:
    """Un mes de reporte_mes: ventas por juego, un total por tipo sin los internos y los arqueos de sus días. La
    diferencia suma solo los con_diferencia: la de un explicado ya está en el total de su tipo (D40)."""
    nombres = dict(db.execute(select(Juego.id, Juego.nombre).where(Juego.negocio_id == negocio_id)).all())
    tipos = dict(db.execute(select(Movimiento.tipo, func.sum(Movimiento.monto)).where(
        *_vivos(negocio_id), Movimiento.corresponde_a_fecha.between(desde, hasta)).group_by(Movimiento.tipo)).all())
    arqueos = db.scalars(_arqueos_por_dia(negocio_id, DiaOperativo.fecha.between(desde, hasta))).all()
    estados = [a.estado for a in arqueos]
    abiertos = [a for a in arqueos if a.estado == "con_diferencia"]
    efectivo, boletas = sum(a.diferencia_efectivo for a in abiertos), sum(a.diferencia_boletas for a in abiertos)
    return {"ventas_por_juego": [{"juego_id": v["juego_id"], "nombre": nombres.get(v["juego_id"], "Quiniela"),
                                  "total": v["total"]} for v in ventas_por_juego(db, negocio_id, desde, hasta, "mes")],
            "total_vendido": sum(tipos.get(t, 0) for t in VENTAS),
            **{clave: tipos.get(tipo, 0) for clave, tipo in TOTALES_MES.items()},
            "arqueos_hechos": len(arqueos), "arqueos_cuadran": estados.count("cuadra"),
            "arqueos_con_diferencia": estados.count("con_diferencia"), "arqueos_explicados": estados.count("explicada"),
            "diferencia_efectivo": efectivo, "diferencia_boletas": boletas, "diferencia_total": efectivo + boletas}


def reporte_mes(db: Session, negocio_id: int, mes: date) -> dict:
    """GET /reportes/mes/{mes} (D39), `mes` el primer día: ese mes y el anterior con la misma forma, lo que deben hoy
    los clientes y las ventas de cada día del mes, 0 si no hubo. Los movimientos van por corresponde_a_fecha y los
    arqueos por su día operativo; traspasos y rendición quedan afuera (internos)."""
    ultimo = (mes + timedelta(days=31)).replace(day=1) - timedelta(days=1)
    por_dia = dict(db.execute(select(Movimiento.corresponde_a_fecha, func.sum(Movimiento.monto)).where(
        *_vivos(negocio_id), Movimiento.tipo.in_(VENTAS), Movimiento.corresponde_a_fecha.between(mes, ultimo))
        .group_by(Movimiento.corresponde_a_fecha)).all())
    dias = (mes + timedelta(days=i) for i in range(ultimo.day))
    return {"mes": mes.strftime(PERIODOS["mes"]), "actual": _resumen(db, negocio_id, mes, ultimo),
            "anterior": _resumen(db, negocio_id, (mes - timedelta(days=1)).replace(day=1), mes - timedelta(days=1)),
            "deuda_total_hoy": sum(d["saldo"] for d in deudores(db, negocio_id)),
            "ventas_por_dia": [{"fecha": d, "total": por_dia.get(d, 0)} for d in dias]}
