from sqlalchemy import Integer, Float, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Matchup(Base):
    __tablename__ = "matchups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    season_id: Mapped[int] = mapped_column(Integer, ForeignKey("seasons.id"), nullable=False)
    week: Mapped[int] = mapped_column(Integer, nullable=False)
    team1_id: Mapped[int] = mapped_column(Integer, ForeignKey("teams.id"), nullable=False)
    team2_id: Mapped[int] = mapped_column(Integer, ForeignKey("teams.id"), nullable=False)
    team1_points: Mapped[float] = mapped_column(Float, nullable=False)
    team2_points: Mapped[float] = mapped_column(Float, nullable=False)
    winner_team_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("teams.id"), nullable=True)
    is_playoff: Mapped[bool] = mapped_column(Boolean, default=False)
    is_championship: Mapped[bool] = mapped_column(Boolean, default=False)
    is_consolation: Mapped[bool] = mapped_column(Boolean, default=False)

    season: Mapped["Season"] = relationship("Season", back_populates="matchups")
    team1: Mapped["Team"] = relationship("Team", foreign_keys=[team1_id])
    team2: Mapped["Team"] = relationship("Team", foreign_keys=[team2_id])
    winner: Mapped["Team | None"] = relationship("Team", foreign_keys=[winner_team_id])

    __table_args__ = (
        UniqueConstraint("season_id", "week", "team1_id", "team2_id", name="uq_matchups_season_week_teams"),
    )
