"""ref_cliente único por negocio, turno mañana|noche y momentos con clock_timestamp() (re-anclaje)"""
from alembic import op
import sqlalchemy as sa

revision = '8ef686c764b6'
down_revision = '8c153c16fc0a'


def upgrade():
    op.drop_constraint('movimiento_ref_cliente_key', 'movimiento', type_='unique')
    op.create_unique_constraint('movimiento_negocio_id_ref_cliente_key', 'movimiento', ['negocio_id', 'ref_cliente'])
    op.alter_column('turno', 'nombre', type_=sa.Enum('mañana', 'noche', native_enum=False), existing_type=sa.String())
    op.alter_column('movimiento', 'creado_en', server_default=sa.text('clock_timestamp()'))
    op.alter_column('arqueo', 'momento', server_default=sa.text('clock_timestamp()'))


def downgrade():
    op.alter_column('arqueo', 'momento', server_default=sa.text('now()'))
    op.alter_column('movimiento', 'creado_en', server_default=sa.text('now()'))
    op.alter_column('turno', 'nombre', type_=sa.String(), existing_type=sa.Enum('mañana', 'noche', native_enum=False))
    op.drop_constraint('movimiento_negocio_id_ref_cliente_key', 'movimiento', type_='unique')
    op.create_unique_constraint('movimiento_ref_cliente_key', 'movimiento', ['ref_cliente'])
