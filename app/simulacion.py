"""Mes simulado (CP7, D60): `python -m app.simulacion` carga, sobre una base sembrada, los días de lunes a sábado de
los 30 días que terminan ayer. Datos ficticios con los volúmenes y patrones de RELEVAMIENTO.md, todo por las
funciones de operaciones: las reglas se cumplen solas. Semilla fija: el mismo mes cada vez. Cada conteo es el
esperado que da el sistema más el error sembrado, nunca una cuenta propia."""
import os
import random
import sys
from datetime import date, datetime, time, timedelta
from functools import partial
from uuid import uuid4

from sqlalchemy import event, func, select

from app import consultas
from app import operaciones as op
from app.db import SessionLocal
from app.modelos import Arqueo, Caja, DiaOperativo, Juego, Movimiento, Negocio

SEMILLA = 2026
CLIENTES = ["Rubén Ficticio", "Marta Inventada", "Hugo Imaginario", "Norma Supuesta", "Carlos Inexistente",
            "Elsa Ficticia", "Raúl Inventado", "Gladys Imaginaria", "Omar Supuesto", "Teresa Inexistente",
            "Julio Ficticio", "Nélida Inventada", "Ramón Imaginario", "Susana Supuesta", "Alberto Inexistente",
            "Graciela Ficticia", "Héctor Inventado", "Mirta Imaginaria", "Oscar Supuesto", "Beatriz Inexistente"]
SUBAGENTES = ["Subagencia Los Álamos", "Subagencia El Trébol Inventado", "Subagencia Barrio Ficticio"]
DUENO, EMPLEADO = "Ernesto Ficticio", "Lucas Imaginario"
TELEKINO, CAFE, CADETE = 1500, 2000, 3000  # precio del cartón y gastos fijos, ficticios
SOBRANTE = "Sobrante chico: se anota y no se corrige"


