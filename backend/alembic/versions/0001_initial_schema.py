"""
0001_initial_schema — NeuroVault baseline migration

Creates all tables and adds hashed_password column to users.
Run: alembic upgrade head

Revision ID: 0001
Revises:
Create Date: 2026-06-03
"""
from alembic import op
import sqlalchemy as sa

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users ──────────────────────────────────────────────────────────────
    op.create_table(
        'users',
        sa.Column('id',              sa.Integer(),  primary_key=True, autoincrement=True),
        sa.Column('email',           sa.String(),   nullable=False,   unique=True,  index=True),
        sa.Column('username',        sa.String(),   nullable=False,   unique=True,  index=True),
        sa.Column('hashed_password', sa.String(),   nullable=True),   # new — bcrypt hash
        sa.Column('created_at',      sa.DateTime(), nullable=True),
    )

    # ── watchlists ────────────────────────────────────────────────────────
    op.create_table(
        'watchlists',
        sa.Column('id',             sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id',        sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('symbol',         sa.String(),  nullable=False, index=True),
        sa.Column('volatility_tier',sa.String(),  nullable=True, server_default='Moderate'),
        sa.Column('added_at',       sa.DateTime(), nullable=True),
    )

    # ── positions ─────────────────────────────────────────────────────────
    op.create_table(
        'positions',
        sa.Column('id',             sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id',        sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('symbol',         sa.String(),  nullable=False, index=True),
        sa.Column('entry_price',    sa.Float(),   nullable=False),
        sa.Column('peak_price',     sa.Float(),   nullable=False),
        sa.Column('quantity',       sa.Float(),   nullable=False),
        sa.Column('volatility_tier',sa.String(),  nullable=True, server_default='Moderate'),
        sa.Column('is_active',      sa.Boolean(), nullable=True, server_default='1'),
        sa.Column('opened_at',      sa.DateTime(), nullable=True),
    )

    # ── trade_history ─────────────────────────────────────────────────────
    op.create_table(
        'trade_history',
        sa.Column('id',          sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id',     sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('symbol',      sa.String(),  nullable=False, index=True),
        sa.Column('entry_price', sa.Float(),   nullable=True),
        sa.Column('peak_price',  sa.Float(),   nullable=True),
        sa.Column('floor_price', sa.Float(),   nullable=True),
        sa.Column('exit_price',  sa.Float(),   nullable=True),
        sa.Column('pnl',         sa.Float(),   nullable=True),
        sa.Column('closed_at',   sa.DateTime(), nullable=True),
    )

    # ── alerts ────────────────────────────────────────────────────────────
    op.create_table(
        'alerts',
        sa.Column('id',             sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('timestamp',      sa.DateTime(), nullable=True),
        sa.Column('trigger_ticker', sa.String(),   nullable=True, index=True),
        sa.Column('severity',       sa.Integer(),  nullable=True),
        sa.Column('event_type',     sa.String(),   nullable=True),
        sa.Column('action_taken',   sa.String(),   nullable=True),
        sa.Column('pnl_impact',     sa.Float(),    nullable=True),
    )

    # ── ensemble_weights ──────────────────────────────────────────────────
    op.create_table(
        'ensemble_weights',
        sa.Column('id',           sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('model_name',   sa.String(),  nullable=False, unique=True, index=True),
        sa.Column('weight_value', sa.Float(),   nullable=False),
        sa.Column('updated_at',   sa.DateTime(), nullable=True),
    )

    # ── price_alerts ──────────────────────────────────────────────────────
    op.create_table(
        'price_alerts',
        sa.Column('id',            sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('symbol',        sa.String(),  nullable=False, index=True),
        sa.Column('trigger_price', sa.Float(),   nullable=False),
        sa.Column('direction',     sa.String(),  nullable=False),
        sa.Column('is_active',     sa.Boolean(), nullable=True, server_default='1'),
        sa.Column('created_at',    sa.DateTime(), nullable=True),
        sa.Column('triggered_at',  sa.DateTime(), nullable=True),
    )

    # ── Seed default user ─────────────────────────────────────────────────
    op.execute(
        "INSERT INTO users (id, email, username, created_at) "
        "VALUES (1, 'default@finmotion.ai', 'default', CURRENT_TIMESTAMP) "
        "ON CONFLICT (id) DO NOTHING"
    )


def downgrade() -> None:
    for table in ['price_alerts', 'ensemble_weights', 'alerts',
                  'trade_history', 'positions', 'watchlists', 'users']:
        op.drop_table(table)
