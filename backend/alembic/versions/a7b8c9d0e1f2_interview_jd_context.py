"""interview_jd_context

Revision ID: a7b8c9d0e1f2
Revises: f3a1b2c4d5e6
Create Date: 2026-03-22 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, Sequence[str], None] = 'f3a1b2c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('interviews', 'job_id', existing_type=sa.Integer(), nullable=True)
    op.add_column('interviews', sa.Column('jd_context', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('interviews', 'jd_context')
    op.alter_column('interviews', 'job_id', existing_type=sa.Integer(), nullable=False)
