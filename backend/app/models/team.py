from sqlalchemy import Integer, String, Float, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    season_id: Mapped[int] = mapped_column(Integer, ForeignKey("seasons.id"), nullable=False)
    manager_id: Mapped[int] = mapped_column(Integer, ForeignKey("managers.id"), nullable=False)
    yahoo_team_key: Mapped[str] = mapped_column(String, nullable=False)
    yahoo_team_id: Mapped[int] = mapped_column(Integer, nullable=False)
    team_name: Mapped[str | None] = mapped_column(String, nullable=True)
    final_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    wins: Mapped[int] = mapped_column(Integer, default=0)
    losses: Mapped[int] = mapped_column(Integer, default=0)
    ties: Mapped[int] = mapped_column(Integer, default=0)
    points_for: Mapped[float] = mapped_column(Float, default=0.0)
    points_against: Mapped[float] = mapped_column(Float, default=0.0)
    made_playoffs: Mapped[bool] = mapped_column(Boolean, default=False)
    is_champion: Mapped[bool] = mapped_column(Boolean, default=False)
    playoff_finish: Mapped[int | None] = mapped_column(Integer, nullable=True)

    season: Mapped["Season"] = relationship("Season", back_populates="teams", foreign_keys=[season_id])
    manager: Mapped["Manager"] = relationship("Manager", back_populates="teams")

    __table_args__ = (UniqueConstraint("season_id", "yahoo_team_id", name="uq_teams_season_id_yahoo_team_id"),)
