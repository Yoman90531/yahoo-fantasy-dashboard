from sqlalchemy import Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Season(Base):
    __tablename__ = "seasons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    game_id: Mapped[int] = mapped_column(Integer, nullable=False)
    league_id: Mapped[str] = mapped_column(String, nullable=False)
    league_name: Mapped[str | None] = mapped_column(String, nullable=True)
    num_teams: Mapped[int | None] = mapped_column(Integer, nullable=True)
    num_playoff_teams: Mapped[int | None] = mapped_column(Integer, nullable=True)
    num_regular_season_weeks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    champion_team_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("teams.id", use_alter=True, name="fk_seasons_champion_team_id"), nullable=True
    )
    synced_at: Mapped[DateTime | None] = mapped_column(DateTime, server_default=func.now(), nullable=True)

    teams: Mapped[list["Team"]] = relationship(
        "Team", back_populates="season", foreign_keys="Team.season_id"
    )
    matchups: Mapped[list["Matchup"]] = relationship("Matchup", back_populates="season")
    draft_picks: Mapped[list["DraftPick"]] = relationship("DraftPick", back_populates="season")
    player_seasons: Mapped[list["PlayerSeason"]] = relationship("PlayerSeason", back_populates="season")
