"""Shared query and identity helpers for analytics modules."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.manager import Manager
from app.models.matchup import Matchup
from app.models.season import Season
from app.models.team import Team
from app.services.manager_names import override_name_for_guid
from app.services.stats.rules import MatchupScope, apply_matchup_scope


def _apply_overrides(managers: list[Manager]) -> list[Manager]:
    """Apply canonical display-name overrides in memory."""
    for manager in managers:
        override_name = override_name_for_guid(manager.yahoo_guid)
        if override_name:
            manager.display_name = override_name
    return managers


def _get_active_managers(db: Session) -> list[Manager]:
    """Return managers with known identities, with overrides applied first."""
    managers = _apply_overrides(db.query(Manager).all())
    return [
        manager
        for manager in managers
        if (
            override_name_for_guid(manager.yahoo_guid)
            or (
                not manager.yahoo_guid.lower().startswith("hidden_")
                and "hidden" not in manager.display_name.lower()
            )
        )
    ]


def _all_teams(db: Session) -> list[Team]:
    return db.query(Team).all()


def _team_to_manager(teams: list[Team]) -> dict[int, int]:
    return {team.id: team.manager_id for team in teams}


def _team_yahoo_ids(teams: list[Team]) -> dict[int, int]:
    return {team.id: team.yahoo_team_id for team in teams}


def _season_map(db: Session) -> dict[int, Season]:
    return {season.id: season for season in db.query(Season).all()}


def _get_matchups(
    db: Session,
    *,
    is_playoff: bool | None = None,
    is_consolation: bool = False,
) -> list[Matchup]:
    if is_consolation:
        query = apply_matchup_scope(db.query(Matchup), MatchupScope.CONSOLATION)
    elif is_playoff is True:
        query = apply_matchup_scope(db.query(Matchup), MatchupScope.PLAYOFFS)
    elif is_playoff is False:
        query = apply_matchup_scope(db.query(Matchup), MatchupScope.REGULAR_SEASON)
    else:
        query = db.query(Matchup).filter(Matchup.is_consolation.is_(False))
    return query.all()


def _get_season_by_year(db: Session, year: int) -> Season | None:
    return db.query(Season).filter(Season.year == year).first()
