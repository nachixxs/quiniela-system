"""Las seis tools del asistente (SPECS §11): solo leen, sobre consultas.py o lecturas propias. `negocio_id` lo pone
el código desde la sesión y no está en ningún input_schema (§11.4). La plata la cuenta el código, nunca el modelo:
el diagnóstico de un arqueo (6.2) arma acá los candidatos y el modelo solo los redacta."""
import json
from collections import Counter
from datetime import date, datetime
from typing import get_args

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app import consultas
from app.modelos import Arqueo, Caja, DiaOperativo, Movimiento, TipoMovimiento, Turno
from app.operaciones import ARGENTINA, NoEncontrado, obtener

FECHA = {"type": "string", "description": "YYYY-MM-DD"}
TIPOS = list(get_args(TipoMovimiento))


def _schema(**props) -> dict:
    return {"type": "object", "properties": props, "additionalProperties": False}


TOOLS = [
    {"name": "clientes", "description": "Con `nombre`: los clientes que coinciden (nombre o alias) con su saldo; si "
     "hay uno solo, también sus últimos movimientos. Sin `nombre`: los deudores. Saldo positivo = debe; negativo = "
     "a favor.", "input_schema": _schema(nombre={"type": "string"}, orden={"enum": ["monto", "antiguedad"]})},
    {"name": "movimientos", "description": "Movimientos de un día (por defecto hoy), opcionalmente de un turno, una "
     "caja (por nombre, ej. 'chica') o un tipo. Nuevos primero, hasta 50. Un movimiento `anulado` no cuenta.",
     "input_schema": _schema(fecha=FECHA, turno={"enum": ["mañana", "noche"]}, caja={"type": "string"},
                             tipo={"enum": TIPOS})},
    {"name": "reporte", "description": "Con `periodo` YYYY-MM-DD: cierre del día (totales por tipo y arqueos). Con "
     "YYYY-MM: cierre del mes y del anterior, deuda total de clientes hoy y ventas por día.",
     "input_schema": {**_schema(periodo={"type": "string"}), "required": ["periodo"]}},
    {"name": "mercado_pago", "description": "Mercado Pago acumulado desde la última vez que el dueño trajo esa "
     "plata del banco (`desde`).", "input_schema": _schema()},
    {"name": "diferencias", "description": "Arqueos con diferencia (contado − esperado: negativa falta, positiva "
     "sobra), nuevos primero, hasta 30, con las cargas tardías que los explicaron.",
     "input_schema": _schema(desde=FECHA, hasta=FECHA)},
    {"name": "diagnosticar_arqueo", "description": "Checklist de un arqueo con diferencia: movimientos por el monto "
     "exacto, tipos que suelen estar y faltan, si es habitual o atípica y cómo se explicaron otras parecidas.",
     "input_schema": {**_schema(arqueo_id={"type": "integer"}), "required": ["arqueo_id"]}},
]


def _hora(momento) -> str:
    return momento.astimezone(ARGENTINA).strftime("%H:%M")


def _movs(db: Session, n: int, movs) -> list[dict]:
    """Compacto y sin vacíos. `anulado`: tiene contra-asiento; `anula_a`: es el contra-asiento de otro (§7.1)."""
    anulados = set(db.scalars(select(Movimiento.anula_id).where(
        Movimiento.negocio_id == n, Movimiento.anula_id.in_([m.id for m in movs]))))
    cajas = dict(db.execute(select(Caja.id, Caja.nombre).where(Caja.negocio_id == n)).all())
    filas = [{"id": m.id, "fecha": str(m.corresponde_a_fecha), "hora": _hora(m.creado_en), "caja": cajas[m.caja_id],
              "tipo": m.tipo, "monto": m.monto, "cliente": m.cliente_nombre, "contraparte": m.contraparte,
              "nota": m.nota, "ajuste_tardio": m.es_ajuste, "anula_a": m.anula_id, "anulado": m.id in anulados}
             for m in movs]
    return [{k: v for k, v in f.items() if v not in (None, False)} for f in filas]


