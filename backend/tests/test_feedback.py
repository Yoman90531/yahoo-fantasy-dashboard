import os
import unittest

os.environ.setdefault("YAHOO_CLIENT_ID", "test")
os.environ.setdefault("YAHOO_CLIENT_SECRET", "test")
os.environ.setdefault("LEAGUE_ID", "test")

from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.feedback import Feedback
from app.routers.feedback import create_feedback, list_feedback
from app.schemas.feedback import FeedbackCreate


class FeedbackTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(bind=self.engine)
        self.db = self.session_factory()

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()

    def test_create_trims_content_and_list_returns_newest_first(self) -> None:
        first = create_feedback(
            FeedbackCreate(author_name=" Dan ", message=" First idea "),
            self.db,
        )
        second = create_feedback(
            FeedbackCreate(author_name=" Karna ", message=" Second idea "),
            self.db,
        )

        posts = list_feedback(limit=100, db=self.db)

        self.assertEqual(first.author_name, "Dan")
        self.assertEqual(first.message, "First idea")
        self.assertEqual([post.id for post in posts], [second.id, first.id])

    def test_whitespace_only_content_is_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            FeedbackCreate(author_name="Dan", message="   ")

    def test_feedback_table_is_persistent_model_metadata(self) -> None:
        self.assertIn(Feedback.__tablename__, Base.metadata.tables)


if __name__ == "__main__":
    unittest.main()
