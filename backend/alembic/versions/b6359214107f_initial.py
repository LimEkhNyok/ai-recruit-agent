"""initial

Revision ID: b6359214107f
Revises: 
Create Date: 2026-03-09 15:39:34.680230

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b6359214107f'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    op.create_table(
        'job_positions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('title', sa.String(length=100), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('requirements', sa.JSON(), nullable=False),
        sa.Column('culture_keywords', sa.JSON(), nullable=False),
        sa.Column('personality_fit', sa.JSON(), nullable=False),
        sa.Column('ability_requirements', sa.JSON(), nullable=False),
        sa.Column('interest_tags', sa.JSON(), nullable=False),
        sa.Column('embedding', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_job_positions_category'), 'job_positions', ['category'], unique=False)

    op.create_table(
        'assessments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('chat_history', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_assessments_user_id'), 'assessments', ['user_id'], unique=False)

    op.create_table(
        'talent_profiles',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('assessment_id', sa.Integer(), nullable=False),
        sa.Column('personality', sa.JSON(), nullable=False),
        sa.Column('abilities', sa.JSON(), nullable=False),
        sa.Column('interests', sa.JSON(), nullable=False),
        sa.Column('values', sa.JSON(), nullable=False),
        sa.Column('work_style', sa.JSON(), nullable=False),
        sa.Column('summary', sa.Text(), nullable=False),
        sa.Column('embedding', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['assessment_id'], ['assessments.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_talent_profiles_user_id'), 'talent_profiles', ['user_id'], unique=False)

    op.create_table(
        'match_results',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('profile_id', sa.Integer(), nullable=False),
        sa.Column('job_id', sa.Integer(), nullable=False),
        sa.Column('score', sa.Float(), nullable=False),
        sa.Column('breakdown', sa.JSON(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('is_beyond_cognition', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['job_id'], ['job_positions.id']),
        sa.ForeignKeyConstraint(['profile_id'], ['talent_profiles.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_match_results_user_id'), 'match_results', ['user_id'], unique=False)

    op.create_table(
        'interviews',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('job_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('chat_history', sa.JSON(), nullable=False),
        sa.Column('evaluation', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['job_id'], ['job_positions.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_interviews_user_id'), 'interviews', ['user_id'], unique=False)

    op.create_table(
        'career_plans',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('profile_id', sa.Integer(), nullable=False),
        sa.Column('plan_content', sa.JSON(), nullable=False),
        sa.Column('resume_advice', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['profile_id'], ['talent_profiles.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_career_plans_user_id'), 'career_plans', ['user_id'], unique=False)

    op.create_table(
        'quiz_records',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('topic', sa.String(length=50), nullable=False),
        sa.Column('knowledge_point', sa.String(length=100), nullable=False),
        sa.Column('question_type', sa.String(length=20), nullable=False),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('user_answer', sa.Text(), nullable=True),
        sa.Column('is_correct', sa.Boolean(), nullable=False),
        sa.Column('is_skipped', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_quiz_records_user_id'), 'quiz_records', ['user_id'], unique=False)
    op.create_index(op.f('ix_quiz_records_topic'), 'quiz_records', ['topic'], unique=False)
    op.create_index(op.f('ix_quiz_records_knowledge_point'), 'quiz_records', ['knowledge_point'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_quiz_records_knowledge_point'), table_name='quiz_records')
    op.drop_index(op.f('ix_quiz_records_topic'), table_name='quiz_records')
    op.drop_index(op.f('ix_quiz_records_user_id'), table_name='quiz_records')
    op.drop_table('quiz_records')

    op.drop_index(op.f('ix_career_plans_user_id'), table_name='career_plans')
    op.drop_table('career_plans')

    op.drop_index(op.f('ix_interviews_user_id'), table_name='interviews')
    op.drop_table('interviews')

    op.drop_index(op.f('ix_match_results_user_id'), table_name='match_results')
    op.drop_table('match_results')

    op.drop_index(op.f('ix_talent_profiles_user_id'), table_name='talent_profiles')
    op.drop_table('talent_profiles')

    op.drop_index(op.f('ix_assessments_user_id'), table_name='assessments')
    op.drop_table('assessments')

    op.drop_index(op.f('ix_job_positions_category'), table_name='job_positions')
    op.drop_table('job_positions')

    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
