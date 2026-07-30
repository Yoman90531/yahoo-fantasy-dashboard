import asyncio
import sqlite3
import sys
import tempfile
import types
import unittest
from contextlib import closing
from pathlib import Path
from unittest import mock

from fastapi import HTTPException, Request, Response
from sqlalchemy.exc import SQLAlchemyError

from app.database import Base
from app.main import add_security_headers_and_log, health
from app.services.rate_limit import FixedWindowRateLimiter
from scripts.backup_database import create_backup, upload_backup
from scripts.restore_database import restore_backup, verify_backup


class OperationsTest(unittest.TestCase):
    def test_health_checks_database_and_sets_security_headers(self) -> None:
        class HealthySession:
            def execute(self, _statement):
                return None

        result = health(HealthySession())
        self.assertEqual(result.model_dump(), {"status": "ok", "database": "ok"})

        request = Request(
            {
                "type": "http",
                "http_version": "1.1",
                "method": "GET",
                "scheme": "https",
                "path": "/api/health",
                "raw_path": b"/api/health",
                "query_string": b"",
                "headers": [],
                "client": ("127.0.0.1", 1234),
                "server": ("testserver", 443),
                "root_path": "",
            }
        )

        async def call_next(_request: Request) -> Response:
            return Response()

        response = asyncio.run(add_security_headers_and_log(request, call_next))
        self.assertEqual(response.headers["x-content-type-options"], "nosniff")
        self.assertEqual(response.headers["x-frame-options"], "DENY")
        self.assertIn("frame-ancestors 'none'", response.headers["content-security-policy"])

    def test_health_reports_database_failure(self) -> None:
        class UnhealthySession:
            def execute(self, _statement):
                raise SQLAlchemyError("offline")

        with self.assertLogs("app.requests", level="ERROR"):
            with self.assertRaises(HTTPException) as raised:
                health(UnhealthySession())
        self.assertEqual(raised.exception.status_code, 503)
        self.assertEqual(raised.exception.detail, "Database unavailable")

    def test_feedback_rate_limiter_expires_old_requests(self) -> None:
        current_time = [100.0]
        limiter = FixedWindowRateLimiter(
            limit=2,
            window_seconds=10,
            clock=lambda: current_time[0],
        )

        limiter.check("visitor")
        limiter.check("visitor")
        with self.assertRaises(HTTPException) as raised:
            limiter.check("visitor")
        self.assertEqual(raised.exception.status_code, 429)

        current_time[0] = 111.0
        limiter.check("visitor")

    def test_backup_can_be_verified_and_restored(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_dir:
            root = Path(temporary_dir)
            source = root / "fantasy.db"
            engine = __import__("sqlalchemy").create_engine(f"sqlite:///{source}")
            try:
                Base.metadata.create_all(engine)
                with engine.begin() as connection:
                    connection.exec_driver_sql(
                        "CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL)"
                    )
                    connection.exec_driver_sql(
                        "INSERT INTO alembic_version VALUES ('test_revision')"
                    )
            finally:
                engine.dispose()

            backup = create_backup(
                f"sqlite:///{source}",
                backup_dir=root / "backups",
                keep=1,
            )
            self.assertIsNotNone(backup)
            assert backup is not None
            self.assertTrue(
                {"managers", "seasons", "teams", "matchups"}.issubset(
                    verify_backup(backup)
                )
            )

            uploads = []

            class FakeS3Client:
                def upload_file(self, filename, bucket, key):
                    uploads.append((filename, bucket, key))

            fake_boto3 = types.SimpleNamespace(
                client=lambda *_args, **_kwargs: FakeS3Client()
            )
            with mock.patch.dict(sys.modules, {"boto3": fake_boto3}):
                object_key = upload_backup(
                    backup,
                    bucket="test-bucket",
                    prefix="league/backups",
                )
            self.assertEqual(
                object_key,
                f"league/backups/{backup.name}",
            )
            self.assertEqual(uploads[0][1:], ("test-bucket", object_key))

            restored = restore_backup(backup, root / "restored.db")
            with closing(sqlite3.connect(restored)) as db:
                self.assertEqual(db.execute("PRAGMA integrity_check").fetchone()[0], "ok")

            with self.assertRaises(FileExistsError):
                restore_backup(backup, restored)


if __name__ == "__main__":
    unittest.main()
