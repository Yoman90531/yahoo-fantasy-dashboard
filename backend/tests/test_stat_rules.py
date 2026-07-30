import unittest

from app.services.stats.rules import (
    BLOWOUT_MARGIN,
    CLOSE_GAME_MARGIN,
    is_blowout,
    is_close_game,
)


class StatRulesTest(unittest.TestCase):
    def test_blowout_boundary_is_inclusive(self) -> None:
        self.assertFalse(is_blowout(BLOWOUT_MARGIN - 0.01))
        self.assertTrue(is_blowout(BLOWOUT_MARGIN))

    def test_close_game_boundary_is_inclusive_and_ties_are_excluded(self) -> None:
        self.assertFalse(is_close_game(0))
        self.assertTrue(is_close_game(CLOSE_GAME_MARGIN))
        self.assertFalse(is_close_game(CLOSE_GAME_MARGIN + 0.01))


if __name__ == "__main__":
    unittest.main()
