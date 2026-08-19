from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AdpSnapshot(Base):
    __tablename__ = "adp_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    season: Mapped[int] = mapped_column(Integer, nullable=False)
    source: Mapped[str] = mapped_column(String, nullable=False)
    source_url: Mapped[str | None] = mapped_column(String, nullable=True)
    scoring_format: Mapped[str] = mapped_column(String, nullable=False)
    league_size: Mapped[int] = mapped_column(Integer, nullable=False)
    captured_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    is_locked: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    entries: Mapped[list["AdpEntry"]] = relationship(
        "AdpEntry", back_populates="snapshot", cascade="all, delete-orphan"
    )


class AdpEntry(Base):
    __tablename__ = "adp_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    snapshot_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("adp_snapshots.id"), nullable=False
    )
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    player_name: Mapped[str] = mapped_column(String, nullable=False)
    normalized_name: Mapped[str] = mapped_column(String, nullable=False)
    position: Mapped[str | None] = mapped_column(String, nullable=True)
    nfl_team: Mapped[str | None] = mapped_column(String, nullable=True)
    average_adp: Mapped[float | None] = mapped_column(Float, nullable=True)

    snapshot: Mapped[AdpSnapshot] = relationship("AdpSnapshot", back_populates="entries")

    __table_args__ = (
        UniqueConstraint("snapshot_id", "rank", name="uq_adp_entries_snapshot_rank"),
    )
