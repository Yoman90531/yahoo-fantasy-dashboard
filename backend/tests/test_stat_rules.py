import tempfile
import unittest
from pathlib import Path

from app.services.stats.rules import (
    BLOWOUT_MARGIN,
    CLOSE_GAME_MARGIN,
    _find_rules_path,
    is_blowout,
    is_close_game,
)


class StatRulesTest(unittest.TestCase):
    def test_shared_rules_are_found_in_a_flat_container_layout(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            container_root = Path(temporary_directory)
            expected = container_root / "shared" / "stat_rules.json"
            expected.parent.mkdir()
            expected.write_text("{}", encoding="utf-8")
            source_file = (
                container_root / "app" / "services" / "stats" / "rules.py"
            )

            self.assertEqual(_find_rules_path(source_file), expected)

    def test_blowout_boundary_is_inclusive(self) -> None:
        self.assertFalse(is_blowout(BLOWOUT_MARGIN - 0.01))
        self.assertTrue(is_blowout(BLOWOUT_MARGIN))

    def test_close_game_boundary_is_inclusive_and_ties_are_excluded(self) -> None:
        self.assertFalse(is_close_game(0))
        self.assertTrue(is_close_game(CLOSE_GAME_MARGIN))
        self.assertFalse(is_close_game(CLOSE_GAME_MARGIN + 0.01))


if __name__ == "__main__":
    unittest.main()
