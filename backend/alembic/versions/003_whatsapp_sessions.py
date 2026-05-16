from alembic import op
import sqlalchemy as sa

revision = '003_whatsapp_sessions'
down_revision = 'da4e28a3edbb'  # sua última migration
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'whatsapp_sessions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('session_name', sa.String(), nullable=False, unique=True),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('provider', sa.String(), nullable=False, server_default='waha'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id']),
    )


def downgrade():
    op.drop_table('whatsapp_sessions')