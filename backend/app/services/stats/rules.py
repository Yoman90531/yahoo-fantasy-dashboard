"""Shared definitions for matchup scopes and named statistical thresholds."""

from __future__ import annotations

import json
from enum import StrEnum
from pathlib import Path

from sqlalchemy.orm import Query

from app.models.matchup import Matchup


def _find_rules_path(source_file: Path = Path(__file__).resolve()) -> Path:
    for parent in source_file.parents:
        candidate = parent / "shared" / "stat_rules.json"
        if candidate.is_file():
            return candidate
    raise FileNotFoundError("Could not locate shared/stat_rules.json")


_RULES_PATH = _find_rules_path()
with _RULES_PATH.open(encoding="utf-8") as rules_file:
    _RULES = json.load(rules_file)

BLOWOUT_MARGIN = float(_RULES["blowout_margin"])
CLOSE_GAME_MARGIN = float(_RULES["close_game_margin"])


class MatchupScope(StrEnum):
    REGULAR_SEASON = "regular_season"
    PLAYOFFS = "playoffs"
    CONSOLATION = "consolation"
    ALL = "all"


def apply_matchup_scope(query: Query, scope: MatchupScope) -> Query:
    """Apply the league's canonical matchup-scope definition to a query."""
    if scope == MatchupScope.REGULAR_SEASON:
        return query.filter(
            Matchup.is_playoff.is_(False),
            Matchup.is_consolation.is_(False),
        )
    if scope == MatchupScope.PLAYOFFS:
        return query.filter(
            Matchup.is_playoff.is_(True),
            Matchup.is_consolation.is_(False),
        )
    if scope == MatchupScope.CONSOLATION:
        return query.filter(Matchup.is_consolation.is_(True))
    return query


def is_blowout(margin: float) -> bool:
    return margin >= BLOWOUT_MARGIN


def is_close_game(margin: float) -> bool:
    return 0 < margin <= CLOSE_GAME_MARGIN