def _arqueos(db: Session, n: int, arqueos) -> list[dict]:
    """Con las cargas tardías que los explican (§7.8)."""
    ajustes = db.scalars(select(Movimiento).where(
        Movimiento.negocio_id == n, Movimiento.explica_arqueo_id.in_([a.id for a in arqueos]))).all()
    filas = []
    for a in arqueos:
        turno = db.get(Turno, a.turno_id)
        filas.append({"id": a.id, "fecha": str(db.get(DiaOperativo, turno.dia_id).fecha), "turno": turno.nombre,
                      "caja": db.get(Caja, a.caja_id).nombre, "hora": _hora(a.momento),
                      "efectivo_esperado": a.efectivo_esperado, "efectivo_contado": a.efectivo_contado,
                      "diferencia_efectivo": a.diferencia_efectivo, "boletas_esperadas": a.boletas_esperadas,
                      "boletas_contadas": a.boletas_contadas, "diferencia_boletas": a.diferencia_boletas,
                      "estado": a.estado, "nota": a.nota,
                      "explicado_por": _movs(db, n, [m for m in ajustes if m.explica_arqueo_id == a.id])})
    return filas


def clientes(db: Session, n: int, nombre: str = "", orden: str = "monto") -> dict:
    if not nombre.strip():
        return {"deudores": [{k: d[k] for k in ("nombre", "saldo", "dias_deuda_mas_vieja")}
                             for d in consultas.deudores(db, n, orden)[:30]]}
    encontrados = consultas.buscar_clientes(db, n, nombre)[:5]
    if len(encontrados) != 1:
        return {"clientes": [{"nombre": c["nombre"], "saldo": c["saldo"]} for c in encontrados]}
    c = consultas.cliente(db, n, encontrados[0]["id"])
    return {"cliente": c["nombre"], "saldo": c["saldo"], "ultimos_movimientos": _movs(db, n, c["movimientos"][:10])}


def movimientos(db: Session, n: int, fecha: str | None = None, turno: str | None = None, caja: str | None = None,
                tipo: str | None = None) -> dict:
    dia = date.fromisoformat(fecha) if fecha else datetime.now(ARGENTINA).date()
    filtros = {"tipo": tipo, "desde": dia, "hasta": dia}
    if turno:  # el turno ya fija el día, y así entran sus ajustes tardíos de otra fecha
        filtros.update(desde=None, hasta=None, turno_id=db.scalar(
            select(Turno.id).join(DiaOperativo, Turno.dia_id == DiaOperativo.id).where(
                Turno.negocio_id == n, DiaOperativo.fecha == dia, Turno.nombre == turno)))
        if filtros["turno_id"] is None:
            raise NoEncontrado("no_encontrado", f"No hay turno {turno} el {dia}.")
    if caja:
        filtros["caja_id"] = db.scalar(select(Caja.id).where(Caja.negocio_id == n, Caja.nombre.ilike(f"%{caja}%"))
                                       .limit(1))
        if filtros["caja_id"] is None:
            raise NoEncontrado("no_encontrado", f"No hay una caja '{caja}'.")
    pagina = consultas.movimientos(db, n, **filtros)
    return {"total": pagina["total"], "movimientos": _movs(db, n, pagina["items"])}


def reporte(db: Session, n: int, periodo: str) -> dict:
    if len(periodo) == 7:
        r = consultas.reporte_mes(db, n, date.fromisoformat(f"{periodo}-01"))
        return {**r, "ventas_por_dia": [v for v in r["ventas_por_dia"] if v["total"]]}
    r = consultas.reporte_dia(db, n, date.fromisoformat(periodo))
    return {**r, "arqueos": _arqueos(db, n, r["arqueos"])}


def mercado_pago(db: Session, n: int) -> dict:
    r = consultas.mercado_pago(db, n)
    desde = r["desde"] and r["desde"].astimezone(ARGENTINA)
    return {"acumulado": r["acumulado"], "desde": desde and f"{desde:%Y-%m-%d %H:%M}"}


def diferencias(db: Session, n: int, desde: str | None = None, hasta: str | None = None) -> dict:
    arqueos = consultas.diferencias(db, n, desde and date.fromisoformat(desde), hasta and date.fromisoformat(hasta))
    return {"arqueos": _arqueos(db, n, [a for a in arqueos if a.estado != "cuadra"][:30])}


def _tam(a: Arqueo) -> int:
    return max(abs(a.diferencia_efectivo), abs(a.diferencia_boletas))


