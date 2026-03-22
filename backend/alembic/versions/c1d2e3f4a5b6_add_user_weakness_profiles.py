"""add_user_weakness_profiles

Revision ID: c1d2e3f4a5b6
Revises: f3a1b2c4d5e6
Create Date: 2026-03-22 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c1d2e3f4a5b6"
down_revision: Union[str, None] = "f3a1b2c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_weakness_profiles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("knowledge_point", sa.String(100), nullable=False),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column("source_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="weak"),
        sa.Column("consecutive_correct", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_weakness_profiles_user_id", "user_weakness_profiles", ["user_id"])
    op.create_index("ix_user_weakness_profiles_knowledge_point", "user_weakness_profiles", ["knowledge_point"])


def downgrade() -> None:
    op.drop_index("ix_user_weakness_profiles_knowledge_point", table_name="user_weakness_profiles")
    op.drop_index("ix_user_weakness_profiles_user_id", table_name="user_weakness_profiles")
    op.drop_table("user_weakness_profiles")
