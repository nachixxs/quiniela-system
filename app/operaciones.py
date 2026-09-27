"""Operaciones de escritura del contrato: validan, guardan con commit y dejan toda cuenta a motor.py. Cada
query filtra por negocio_id, que sale de la sesión (§7.4).
Errores de dominio, sin HTTP: NoEncontrado (404), Invalido (400) y Conflicto (409), con `codigo` corto y
`detalle` para el usuario; la capa HTTP los traduce a {"error": codigo, "detalle": detalle}."""
from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, or_, select, true
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import motor
from app.modelos import Arqueo, Caja, Cliente, DiaOperativo, Juego, LoteRendicion, Movimiento, Turno

VENTAS = ("apuesta_quiniela", "venta_otro_juego")  # salen solo del ticket (D15)
TIPOS_CARGA = set(motor.EFECTOS) - set(VENTAS) - {"traspaso", "traspaso_boletas", "rendicion_boletas"}
DESGLOSE = {"quiniela": ("apuesta_quiniela",), "otros_juegos": ("venta_otro_juego",), "fiados": ("fiado",),
            "cobros": ("cobro_fiado", "cobro_subagente", "ingreso_del_dueno"),
            "mercado_pago": ("cobro_mercado_pago",), "premios": ("pago_premio",),
            "otros_pagos": ("gasto", "retiro_dueno", "sueldo", "pago_banco")}  # suma el esperado del ticket (D20)
COPIA = ("negocio_id", "dia_id", "turno_id", "caja_id", "tipo", "monto", "juego_id", "cliente_id", "contraparte",
         "nota", "corresponde_a_fecha", "explica_arqueo_id")  # lo que el contra-asiento copia del original
ARGENTINA = timezone(timedelta(hours=-3))  # la fecha del local, no la del servidor


class ErrorDominio(Exception):
    def __init__(self, codigo: str, detalle: str):
        super().__init__(detalle)
        self.codigo, self.detalle = codigo, detalle


class NoEncontrado(ErrorDominio): ...
class Invalido(ErrorDominio): ...
class Conflicto(ErrorDominio): ...


def obtener(db: Session, modelo, negocio_id: int, id_: int, bloquear: bool = False):
    consulta = select(modelo).where(modelo.id == id_, modelo.negocio_id == negocio_id)
    fila = db.scalar(consulta.with_for_update() if bloquear else consulta)
    if fila is None:
        raise NoEncontrado("no_encontrado", f"No existe {modelo.__tablename__.replace('_', ' ')} {id_}.")
    return fila


def control(db: Session, negocio_id: int, caja: Caja) -> tuple[list[motor.Mov], tuple[int, int]]:
    """(movimientos que tocan `caja` desde su último arqueo, lo contado en él): el re-anclaje de §6."""
    ultimo = db.scalar(select(Arqueo).where(Arqueo.negocio_id == negocio_id, Arqueo.caja_id == caja.id)
                       .order_by(Arqueo.id.desc()).limit(1))
    padres = dict(db.execute(select(Caja.id, Caja.caja_padre_id).where(Caja.negocio_id == negocio_id)).all())
    filas = db.scalars(select(Movimiento).where(Movimiento.negocio_id == negocio_id,
                                                Movimiento.creado_en > ultimo.momento if ultimo else true()))
    movs = [m for m in (_mov(f, padres) for f in filas) if caja.id in (m.caja_id, m.destino_id)]
    return movs, (ultimo.efectivo_contado, ultimo.boletas_contadas) if ultimo else (0, 0)


def _mov(m: Movimiento, padres: dict) -> motor.Mov:
    destino = padres.get(m.caja_id) if m.tipo.startswith("traspaso") else None  # la caja padre (§5.4)
    return motor.Mov(m.tipo, m.monto, m.caja_id, destino, m.cliente_id, m.anula_id, m.es_ajuste)