def diagnosticar_arqueo(db: Session, n: int, arqueo_id: int) -> dict:
    """El checklist de §11, en el código. Premios del ticket contra boletas: el ticket no trae premios (D20)."""
    a = obtener(db, Arqueo, n, arqueo_id)
    turno = db.get(Turno, a.turno_id)
    dia = db.get(DiaOperativo, turno.dia_id)
    ayer = db.scalar(select(DiaOperativo.id).where(DiaOperativo.negocio_id == n, DiaOperativo.fecha < dia.fecha)
                     .order_by(DiaOperativo.fecha.desc()).limit(1))
    montos = {abs(d) for d in (a.diferencia_efectivo, a.diferencia_boletas) if d}
    del_turno = and_(Movimiento.turno_id == turno.id, Movimiento.caja_id == a.caja_id)
    candidatos = db.scalars(select(Movimiento).where(*consultas._vivos(n), Movimiento.monto.in_(montos), or_(
        del_turno, and_(Movimiento.dia_id == dia.id, Movimiento.tipo == "fiado"),
        and_(Movimiento.dia_id == ayer, Movimiento.tipo == "cobro_fiado"))).order_by(Movimiento.id)).all()
    previos = db.scalars(select(Turno.id).join(DiaOperativo, Turno.dia_id == DiaOperativo.id).where(
        Turno.negocio_id == n, Turno.nombre == turno.nombre, DiaOperativo.fecha < dia.fecha)
        .order_by(DiaOperativo.fecha.desc()).limit(10)).all()
    tipos = db.execute(select(Movimiento.turno_id, Movimiento.tipo).distinct().where(
        Movimiento.negocio_id == n, Movimiento.caja_id == a.caja_id, Movimiento.anula_id.is_(None),
        Movimiento.turno_id.in_([*previos, turno.id]))).all()
    hoy = {tipo for t, tipo in tipos if t == turno.id}
    habituales = Counter(tipo for t, tipo in tipos if t != turno.id)
    previas = db.scalars(select(Arqueo).where(Arqueo.negocio_id == n, Arqueo.caja_id == a.caja_id, Arqueo.id < a.id,
                                              Arqueo.estado != "cuadra").order_by(Arqueo.id.desc()).limit(60)).all()
    tams = sorted(_tam(p) for p in previas)
    mediana = tams[len(tams) // 2] if tams else None
    return {
        "arqueo": _arqueos(db, n, [a])[0],
        "movimientos_por_el_monto": [{**m, "por": "mismo turno y caja" if c.turno_id == turno.id and
                                      c.caja_id == a.caja_id else "fiado de hoy" if c.tipo == "fiado" else
                                      "cobro de fiado de ayer"} for c, m in zip(candidatos, _movs(db, n, candidatos))],
        "tipos_que_suelen_estar_y_faltan": [{"tipo": t, "turnos_previos_con_ese_tipo": f"{c} de {len(previos)}"}
                                            for t, c in habituales.items()
                                            if t not in hoy and len(previos) >= 3 and c >= 0.8 * len(previos)],
        "historico": {"diferencias_previas": len(tams), "mediana": mediana, "maxima": tams[-1] if tams else None,
                      "esta_es": "sin_historial" if len(tams) < 3 else "atipica" if _tam(a) > 3 * mediana
                      else "habitual"},
        "parecidas_explicadas": _arqueos(db, n, [p for p in previas if p.estado == "explicada"
                                                 and abs(_tam(p) - _tam(a)) <= _tam(a) // 4][:5]),
        "no_revisado": "Premios del ticket contra boletas cargadas: el ticket de la terminal no trae los premios.",
    }


FUNCIONES = {"clientes": clientes, "movimientos": movimientos, "reporte": reporte, "mercado_pago": mercado_pago,
             "diferencias": diferencias, "diagnosticar_arqueo": diagnosticar_arqueo}


def ejecutar(db: Session, n: int, bloque) -> dict:
    """Un tool_use → su tool_result. `n` sale de la sesión; lo que elige el modelo son solo los filtros."""
    try:
        datos = FUNCIONES[bloque.name](db, n, **bloque.input)
        return {"type": "tool_result", "tool_use_id": bloque.id,
                "content": json.dumps(datos, ensure_ascii=False, default=str, separators=(",", ":"))}
    except Exception as e:  # noqa: BLE001 — una tool que falla le avisa al modelo, no rompe el pedido
        detalle = getattr(e, "detalle", None) or f"No se pudo consultar ({type(e).__name__})."
        return {"type": "tool_result", "tool_use_id": bloque.id, "content": detalle, "is_error": True}
