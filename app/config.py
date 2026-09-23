import os

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+psycopg://quiniela:quiniela@localhost:5433/quiniela")