def _turno(db: Session, negocio_id: int, abierto: bool = True) -> Turno:
    """Primer turno abierto del día abierto; con `abierto=False` y ninguno abierto, el último (traspaso 20:20).
    Bloquea el día y sus turnos hasta el commit: se llama antes de leer, y dos escrituras del negocio van en fila."""
    turnos = db.scalars(select(Turno).join(DiaOperativo, Turno.dia_id == DiaOperativo.id).where(
        Turno.negocio_id == negocio_id, DiaOperativo.estado == "abierto").order_by(Turno.id)
        .with_for_update(of=(Turno, DiaOperativo))).all()
    candidatos = [t for t in turnos if t.estado == "abierto"] or ([] if abierto else turnos[-1:])
    if not candidatos:
        raise Conflicto("sin_turno_abierto", "No hay un turno abierto.")
    return candidatos[0]


def _nuevo(db: Session, turno: Turno, caja_id: int, tipo: str, monto: int, fecha: date | None = None, **campos):
    """Movimiento del turno; con `fecha` es un ajuste tardío, que no entra en el esperado de hoy (§7.8)."""
    if fecha is not None and fecha >= db.get(DiaOperativo, turno.dia_id).fecha:  # D22
        raise Invalido("ajuste_invalido", "Un ajuste tiene que corresponder a una fecha anterior al día abierto.")
    m = Movimiento(negocio_id=turno.negocio_id, dia_id=turno.dia_id, turno_id=turno.id, caja_id=caja_id, tipo=tipo,
                   monto=monto, corresponde_a_fecha=fecha or db.get(DiaOperativo, turno.dia_id).fecha,
                   es_ajuste=fecha is not None, **campos)
    db.add(m)
    return m


def _contra(db: Session, m: Movimiento, motivo: str) -> Movimiento:
    """Contra-asiento (§7.1, D8): copia del original con anula_id y motivo; el original no se toca. Si su caja
    se arqueó después de él, va como ajuste: aquel arqueo ya lo contó y re-ancló (cierre del CP1)."""
    arqueado = db.scalar(select(Arqueo.id).where(Arqueo.negocio_id == m.negocio_id, Arqueo.caja_id == m.caja_id,
                                                 Arqueo.momento > m.creado_en).limit(1))
    contra = Movimiento(**{c: getattr(m, c) for c in COPIA}, es_ajuste=m.es_ajuste or arqueado is not None,
                        anula_id=m.id, motivo_anulacion=motivo)
    db.add(contra)
    return contra


def _reexplicar(db: Session, negocio_id: int, arqueo_id: int) -> None:
    """§7.8: el arqueo pasa a explicada cuando sus ajustes, con sus contra-asientos, cubren la diferencia."""
    arqueo = obtener(db, Arqueo, negocio_id, arqueo_id)
    ajustes = db.scalars(select(Movimiento).where(Movimiento.negocio_id == negocio_id,
                                                  Movimiento.explica_arqueo_id == arqueo.id))
    arqueo.estado = motor.estado((arqueo.diferencia_efectivo, arqueo.diferencia_boletas), arqueo.caja_id,
                                 [_mov(m, {}) for m in ajustes])


def abrir_dia(db: Session, negocio_id: int, fecha: date | None = None) -> tuple[DiaOperativo, list[Turno]]:
    """POST /dia/abrir: hoy (o `fecha`) con sus dos turnos abiertos (D3b). Un día abierto por vez."""
    fecha = fecha or datetime.now(ARGENTINA).date()
    if db.scalar(select(DiaOperativo.id).where(DiaOperativo.negocio_id == negocio_id,
                                               or_(DiaOperativo.estado == "abierto", DiaOperativo.fecha == fecha))):
        raise Conflicto("dia_existente", "Hay un día abierto, o ese día ya se abrió: un día cerrado no se reabre.")
    dia = DiaOperativo(negocio_id=negocio_id, fecha=fecha)
    db.add(dia)
    try:
        db.flush()
    except IntegrityError:  # doble "Abrir día": el otro ganó la carrera por UniqueConstraint(negocio_id, fecha)
        db.rollback()
        raise Conflicto("dia_existente", "Ya hay un día abierto para esa fecha.")
    turnos = [Turno(negocio_id=negocio_id, dia_id=dia.id, nombre=nombre) for nombre in ("mañana", "noche")]
    db.add_all(turnos)
    db.commit()
    return dia, turnos


