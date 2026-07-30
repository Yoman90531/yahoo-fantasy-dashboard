"""Create the initial fantasy dashboard schema.

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-30
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "managers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("yahoo_guid", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=False),
        sa.Column("nickname", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_managers")),
        sa.UniqueConstraint("yahoo_guid", name=op.f("uq_managers_yahoo_guid")),
    )
    op.create_table(
        "seasons",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("game_id", sa.Integer(), nullable=False),
        sa.Column("league_id", sa.String(), nullable=False),
        sa.Column("league_name", sa.String(), nullable=True),
        sa.Column("num_teams", sa.Integer(), nullable=True),
        sa.Column("num_playoff_teams", sa.Integer(), nullable=True),
        sa.Column("num_regular_season_weeks", sa.Integer(), nullable=True),
        sa.Column("champion_team_id", sa.Integer(), nullable=True),
        sa.Column(
            "synced_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["champion_team_id"],
            ["teams.id"],
            name="fk_seasons_champion_team_id",
            use_alter=True,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_seasons")),
        sa.UniqueConstraint("year", name=op.f("uq_seasons_year")),
    )
    op.create_table(
        "sync_log",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("season_year", sa.Integer(), nullable=False),
        sa.Column("week", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column(
            "synced_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("error_msg", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_sync_log")),
    )
    op.create_table(
        "feedback",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("author_name", sa.String(length=80), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_feedback")),
    )
    op.create_table(
        "teams",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("manager_id", sa.Integer(), nullable=False),
        sa.Column("yahoo_team_key", sa.String(), nullable=False),
        sa.Column("yahoo_team_id", sa.Integer(), nullable=False),
        sa.Column("team_name", sa.String(), nullable=True),
        sa.Column("final_rank", sa.Integer(), nullable=True),
        sa.Column("wins", sa.Integer(), nullable=False),
        sa.Column("losses", sa.Integer(), nullable=False),
        sa.Column("ties", sa.Integer(), nullable=False),
        sa.Column("points_for", sa.Float(), nullable=False),
        sa.Column("points_against", sa.Float(), nullable=False),
        sa.Column("made_playoffs", sa.Boolean(), nullable=False),
        sa.Column("is_champion", sa.Boolean(), nullable=False),
        sa.Column("playoff_finish", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ["manager_id"],
            ["managers.id"],
            name=op.f("fk_teams_manager_id_managers"),
        ),
        sa.ForeignKeyConstraint(
            ["season_id"],
            ["seasons.id"],
            name=op.f("fk_teams_season_id_seasons"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_teams")),
        sa.UniqueConstraint(
            "season_id",
            "yahoo_team_id",
            name="uq_teams_season_id_yahoo_team_id",
        ),
    )
    op.create_table(
        "matchups",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("week", sa.Integer(), nullable=False),
        sa.Column("team1_id", sa.Integer(), nullable=False),
        sa.Column("team2_id", sa.Integer(), nullable=False),
        sa.Column("team1_points", sa.Float(), nullable=False),
        sa.Column("team2_points", sa.Float(), nullable=False),
        sa.Column("team1_projected", sa.Float(), nullable=True),
        sa.Column("team2_projected", sa.Float(), nullable=True),
        sa.Column("winner_team_id", sa.Integer(), nullable=True),
        sa.Column("is_playoff", sa.Boolean(), nullable=False),
        sa.Column("is_championship", sa.Boolean(), nullable=False),
        sa.Column("is_consolation", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(
            ["season_id"],
            ["seasons.id"],
            name=op.f("fk_matchups_season_id_seasons"),
        ),
        sa.ForeignKeyConstraint(
            ["team1_id"],
            ["teams.id"],
            name=op.f("fk_matchups_team1_id_teams"),
        ),
        sa.ForeignKeyConstraint(
            ["team2_id"],
            ["teams.id"],
            name=op.f("fk_matchups_team2_id_teams"),
        ),
        sa.ForeignKeyConstraint(
            ["winner_team_id"],
            ["teams.id"],
            name=op.f("fk_matchups_winner_team_id_teams"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_matchups")),
        sa.UniqueConstraint(
            "season_id",
            "week",
            "team1_id",
            "team2_id",
            name="uq_matchups_season_week_teams",
        ),
    )
    op.create_table(
        "draft_picks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("round", sa.Integer(), nullable=False),
        sa.Column("pick", sa.Integer(), nullable=False),
        sa.Column("player_name", sa.String(), nullable=False),
        sa.Column("position", sa.String(), nullable=False),
        sa.Column("player_key", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(
            ["season_id"],
            ["seasons.id"],
            name=op.f("fk_draft_picks_season_id_seasons"),
        ),
        sa.ForeignKeyConstraint(
            ["team_id"],
            ["teams.id"],
            name=op.f("fk_draft_picks_team_id_teams"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_draft_picks")),
        sa.UniqueConstraint(
            "season_id",
            "round",
            "pick",
            name="uq_draft_picks_season_round_pick",
        ),
    )
    op.create_table(
        "player_seasons",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("player_key", sa.String(), nullable=False),
        sa.Column("player_name", sa.String(), nullable=False),
        sa.Column("position", sa.String(), nullable=False),
        sa.Column("fantasy_points", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(
            ["season_id"],
            ["seasons.id"],
            name=op.f("fk_player_seasons_season_id_seasons"),
        ),
        sa.ForeignKeyConstraint(
            ["team_id"],
            ["teams.id"],
            name=op.f("fk_player_seasons_team_id_teams"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_player_seasons")),
        sa.UniqueConstraint(
            "season_id",
            "player_key",
            name="uq_player_seasons_season_player",
        ),
    )


def downgrade() -> None:
    op.drop_table("player_seasons")
    op.drop_table("draft_picks")
    op.drop_table("matchups")
    op.drop_table("teams")
    op.drop_table("feedback")
    op.drop_table("sync_log")
    op.drop_table("seasons")
    op.drop_table("managers")
