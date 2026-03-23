from sqlalchemy import Integer, String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class SyncLog(Base):
    __tablename__ = "sync_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    season_year: Mapped[int] = mapped_column(Integer, nullable=False)
    week: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False)  # success | error | in_progress
    synced_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    error_msg: Mapped[str | None] = mapped_column(String, nullable=True)
