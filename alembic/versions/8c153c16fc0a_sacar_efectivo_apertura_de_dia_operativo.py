"""sacar efectivo_apertura de dia_operativo (D3c: la apertura es el arqueo de la mañana)"""
from alembic import op
import sqlalchemy as sa

revision = '8c153c16fc0a'
down_revision = '39630d22eeee'


def upgrade():
    op.drop_column('dia_operativo', 'efectivo_apertura')


def downgrade():
    op.add_column('dia_operativo', sa.Column('efectivo_apertura', sa.Integer(), nullable=True))