def cerrar_dia(db: Session, negocio_id: int, dia_id: int) -> None:
    """POST /dia/{id}/cerrar: no cierra con turnos abiertos (§7.7) y no tiene vuelta atrás (§7.8)."""
    dia = obtener(db, DiaOperativo, negocio_id, dia_id, bloquear=True)  # en fila con _turno
    if db.scalar(select(Turno.id).where(Turno.negocio_id == negocio_id, Turno.dia_id == dia.id,
                                        Turno.estado == "abierto")):
        raise Conflicto("turnos_abiertos", "Un día no se cierra con turnos abiertos: falta arquear la caja chica.")
    dia.estado = "cerrado"
    db.commit()


def crear_movimiento(db: Session, negocio_id: int, *, ref_cliente: UUID, tipo: str, monto: int, caja_id: int,
                     cliente_id: int | None = None, contraparte: str | None = None, nota: str | None = None,
                     corresponde_a_fecha: date | None = None, explica_arqueo_id: int | None = None) -> Movimiento:
    """POST /movimientos, en el turno abierto. Un `ref_cliente` repetido devuelve el que ya existe, sin crear otro."""
    por_ref = select(Movimiento).where(Movimiento.negocio_id == negocio_id, Movimiento.ref_cliente == ref_cliente)
    if (previo := db.scalar(por_ref)) is not None:
        return previo
    if monto <= 0:
        raise Invalido("monto_invalido", "El monto tiene que ser mayor a cero.")
    if cliente_id is None and tipo in ("fiado", "cobro_fiado"):
        raise Invalido("falta_cliente", "Un fiado o un cobro de fiado lleva cliente.")
    caja = obtener(db, Caja, negocio_id, caja_id)
    if tipo == "cobro_subagente" and caja.tipo == "operativa":
        raise Invalido("subagente_en_caja_operativa", "Los subagentes se reciben solo en la caja grande (D10).")
    if cliente_id is not None:
        obtener(db, Cliente, negocio_id, cliente_id)
    if explica_arqueo_id is not None and (corresponde_a_fecha is None  # D14
                                          or obtener(db, Arqueo, negocio_id, explica_arqueo_id).caja_id != caja.id):
        raise Invalido("ajuste_invalido", "Solo un ajuste tardío de la misma caja explica un arqueo (§7.8).")
    m = _nuevo(db, _turno(db, negocio_id), caja.id, tipo, monto, corresponde_a_fecha, cliente_id=cliente_id,
               contraparte=contraparte, nota=nota, explica_arqueo_id=explica_arqueo_id, ref_cliente=ref_cliente)
    try:
        db.flush()
    except IntegrityError:  # otro request con el mismo ref_cliente ganó la carrera: se devuelve el suyo
        db.rollback()
        return db.scalars(por_ref).one()
    if explica_arqueo_id is not None:
        _reexplicar(db, negocio_id, explica_arqueo_id)
    db.commit()
    return m


def crear_cliente(db: Session, negocio_id: int, nombre: str, alias: str | None = None,
                  telefono: str | None = None) -> Cliente:
    """POST /clientes. Nace con saldo 0: el saldo no se guarda, se calcula (§5.6)."""
    if not nombre.strip():
        raise Invalido("falta_nombre", "El cliente lleva nombre.")
    cliente = Cliente(negocio_id=negocio_id, nombre=nombre.strip(), alias=alias, telefono=telefono)
    db.add(cliente)
    db.commit()
    return cliente


def anular_movimiento(db: Session, negocio_id: int, movimiento_id: int, motivo: str) -> Movimiento:
    """POST /movimientos/{id}/anular: devuelve el contra-asiento. Las ventas se corrigen recargando el ticket."""
    m = obtener(db, Movimiento, negocio_id, movimiento_id)
    obtener(db, Turno, negocio_id, m.turno_id, bloquear=True)  # no pasa por _turno: en fila con los de su día
    if not motivo.strip():
        raise Invalido("falta_motivo", "La anulación lleva motivo (§7.1).")
    if m.tipo not in TIPOS_CARGA:
        raise Invalido("tipo_no_anulable", "Las ventas se corrigen con el ticket; traspaso y rendición no se anulan.")
    if m.anula_id is not None:
        raise Conflicto("es_contra_asiento", "Un contra-asiento no se anula: restaría dos veces.")
    if db.scalar(select(Movimiento.id).where(Movimiento.negocio_id == negocio_id, Movimiento.anula_id == m.id)):
        raise Conflicto("ya_anulado", "Ese movimiento ya está anulado.")
    contra = _contra(db, m, motivo)
    if contra.explica_arqueo_id is not None:
        _reexplicar(db, negocio_id, contra.explica_arqueo_id)
    db.commit()
    return contra


