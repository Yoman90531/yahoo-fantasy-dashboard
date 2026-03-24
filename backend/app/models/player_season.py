from sqlalchemy import Integer, Float, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class PlayerSeason(Base):
    __tablename__ = "player_seasons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    season_id: Mapped[int] = mapped_column(Integer, ForeignKey("seasons.id"), nullable=False)
    team_id: Mapped[int] = mapped_column(Integer, ForeignKey("teams.id"), nullable=False)
    player_key: Mapped[str] = mapped_column(String, nullable=False)
    player_name: Mapped[str] = mapped_column(String, nullable=False)
    position: Mapped[str] = mapped_column(String, nullable=False)
    fantasy_points: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    season: Mapped["Season"] = relationship("Season", back_populates="player_seasons")
    team: Mapped["Team"] = relationship("Team", back_populates="player_seasons")

    __table_args__ = (
        UniqueConstraint("season_id", "player_key", name="uq_player_seasons_season_player"),
    )
