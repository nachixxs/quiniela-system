import os

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+psycopg://quiniela_test:quiniela_test@127.0.0.1:5433/quiniela_test")