def traspasar(db: Session, negocio_id: int, caja_origen_id: int) -> dict:
    """POST /traspaso: sube a la caja padre lo contado en el último arqueo, en dos filas (D9). Lo cargado después de
    ese arqueo es del turno siguiente y se queda en la caja (DIA-SIMULADO). Devuelve lo movido."""
    caja = obtener(db, Caja, negocio_id, caja_origen_id)
    if caja.caja_padre_id is None:
        raise Invalido("sin_caja_padre", "Esta caja no traspasa a otra.")
    turno = _turno(db, negocio_id, abierto=False)
    movs, (efectivo, boletas) = control(db, negocio_id, caja)
    if any(m.tipo.startswith("traspaso") and m.caja_id == caja.id for m in movs):
        raise Conflicto("ya_traspasado", "Lo contado en el último arqueo ya se traspasó: primero arqueá la caja.")
    for tipo, monto in (("traspaso", efectivo), ("traspaso_boletas", boletas)):
        if monto:
            _nuevo(db, turno, caja.id, tipo, monto)
    db.commit()
    return {"efectivo": efectivo, "boletas": boletas}


def cargar_ticket(db: Session, negocio_id: int, turno_id: int, quiniela: int, juegos: list[dict]) -> dict:
    """POST /turno/{id}/ticket, `juegos` = [{juego_id, monto}], acumulado del día (D17): las ventas del turno son la
    resta contra el ticket del turno anterior; recargar anula las previas. Devuelve el esperado (§7.3) y desglose."""
    turno = _turno(db, negocio_id)
    if turno.id != turno_id:
        raise Conflicto("turno_no_actual", "El ticket se carga en el turno abierto.")
    validos = set(db.scalars(select(Juego.id).where(Juego.negocio_id == negocio_id)))
    if any(j["juego_id"] not in validos for j in juegos):
        raise NoEncontrado("no_encontrado", "Ese juego no existe.")
    anterior = db.scalar(select(Turno).where(Turno.negocio_id == negocio_id, Turno.dia_id == turno.dia_id,
                                             Turno.id < turno.id).order_by(Turno.id.desc()).limit(1))
    if anterior is not None and anterior.ticket_terminal is None:
        raise Conflicto("falta_ticket_anterior", "El ticket es acumulado del día: primero va el del turno anterior.")
    base = anterior.ticket_terminal if anterior else {"quiniela": 0, "juegos": []}
    ventas = {None: quiniela - base["quiniela"]}  # por juego_id; None es la quiniela
    for signo, lista in ((1, juegos), (-1, base["juegos"])):
        for j in lista:
            ventas[j["juego_id"]] = ventas.get(j["juego_id"], 0) + signo * j["monto"]
    if ventas[None] <= 0 or min(ventas.values()) < 0:
        raise Invalido("ticket_invalido", "Revisá el ticket: es acumulado del día y ningún total puede bajar.")
    caja = db.scalar(select(Caja).where(Caja.negocio_id == negocio_id, Caja.tipo == "operativa"))
    previas = db.scalars(select(Movimiento).where(Movimiento.negocio_id == negocio_id, Movimiento.turno_id == turno.id,
                                                  Movimiento.tipo.in_(VENTAS))).all()
    anuladas = {m.anula_id for m in previas}
    for m in previas:
        if m.anula_id is None and m.id not in anuladas:
            _contra(db, m, "Ticket recargado")
    for juego_id, monto in ventas.items():
        if monto:
            tipo = "venta_otro_juego" if juego_id else "apuesta_quiniela"
            _nuevo(db, turno, caja.id, tipo, monto, juego_id=juego_id)
    turno.ticket_terminal = {"quiniela": quiniela, "juegos": juegos}
    movs, partida = control(db, negocio_id, caja)
    efectivo, boletas = motor.esperado(caja.id, movs, partida, operativa=True)
    db.commit()
    return {"esperado": {"efectivo": efectivo, "boletas": boletas}, "desglose": {
        clave: motor.saldo(caja.id, [m for m in movs if m.tipo in tipos])[0] for clave, tipos in DESGLOSE.items()}}


