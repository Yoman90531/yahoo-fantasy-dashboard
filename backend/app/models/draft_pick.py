from sqlalchemy import Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class DraftPick(Base):
    __tablename__ = "draft_picks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    season_id: Mapped[int] = mapped_column(Integer, ForeignKey("seasons.id"), nullable=False)
    team_id: Mapped[int] = mapped_column(Integer, ForeignKey("teams.id"), nullable=False)
    round: Mapped[int] = mapped_column(Integer, nullable=False)
    pick: Mapped[int] = mapped_column(Integer, nullable=False)
    player_name: Mapped[str] = mapped_column(String, nullable=False)
    position: Mapped[str] = mapped_column(String, nullable=False)
    player_key: Mapped[str | None] = mapped_column(String, nullable=True)

    season: Mapped["Season"] = relationship("Season", back_populates="draft_picks")
    team: Mapped["Team"] = relationship("Team", back_populates="draft_picks")

    __table_args__ = (
        UniqueConstraint("season_id", "round", "pick", name="uq_draft_picks_season_round_pick"),
    )
