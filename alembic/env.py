import logging

from alembic import context

import app.modelos  # noqa: F401  registra las tablas en Base.metadata
from app.db import Base, engine

logging.basicConfig(level=logging.INFO, format="%(message)s")

with engine.connect() as conexion:
    context.configure(connection=conexion, target_metadata=Base.metadata)
    with context.begin_transaction():
        context.run_migrations()