def guardar_arqueo(db: Session, negocio_id: int, caja_id: int, turno_id: int, efectivo_contado: int,
                   boletas_contadas: int, nota: str | None = None) -> Arqueo:
    """POST /arqueo (§6, §7.2, D2): se guarda siempre y re-ancla la caja; en la operativa cierra el turno (§7.7)."""
    caja = obtener(db, Caja, negocio_id, caja_id)
    operativa = caja.tipo == "operativa"
    if operativa and turno_id != _turno(db, negocio_id).id:
        raise Conflicto("turno_no_actual", "El arqueo de la caja chica cierra el turno abierto.")
    turno = obtener(db, Turno, negocio_id, turno_id, bloquear=True)  # la grande no pasa por _turno
    if turno.dia_id != db.scalar(select(func.max(DiaOperativo.id)).where(DiaOperativo.negocio_id == negocio_id)):
        raise Conflicto("turno_no_actual", "El arqueo va en un turno del día actual: un faltante no pasa a otro día.")
    if efectivo_contado < 0 or boletas_contadas < 0:
        raise Invalido("monto_invalido", "Lo contado no puede ser negativo.")
    esperado = motor.esperado(caja.id, *control(db, negocio_id, caja), operativa)
    if esperado is None:  # §7.3: sin ticket no hay esperado, y no se guarda nada
        raise Conflicto("sin_ticket", "Sin el ticket de la terminal no hay esperado: cargalo antes del arqueo.")
    arqueo = Arqueo(negocio_id=negocio_id, caja_id=caja.id, turno_id=turno.id, nota=nota,
                    **motor.arqueo(esperado, (efectivo_contado, boletas_contadas)))
    db.add(arqueo)
    if operativa:
        turno.estado = "cerrado"
    db.commit()
    return arqueo


def rendir(db: Session, negocio_id: int, boletas_contadas: int) -> LoteRendicion:
    """POST /rendicion (§5.3), en la caja central: valida lo contado contra sus boletas (arqueo de anoche +
    traspaso), crea el lote y una rendicion_boletas por ese saldo, que la deja en cero. Una por día."""
    if boletas_contadas < 0:
        raise Invalido("monto_invalido", "Lo contado no puede ser negativo.")
    turno = _turno(db, negocio_id, abierto=False)
    fecha = db.get(DiaOperativo, turno.dia_id).fecha
    if db.scalar(select(LoteRendicion.id).where(LoteRendicion.negocio_id == negocio_id, LoteRendicion.fecha == fecha)):
        raise Conflicto("rendicion_hecha", "La rendición de hoy ya está hecha.")
    caja = db.scalar(select(Caja).where(Caja.negocio_id == negocio_id, Caja.tipo == "central"))
    del_negocio = Movimiento.negocio_id == negocio_id
    desde = db.scalar(select(func.max(Movimiento.creado_en)).where(del_negocio, Movimiento.tipo == "rendicion_boletas"))
    premios = db.scalars(select(Movimiento.anula_id).where(  # los pagos de premio desde la rendición anterior
        del_negocio, Movimiento.tipo == "pago_premio", Movimiento.creado_en > desde if desde else true()))
    lote = LoteRendicion(negocio_id=negocio_id, fecha=fecha, cantidad_boletas=sum(-1 if a else 1 for a in premios),
                         **motor.rendicion(caja.id, *control(db, negocio_id, caja), boletas_contadas))
    db.add(lote)
    if lote.total_esperado > 0:
        _nuevo(db, turno, caja.id, "rendicion_boletas", lote.total_esperado)
    db.commit()
    return lote
