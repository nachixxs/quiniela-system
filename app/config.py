import os

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+psycopg://quiniela:quiniela@127.0.0.1:5433/quiniela")
