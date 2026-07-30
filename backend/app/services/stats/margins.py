"""Regular-season win-margin analytics."""

from __future__ import annotations

from collections import defaultdict

from sqlalchemy.orm import Session

from app.models.matchup import Matchup
from app.services.stats.rules import (
    MatchupScope,
    apply_matchup_scope,
    is_blowout,
    is_close_game,
)
from app.services.stats.context import (
    _all_teams,
    _get_active_managers,
    _get_season_by_year,
    _team_to_manager,
)


def compute_win_margins(db: Session, year: int | None = None) -> list[dict]:
    team_to_manager = _team_to_manager(_all_teams(db))
    managers = {manager.id: manager for manager in _get_active_managers(db)}
    matchup_query = apply_matchup_scope(
        db.query(Matchup),
        MatchupScope.REGULAR_SEASON,
    )

    if year:
        season = _get_season_by_year(db, year)
        if not season:
            return []
        matchup_query = matchup_query.filter(Matchup.season_id == season.id)

    win_margins: dict[int, list[float]] = defaultdict(list)
    loss_margins: dict[int, list[float]] = defaultdict(list)

    for matchup in matchup_query.all():
        if matchup.winner_team_id is None:
            continue
        margin = abs(matchup.team1_points - matchup.team2_points)
        loser_team_id = (
            matchup.team2_id
            if matchup.winner_team_id == matchup.team1_id
            else matchup.team1_id
        )
        winner_manager = team_to_manager.get(matchup.winner_team_id)
        loser_manager = team_to_manager.get(loser_team_id)
        if winner_manager is not None:
            win_margins[winner_manager].append(margin)
        if loser_manager is not None:
            loss_margins[loser_manager].append(margin)

    results = []
    for manager_id in set(win_margins) | set(loss_margins):
        manager = managers.get(manager_id)
        if manager is None:
            continue
        wins = win_margins.get(manager_id, [])
        losses = loss_margins.get(manager_id, [])
        results.append(
            {
                "manager_id": manager_id,
                "manager_name": manager.display_name,
                "avg_win_margin": round(sum(wins) / len(wins), 2) if wins else 0.0,
                "avg_loss_margin": (
                    round(sum(losses) / len(losses), 2) if losses else 0.0
                ),
                "blowout_wins": sum(is_blowout(margin) for margin in wins),
                "close_wins": sum(is_close_game(margin) for margin in wins),
                "blowout_losses": sum(is_blowout(margin) for margin in losses),
                "close_losses": sum(is_close_game(margin) for margin in losses),
                "biggest_win": round(max(wins), 2) if wins else 0.0,
                "biggest_loss": round(max(losses), 2) if losses else 0.0,
            }
        )

    return sorted(results, key=lambda row: -row["avg_win_margin"])