def simular(db, n: int, dias: list[date], rng: random.Random) -> None:
    """Carga `dias`, en orden, en un negocio sin días. Cada día es una lista de eventos (minuto del día, función) que
    se corre en orden de hora; `sellar` pone creado_en y momento en esa hora del día simulado."""
    reloj = [datetime.combine(dias[0], time(), op.ARGENTINA)]

    def sellar(sesion, *_):  # en vez del clock_timestamp() de la base: la hora del día simulado, siempre creciente
        for obj in sesion.new:
            if isinstance(obj, (Movimiento, Arqueo)):
                reloj[0] += timedelta(seconds=1)
                setattr(obj, "creado_en" if isinstance(obj, Movimiento) else "momento", reloj[0])

    event.listen(db, "before_flush", sellar)
    cajas = {c.tipo: c.id for c in db.scalars(select(Caja).where(Caja.negocio_id == n))}
    grande, chica = cajas["central"], cajas["operativa"]
    juegos = dict(db.execute(select(Juego.nombre, Juego.id).where(Juego.negocio_id == n)).all())
    otros = [i for nombre, i in juegos.items() if nombre not in ("Quiniela", "Telekino")]
    clientes = [op.crear_cliente(db, n, nombre).id for nombre in CLIENTES]  # los dos primeros deben mucho
    deuda = dict.fromkeys(clientes, 0)  # solo para decidir cuánto paga cada uno

    def mov(tipo, monto, caja=chica, **campos):
        m = op.crear_movimiento(db, n, ref_cliente=uuid4(), tipo=tipo, monto=monto, caja_id=caja, **campos)
        if m.cliente_id:
            deuda[m.cliente_id] += monto if tipo == "fiado" else -monto
        return m

    def cobro(cliente, caja=chica, parte=1.0):  # paga lo que debe, o una parte, redondeado a 500
        if (monto := round(deuda[cliente] * parte / 500) * 500) > 0:
            mov("cobro_fiado", monto, caja, cliente_id=cliente)

    def tachado(cliente, monto):  # fiado y cobro del total en el mismo turno: el saldo da cero solo
        mov("fiado", monto, cliente_id=cliente)
        cobro(cliente)

    def mal_cargado(monto, malo, bueno):  # al cliente equivocado: se anula con motivo (§7.1) y se carga bien
        op.anular_movimiento(db, n, mov("fiado", monto, cliente_id=malo).id, "Era de otro cliente")
        deuda[malo] -= monto
        mov("fiado", monto, cliente_id=bueno)

    def subagente(nombre, debe, boletas):  # D9: cobro por lo que debe y pago_premio por las boletas que trae
        mov("cobro_subagente", debe, grande, contraparte=nombre)
        if boletas:
            mov("pago_premio", boletas, grande, contraparte=nombre)

    def esperado_grande():
        return next(c["esperado"] for c in consultas.cajas(db, n) if c["id"] == grande)

    def banco(objetivo):  # deposita lo que la grande tiene, según el sistema, por encima de `objetivo`
        if (monto := (esperado_grande()["efectivo"] - objetivo) // 10000 * 10000) > 0:
            mov("pago_banco", monto, grande, contraparte="Banco")

    def rendicion():  # el primer día no hay boletas de ayer
        if boletas := esperado_grande()["boletas"]:
            op.rendir(db, n, boletas)

    def arqueo_grande(turno, error=0):
        esperado = esperado_grande()
        op.guardar_arqueo(db, n, grande, turno, esperado["efectivo"] + error, esperado["boletas"])

    def cierre_chica(turno, quiniela, lista):  # 13:30 y 20:40: ticket, arqueo y, a veces, un sobrante chico
        esperado = op.cargar_ticket(db, n, turno, quiniela, lista)["esperado"]
        sobra = rng.randint(1, 10) * 100 if rng.random() < 0.25 else 0
        op.guardar_arqueo(db, n, chica, turno, esperado["efectivo"] + sobra, esperado["boletas"],
                          SOBRANTE if sobra else None)

    def turno_chica(desde, hasta, factor, anular=False):
        """Fiados, cobros, tachados, Mercado Pago y premios de un turno, entre dos minutos del día."""
        ev = []
        for _ in range(rng.randint(5, 15)):
            c = rng.choices(clientes, weights=[2, 2] + [1] * (len(clientes) - 2))[0]
            monto = rng.randint(10, 40) * 500 if c in clientes[:2] else rng.randint(4, 24) * 500
            ev.append((rng.randint(desde, hasta), partial(mov, "fiado", monto, cliente_id=c)))
        for _ in range(rng.randint(3, 9)):
            ev.append((rng.randint(desde, hasta), partial(cobro, rng.choice(clientes[2:]),
                                                          parte=rng.choice([1, 1, 0.5]))))
        if rng.random() < 0.3:
            ev.append((rng.randint(desde, hasta), partial(tachado, rng.choice(clientes[2:]), rng.randint(4, 16) * 500)))
        if anular:
            malo, bueno = rng.sample(clientes[2:], 2)
            ev.append((rng.randint(desde, hasta), partial(mal_cargado, rng.randint(4, 16) * 500, malo, bueno)))
        for _ in range(rng.randint(1, 4)):
            ev.append((rng.randint(desde, hasta), partial(mov, "cobro_mercado_pago", rng.randint(4, 30) * 500)))
        for _ in range(rng.randint(0, 5)):
            premio = round(rng.randint(5, 80) * factor) * 100
            ev.append((rng.randint(desde, hasta), partial(mov, "pago_premio", premio)))
        quiniela = round(rng.randint(130, 230) * 10 * factor) * 100
        ventas = {i: rng.randint(0, 12) * 500 for i in otros}
        telekino = {"juego_id": juegos["Telekino"], "monto": rng.randint(2, 8) * TELEKINO}  # por turno (D63)
        return ev, quiniela, ventas, telekino

    for i, fecha in enumerate(dias):
        dia, (manana, noche) = op.abrir_dia(db, n, fecha)
        factor = 1.3 if fecha.weekday() == 5 else 1  # sábado: más volumen
        ev = [(510, rendicion)]  # 8:30
        if i == 0:  # D45: el efectivo inicial de la grande, como lo trae el dueño
            ev.append((511, partial(mov, "ingreso_del_dueno", 1_500_000, grande, contraparte=DUENO,
                                    nota="Efectivo inicial de la caja grande")))
        for nombre in SUBAGENTES:
            if rng.random() < 0.75:
                ev.append((rng.randint(512, 534), partial(subagente, nombre, rng.randint(6, 40) * 5000,
                                                          rng.randint(0, 12) * 1000)))
        for c in clientes[:2]:  # las deudas grandes se pagan a la mañana en la grande
            if rng.random() < 0.15:
                ev.append((rng.randint(512, 534), partial(cobro, c, grande, rng.choice([0.6, 0.8, 1]))))
        if fecha.weekday() < 5:  # banco solo en día hábil, y el cadete que lleva el paquete
            ev += [(535, partial(banco, rng.randint(82, 117) * 10000)),  # 36 valores, como antes: no corre la semilla
                   (536, partial(mov, "gasto", CADETE, grande, contraparte="Cadete del banco"))]
        ev.append((537, partial(mov, "gasto", CAFE, grande, contraparte=DUENO, nota="Café")))
        error = rng.choice([-1, 1]) * rng.randint(2, 40) * 10 if rng.random() < 5 / 6 else 0
        ev.append((540, partial(arqueo_grande, manana.id, error)))  # 9:00
        acumulado = dict.fromkeys(otros, 0)
        quiniela_dia = 0
        for turno, desde, hasta, cierre in ((manana, 511, 805, 810), (noche, 990, 1235, 1240)):
            eventos, quiniela, ventas, telekino = turno_chica(desde, hasta, factor, turno is noche and i % 9 == 4)
            quiniela_dia += quiniela
            acumulado = {j: acumulado[j] + ventas[j] for j in otros}  # el ticket es acumulado del día (D17)
            lista = [{"juego_id": j, "monto": m} for j, m in acumulado.items()] + [telekino]
            ev += eventos + [(cierre, partial(cierre_chica, turno.id, quiniela_dia, lista))]
        if fecha.weekday() == 2:  # un traspaso parcial por semana, a mitad de la mañana (D65)
            ev.append((rng.randint(600, 720), partial(op.traspasar, db, n, chica, rng.randint(3, 6) * 10000)))
        ev.append((1020, partial(op.traspasar, db, n, chica)))  # 17:00, lo contado a la mañana
        if rng.random() < 0.7:
            ev.append((rng.randint(1025, 1160), partial(mov, "retiro_dueno", rng.randint(2, 10) * 10000, grande,
                                                        contraparte=DUENO)))
        if fecha.weekday() in (1, 4):
            ev.append((rng.randint(1025, 1160), partial(mov, "ingreso_del_dueno", rng.randint(5, 20) * 10000, grande,
                                                        contraparte=DUENO, nota="Trae lo de Mercado Pago")))
        if rng.random() < 0.4:  # lo que saca el empleado y se descuenta del sueldo
            ev.append((rng.randint(1025, 1160), partial(mov, "sueldo", rng.randint(2, 10) * 1000, grande,
                                                        contraparte=EMPLEADO)))
        if rng.random() < 0.15:
            ev.append((rng.randint(1025, 1160), partial(mov, "pago_premio", rng.randint(10, 40) * 1000, grande,
                                                        nota="Premio grande")))
        ev += [(1170, partial(arqueo_grande, noche.id)), (1241, partial(op.traspasar, db, n, chica))]  # 19:30, 20:41
        for minuto, accion in sorted(ev, key=lambda e: e[0]):
            reloj[0] = max(reloj[0], datetime.combine(fecha, time(minuto // 60, minuto % 60), op.ARGENTINA))
            accion()
        op.cerrar_dia(db, n, dia.id)
    event.remove(db, "before_flush", sellar)


def main():
    nombre = os.environ.get("SEED_NEGOCIO", "Quiniela La Estrella")
    hoy = datetime.now(op.ARGENTINA).date()
    dias = [d for d in (hoy - timedelta(days=k) for k in range(30, 0, -1)) if d.weekday() != 6]  # domingo cerrado
    with SessionLocal() as db:
        n = db.scalar(select(Negocio.id).where(Negocio.nombre == nombre))
        if n is None:
            sys.exit(f"No existe el negocio {nombre}: corré antes python -m app.seed.")
        if db.scalar(select(DiaOperativo.id).where(DiaOperativo.negocio_id == n).limit(1)):
            sys.exit(f"{nombre} ya tiene días cargados: la simulación no se mezcla con datos existentes.")
        simular(db, n, dias, random.Random(SEMILLA))
        movs = db.scalar(select(func.count()).select_from(Movimiento).where(Movimiento.negocio_id == n))
        con_diferencia = db.scalar(select(func.count()).select_from(Arqueo).where(Arqueo.negocio_id == n,
                                                                                  Arqueo.estado != "cuadra"))
        deuda = sum(d["saldo"] for d in consultas.deudores(db, n))
    print(f"Mes simulado en {nombre}: {len(dias)} días, {movs} movimientos, {con_diferencia} arqueos con diferencia, "
          f"deuda de clientes ${deuda:_}".replace("_", "."))


if __name__ == "__main__":
    main()
