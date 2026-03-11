"""add_free_quiz_reset_date

Revision ID: a7b8c9d0e1f2
Revises: f3a1b2c4d5e6
Create Date: 2026-03-11 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, Sequence[str], None] = 'f3a1b2c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('user_wallets', sa.Column('free_quiz_reset_date', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('user_wallets', 'free_quiz_reset_date')
