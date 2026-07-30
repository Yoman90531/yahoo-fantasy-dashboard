from datetime import datetime

from pydantic import BaseModel


class SyncStatusResponse(BaseModel):
    season_year: int
    status: str
    synced_at: datetime | None
    error_msg: str | None


class SyncLogResponse(SyncStatusResponse):
    id: int
    week: int | None
