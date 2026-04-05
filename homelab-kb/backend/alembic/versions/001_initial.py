"""Initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import TSVECTOR

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # Users table
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("username", sa.String(64), nullable=False, unique=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column(
            "role",
            sa.Enum("reader", "editor", "admin", name="userrole"),
            nullable=False,
            server_default="reader",
        ),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_username", "users", ["username"])
    op.create_index("ix_users_email", "users", ["email"])

    # Articles table
    op.create_table(
        "articles",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("body", sa.Text, nullable=False, server_default=""),
        sa.Column("category", sa.String(128), nullable=False, server_default="General"),
        sa.Column("author_id", sa.Integer, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("search_vector", TSVECTOR, nullable=True),
        sa.Column("is_published", sa.Integer, nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_articles_search_vector", "articles", ["search_vector"], postgresql_using="gin")

    # Article chunks table with pgvector
    op.create_table(
        "article_chunks",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("article_id", sa.Integer, sa.ForeignKey("articles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("chunk_index", sa.Integer, nullable=False),
        sa.Column("chunk_text", sa.Text, nullable=False),
        sa.Column("embedding", sa.Text, nullable=True),  # stored as vector type via raw SQL
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    # Convert embedding column to vector type and create HNSW index
    op.execute("ALTER TABLE article_chunks ALTER COLUMN embedding TYPE vector(768) USING NULL")
    op.execute(
        "CREATE INDEX ix_article_chunks_embedding ON article_chunks "
        "USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)"
    )
    op.create_index("ix_article_chunks_article_id", "article_chunks", ["article_id"])

    # Feedback table
    op.create_table(
        "feedback",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("article_id", sa.Integer, sa.ForeignKey("articles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("helpful", sa.Boolean, nullable=False),
        sa.Column("comment", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_feedback_article_id", "feedback", ["article_id"])

    # Trigger to auto-update updated_at on articles
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    op.execute("""
        CREATE TRIGGER articles_updated_at
        BEFORE UPDATE ON articles
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    """)
    op.execute("""
        CREATE TRIGGER users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS users_updated_at ON users")
    op.execute("DROP TRIGGER IF EXISTS articles_updated_at ON articles")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at")
    op.drop_table("feedback")
    op.drop_table("article_chunks")
    op.drop_table("articles")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS userrole")
    op.execute("DROP EXTENSION IF EXISTS vector")
