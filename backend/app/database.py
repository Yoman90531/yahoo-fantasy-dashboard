from pathlib import Path

from sqlalchemy import create_engine, event, MetaData
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.config import settings

naming_convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=naming_convention)


if settings.database_url.startswith("sqlite:///"):
    sqlite_path = settings.database_url.removeprefix("sqlite:///")
    if sqlite_path != ":memory:":
        Path(sqlite_path).expanduser().resolve().parent.mkdir(parents=True, exist_ok=True)


is_sqlite = settings.database_url.startswith("sqlite:")

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False, "timeout": 30} if is_sqlite else {},
    pool_pre_ping=True,
)

# Keep SQLite reads responsive while a sync or backup is active.
@event.listens_for(engine, "connect")
def configure_sqlite(dbapi_connection, connection_record):
    if not is_sqlite:
        return
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA busy_timeout=30000")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
