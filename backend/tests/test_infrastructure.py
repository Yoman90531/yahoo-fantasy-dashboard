import os
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

from sqlalchemy import create_engine, inspect

from app import models  # noqa: F401
from app.database import Base
from app.services.sync_lock import exclusive_sync_lock
from scripts.backup_database import create_backup


BACKEND_ROOT = Path(__file__).resolve().parents[1]


def sqlite_url(path: Path) -> str:
    return f"sqlite:///{path.as_posix()}"


class DatabaseInfrastructureTest(unittest.TestCase):
    def run_migration(self, database_url: str) -> None:
        environment = os.environ.copy()
        environment["DATABASE_URL"] = database_url
        subprocess.run(
            [sys.executable, "scripts/migrate_database.py"],
            cwd=BACKEND_ROOT,
            env=environment,
            check=True,
            capture_output=True,
            text=True,
        )

    def assert_current_schema(self, database_path: Path) -> None:
        engine = create_engine(sqlite_url(database_path))
        try:
            tables = set(inspect(engine).get_table_names())
            self.assertEqual(
                tables,
                set(Base.metadata.tables) | {"alembic_version"},
            )
            with engine.connect() as connection:
                version = connection.exec_driver_sql(
                    "SELECT version_num FROM alembic_version"
                ).scalar_one()
            self.assertEqual(version, "0002_keeper_lab")
        finally:
            engine.dispose()

    def test_migration_creates_fresh_schema(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            database_path = Path(temporary_directory) / "fresh.db"
            self.run_migration(sqlite_url(database_path))
            self.assert_current_schema(database_path)

    def test_migration_baselines_legacy_create_all_schema(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            database_path = Path(temporary_directory) / "legacy.db"
            engine = create_engine(sqlite_url(database_path))
            Base.metadata.create_all(engine)
            engine.dispose()

            self.run_migration(sqlite_url(database_path))
            self.assert_current_schema(database_path)

    def test_backup_is_readable_and_retention_is_bounded(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            database_path = root / "fantasy.db"
            backup_directory = root / "backups"

            with closing(sqlite3.connect(database_path)) as connection:
                connection.execute("CREATE TABLE sample (value TEXT NOT NULL)")
                connection.execute("INSERT INTO sample VALUES ('preserved')")
                connection.commit()

            first = create_backup(
                sqlite_url(database_path),
                backup_dir=backup_directory,
                keep=1,
            )
            second = create_backup(
                sqlite_url(database_path),
                backup_dir=backup_directory,
                keep=1,
            )

            self.assertIsNotNone(first)
            self.assertIsNotNone(second)
            backups = list(backup_directory.glob("*.sqlite3"))
            self.assertEqual(len(backups), 1)
            with closing(sqlite3.connect(backups[0])) as connection:
                value = connection.execute("SELECT value FROM sample").fetchone()
            self.assertEqual(value, ("preserved",))

    def test_sync_lock_is_exclusive_and_released(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            lock_path = Path(temporary_directory) / ".sync.lock"

            with exclusive_sync_lock(lock_path):
                self.assertTrue(lock_path.exists())
                with self.assertRaisesRegex(RuntimeError, "already running"):
                    with exclusive_sync_lock(lock_path):
                        self.fail("The second sync lock should not be acquired.")

            self.assertFalse(lock_path.exists())
            with exclusive_sync_lock(lock_path):
                self.assertTrue(lock_path.exists())


if __name__ == "__main__":
    unittest.main()
