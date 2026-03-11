"""add_billing_tables

Revision ID: f3a1b2c4d5e6
Revises: e1806eccf29f
Create Date: 2026-03-11 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f3a1b2c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'e1806eccf29f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'user_wallets',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('balance', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('free_quiz_remaining', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_user_wallets_user_id'), 'user_wallets', ['user_id'], unique=True)

    op.create_table(
        'subscriptions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('plan_type', sa.String(length=20), nullable=False),
        sa.Column('starts_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='active'),
        sa.Column('amount_yuan', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_subscriptions_user_id'), 'subscriptions', ['user_id'], unique=False)

    op.create_table(
        'recharge_records',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('amount_yuan', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('credits_gained', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_recharge_records_user_id'), 'recharge_records', ['user_id'], unique=False)

    op.add_column('usage_records', sa.Column('credits_cost', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('usage_records', 'credits_cost')
    op.drop_index(op.f('ix_recharge_records_user_id'), table_name='recharge_records')
    op.drop_table('recharge_records')
    op.drop_index(op.f('ix_subscriptions_user_id'), table_name='subscriptions')
    op.drop_table('subscriptions')
    op.drop_index(op.f('ix_user_wallets_user_id'), table_name='user_wallets')
    op.drop_table('user_wallets')
