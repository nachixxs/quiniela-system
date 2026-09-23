"""cajas dias turnos movimientos arqueos"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '39630d22eeee'
down_revision = 'bed7c7b1122e'


def upgrade():
    op.create_table('caja',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('negocio_id', sa.Integer(), nullable=False),
    sa.Column('nombre', sa.String(), nullable=False),
    sa.Column('tipo', sa.Enum('operativa', 'central', native_enum=False), nullable=False),
    sa.Column('caja_padre_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['caja_padre_id'], ['caja.id'], ),
    sa.ForeignKeyConstraint(['negocio_id'], ['negocio.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('cliente',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('negocio_id', sa.Integer(), nullable=False),
    sa.Column('nombre', sa.String(), nullable=False),
    sa.Column('alias', sa.String(), nullable=True),
    sa.Column('telefono', sa.String(), nullable=True),
    sa.Column('activo', sa.Boolean(), nullable=False),
    sa.ForeignKeyConstraint(['negocio_id'], ['negocio.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('dia_operativo',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('negocio_id', sa.Integer(), nullable=False),
    sa.Column('fecha', sa.Date(), nullable=False),
    sa.Column('estado', sa.Enum('abierto', 'cerrado', native_enum=False), nullable=False),
    sa.Column('efectivo_apertura', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['negocio_id'], ['negocio.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('negocio_id', 'fecha')
    )
    op.create_table('juego',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('negocio_id', sa.Integer(), nullable=False),
    sa.Column('nombre', sa.String(), nullable=False),
    sa.Column('es_quiniela', sa.Boolean(), nullable=False),
    sa.ForeignKeyConstraint(['negocio_id'], ['negocio.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('lote_rendicion',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('negocio_id', sa.Integer(), nullable=False),
    sa.Column('fecha', sa.Date(), nullable=False),
    sa.Column('total_esperado', sa.Integer(), nullable=False),
    sa.Column('total_contado', sa.Integer(), nullable=False),
    sa.Column('diferencia', sa.Integer(), nullable=False),
    sa.Column('cantidad_boletas', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['negocio_id'], ['negocio.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('turno',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('negocio_id', sa.Integer(), nullable=False),
    sa.Column('dia_id', sa.Integer(), nullable=False),
    sa.Column('nombre', sa.String(), nullable=False),
    sa.Column('estado', sa.Enum('abierto', 'cerrado', native_enum=False), nullable=False),
    sa.Column('ticket_terminal', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.ForeignKeyConstraint(['dia_id'], ['dia_operativo.id'], ),
    sa.ForeignKeyConstraint(['negocio_id'], ['negocio.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('arqueo',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('negocio_id', sa.Integer(), nullable=False),
    sa.Column('caja_id', sa.Integer(), nullable=False),
    sa.Column('turno_id', sa.Integer(), nullable=False),
    sa.Column('momento', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('efectivo_esperado', sa.Integer(), nullable=False),
    sa.Column('efectivo_contado', sa.Integer(), nullable=False),
    sa.Column('boletas_esperadas', sa.Integer(), nullable=False),
    sa.Column('boletas_contadas', sa.Integer(), nullable=False),
    sa.Column('diferencia_efectivo', sa.Integer(), nullable=False),
    sa.Column('diferencia_boletas', sa.Integer(), nullable=False),
    sa.Column('estado', sa.Enum('cuadra', 'con_diferencia', 'explicada', native_enum=False), nullable=False),
    sa.Column('nota', sa.String(), nullable=True),
    sa.ForeignKeyConstraint(['caja_id'], ['caja.id'], ),
    sa.ForeignKeyConstraint(['negocio_id'], ['negocio.id'], ),
    sa.ForeignKeyConstraint(['turno_id'], ['turno.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('movimiento',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('negocio_id', sa.Integer(), nullable=False),
    sa.Column('dia_id', sa.Integer(), nullable=False),
    sa.Column('turno_id', sa.Integer(), nullable=False),
    sa.Column('caja_id', sa.Integer(), nullable=False),
    sa.Column('tipo', sa.Enum(
        'apuesta_quiniela', 'venta_otro_juego', 'fiado', 'cobro_fiado', 'cobro_subagente',
        'ingreso_del_dueno', 'cobro_mercado_pago', 'pago_premio', 'pago_banco', 'sueldo', 'gasto',
        'retiro_dueno', 'traspaso', 'traspaso_boletas', 'rendicion_boletas', native_enum=False), nullable=False),
    sa.Column('monto', sa.Integer(), nullable=False),
    sa.Column('juego_id', sa.Integer(), nullable=True),
    sa.Column('cliente_id', sa.Integer(), nullable=True),
    sa.Column('contraparte', sa.String(), nullable=True),
    sa.Column('nota', sa.String(), nullable=True),
    sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('corresponde_a_fecha', sa.Date(), nullable=False),
    sa.Column('es_ajuste', sa.Boolean(), nullable=False),
    sa.Column('explica_arqueo_id', sa.Integer(), nullable=True),
    sa.Column('anula_id', sa.Integer(), nullable=True),
    sa.Column('motivo_anulacion', sa.String(), nullable=True),
    sa.Column('ref_cliente', sa.Uuid(), nullable=True),
    sa.CheckConstraint('monto > 0', name='monto_positivo'),
    sa.ForeignKeyConstraint(['anula_id'], ['movimiento.id'], ),
    sa.ForeignKeyConstraint(['caja_id'], ['caja.id'], ),
    sa.ForeignKeyConstraint(['cliente_id'], ['cliente.id'], ),
    sa.ForeignKeyConstraint(['dia_id'], ['dia_operativo.id'], ),
    sa.ForeignKeyConstraint(['explica_arqueo_id'], ['arqueo.id'], ),
    sa.ForeignKeyConstraint(['juego_id'], ['juego.id'], ),
    sa.ForeignKeyConstraint(['negocio_id'], ['negocio.id'], ),
    sa.ForeignKeyConstraint(['turno_id'], ['turno.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('anula_id'),
    sa.UniqueConstraint('ref_cliente')
    )


def downgrade():
    op.drop_table('movimiento')
    op.drop_table('arqueo')
    op.drop_table('turno')
    op.drop_table('lote_rendicion')
    op.drop_table('juego')
    op.drop_table('dia_operativo')
    op.drop_table('cliente')
    op.drop_table('caja')
