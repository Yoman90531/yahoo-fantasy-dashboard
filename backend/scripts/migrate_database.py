"""Upgrade the database schema, safely baselining legacy installations."""

from __future__ import annotations

import logging
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from app.config import settings
from app.database import Base, engine
from app import models  # noqa: F401


logger = logging.getLogger(__name__)
INITIAL_REVISION = "0001_initial"
INITIAL_TABLES = {
    "managers",
    "seasons",
    "sync_log",
    "feedback",
    "teams",
    "matchups",
    "draft_picks",
    "player_seasons",
}


def migrate_database() -> None:
    """Bring the configured database to the latest Alembic revision.

    Older deployments created tables directly with SQLAlchemy. If every current
    application table is present but Alembic metadata is not, stamp that schema
    as the initial revision before applying newer migrations.
    """
    alembic_config = Config(str(BACKEND_ROOT / "alembic.ini"))
    alembic_config.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
    alembic_config.set_main_option("sqlalchemy.url", settings.database_url)

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    application_tables = set(Base.metadata.tables)

    if application_tables.intersection(existing_tables) and "alembic_version" not in existing_tables:
        if application_tables.issubset(existing_tables):
            logger.info("Baselining current create-all schema at Alembic head.")
            command.stamp(alembic_config, "head")
        elif INITIAL_TABLES.issubset(existing_tables):
            unexpected_tables = existing_tables - INITIAL_TABLES
            if unexpected_tables:
                unexpected = ", ".join(sorted(unexpected_tables))
                raise RuntimeError(
                    "Refusing to baseline an ambiguous legacy schema. "
                    f"Unexpected tables: {unexpected}"
                )
            logger.info("Baselining legacy database at %s.", INITIAL_REVISION)
            command.stamp(alembic_config, INITIAL_REVISION)
        else:
            missing = ", ".join(sorted(INITIAL_TABLES - existing_tables))
            raise RuntimeError(
                "Refusing to baseline a partial legacy schema. "
                f"Missing initial tables: {missing}"
            )

    command.upgrade(alembic_config, "head")
    logger.info("Database schema is current.")


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    migrate_database()


if __name__ == "__main__":
    main()
