import os
import sys

from sqlalchemy import select

from app.db import SessionLocal
from app.modelos import Caja, Juego, Negocio, Usuario, hasher

JUEGOS = ["Quiniela", "Quini 6", "Loto", "Brinco", "Combinada", "Lotería", "Telekino"]


def obtener_o_crear(db, modelo, **campos):
    """Idempotente: el seed se puede correr sobre una base ya sembrada sin duplicar."""
    fila = db.scalar(select(modelo).filter_by(**campos))
    if fila is None:
        fila = modelo(**campos)
        db.add(fila)
        db.flush()
    return fila


def main():
    password = os.environ.get("SEED_PASSWORD")
    negocio_nombre = os.environ.get("SEED_NEGOCIO", "Quiniela La Estrella")
    usuario = os.environ.get("SEED_USUARIO", "demo")
    if not password:
        sys.exit(f"Falta la variable de entorno SEED_PASSWORD: es la clave del usuario {usuario}.")
    with SessionLocal() as db:
        negocio = obtener_o_crear(db, Negocio, nombre=negocio_nombre)
        if db.scalar(select(Usuario).where(Usuario.usuario == usuario)) is None:
            db.add(Usuario(negocio_id=negocio.id, usuario=usuario, nombre="Operador Demo",
                           password_hash=hasher.hash(password)))
        grande = obtener_o_crear(db, Caja, negocio_id=negocio.id, nombre="Caja grande", tipo="central")
        obtener_o_crear(db, Caja, negocio_id=negocio.id, nombre="Caja chica", tipo="operativa",
                        caja_padre_id=grande.id)
        for nombre in JUEGOS:
            obtener_o_crear(db, Juego, negocio_id=negocio.id, nombre=nombre, es_quiniela=nombre == "Quiniela")
        db.commit()
    print(f"Seed listo: {negocio_nombre}, usuario {usuario}, dos cajas y siete juegos.")


if __name__ == "__main__":
    main()
