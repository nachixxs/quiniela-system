import os
import sys

from sqlalchemy import select

from app.db import SessionLocal
from app.modelos import Negocio, Usuario, hasher


def main():
    password = os.environ.get("SEED_PASSWORD")
    if not password:
        sys.exit("Falta la variable de entorno SEED_PASSWORD: es la clave del usuario demo.")
    with SessionLocal() as db:
        negocio = db.scalar(select(Negocio).where(Negocio.nombre == "Quiniela La Estrella"))
        if negocio is None:
            negocio = Negocio(nombre="Quiniela La Estrella")
            db.add(negocio)
            db.flush()
        if db.scalar(select(Usuario).where(Usuario.usuario == "demo")) is None:
            db.add(Usuario(negocio_id=negocio.id, usuario="demo", nombre="Operador Demo",
                           password_hash=hasher.hash(password)))
        db.commit()
    print("Seed listo: Quiniela La Estrella, usuario demo.")


if __name__ == "__main__":
    main()
