import os
from datetime import datetime

from sqlalchemy import DateTime, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+psycopg://quiniela:quiniela@127.0.0.1:5433/quiniela")
engine = create_engine(DATABASE_URL, hide_parameters=True)  # los errores no llevan datos al log (auditoría 3.C2)
SessionLocal = sessionmaker(engine)


class Base(DeclarativeBase):
    # Todo timestamp se guarda con zona horaria (CONTRATO-API: ISO 8601 con zona).
    type_annotation_map = {datetime: DateTime(timezone=True)}


def get_db():
    with SessionLocal() as db:
        yield db
