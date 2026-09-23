"""negocio usuario y sesion"""
from alembic import op
import sqlalchemy as sa

revision = 'bed7c7b1122e'
down_revision = None


def upgrade():
    op.create_table('negocio',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('nombre', sa.String(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('usuario',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('negocio_id', sa.Integer(), nullable=False),
    sa.Column('usuario', sa.String(), nullable=False),
    sa.Column('nombre', sa.String(), nullable=False),
    sa.Column('password_hash', sa.String(), nullable=False),
    sa.ForeignKeyConstraint(['negocio_id'], ['negocio.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('usuario')
    )
    op.create_table('sesion',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('usuario_id', sa.Integer(), nullable=False),
    sa.Column('negocio_id', sa.Integer(), nullable=False),
    sa.Column('creada', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('expira', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['negocio_id'], ['negocio.id'], ),
    sa.ForeignKeyConstraint(['usuario_id'], ['usuario.id'], ),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('sesion')
    op.drop_table('usuario')
    op.drop_table('negocio')
