"""Búsqueda de clientes: índices de trigramas sobre nombre y alias, para el ILIKE '%q%' del autocompletado"""
from alembic import op

revision = 'e954b46fabbe'
down_revision = '8ef686c764b6'


def upgrade():
    op.execute('CREATE EXTENSION IF NOT EXISTS pg_trgm')  # viene con Postgres (contrib) y en Neon
    for columna in ('nombre', 'alias'):
        op.create_index(f'ix_cliente_{columna}_trgm', 'cliente', [columna], postgresql_using='gin',
                        postgresql_ops={columna: 'gin_trgm_ops'})


def downgrade():
    for columna in ('nombre', 'alias'):
        op.drop_index(f'ix_cliente_{columna}_trgm', 'cliente')
