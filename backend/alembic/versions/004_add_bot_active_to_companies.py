from alembic import op
import sqlalchemy as sa

revision = '004_add_bot_active_to_companies'
down_revision = '003_whatsapp_sessions'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        ALTER TABLE companies 
        ADD COLUMN IF NOT EXISTS bot_active BOOLEAN NOT NULL DEFAULT true
    """)


def downgrade():
    op.drop_column('companies', 'bot_active')