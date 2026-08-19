"""Add Keeper Lab player metadata and ADP snapshots.

Revision ID: 0002_keeper_lab
Revises: 0001_initial
Create Date: 2026-08-19
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0002_keeper_lab"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("player_seasons") as batch_op:
        batch_op.add_column(sa.Column("player_id", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("nfl_team", sa.String(), nullable=True))

    op.create_table(
        "adp_snapshots",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("season", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("source_url", sa.String(), nullable=True),
        sa.Column("scoring_format", sa.String(), nullable=False),
        sa.Column("league_size", sa.Integer(), nullable=False),
        sa.Column(
            "captured_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("is_locked", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_adp_snapshots")),
    )
    op.create_table(
        "adp_entries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("snapshot_id", sa.Integer(), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False),
        sa.Column("player_name", sa.String(), nullable=False),
        sa.Column("normalized_name", sa.String(), nullable=False),
        sa.Column("position", sa.String(), nullable=True),
        sa.Column("nfl_team", sa.String(), nullable=True),
        sa.Column("average_adp", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(
            ["snapshot_id"],
            ["adp_snapshots.id"],
            name=op.f("fk_adp_entries_snapshot_id_adp_snapshots"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_adp_entries")),
        sa.UniqueConstraint(
            "snapshot_id", "rank", name="uq_adp_entries_snapshot_rank"
        ),
    )


def downgrade() -> None:
    op.drop_table("adp_entries")
    op.drop_table("adp_snapshots")
    with op.batch_alter_table("player_seasons") as batch_op:
        batch_op.drop_column("nfl_team")
        batch_op.drop_column("player_id")
