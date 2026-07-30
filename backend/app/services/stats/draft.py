"""Draft capital, tendency, grading, and pick-value analytics."""

from __future__ import annotations

from collections import defaultdict

from sqlalchemy.orm import Session

from app.models.draft_pick import DraftPick
from app.models.player_season import PlayerSeason
from app.models.season import Season
from app.services.stats.context import (
    _all_teams,
    _get_active_managers,
    _get_season_by_year,
    _team_to_manager,
)


def _empty_analysis() -> dict[str, list]:
    return {
        "position_capital": [],
        "tendencies": [],
        "grades": [],
        "best_picks": [],
        "worst_picks": [],
    }


def _letter_grade(score: float) -> str:
    for threshold, grade in (
        (12, "A+"),
        (10, "A"),
        (8, "A-"),
        (6.5, "B+"),
        (5, "B"),
        (4, "B-"),
        (3, "C+"),
        (2, "C"),
        (1.5, "C-"),
        (1, "D"),
    ):
        if score >= threshold:
            return grade
    return "F"


def compute_draft_analysis(db: Session, year: int | None = None) -> dict:
    managers = _get_active_managers(db)
    manager_names = {manager.id: manager.display_name for manager in managers}
    manager_ids = set(manager_names)
    seasons = {season.id: season for season in db.query(Season).all()}
    team_to_manager = _team_to_manager(_all_teams(db))

    pick_query = db.query(DraftPick)
    player_query = db.query(PlayerSeason)
    if year:
        season = _get_season_by_year(db, year)
        if not season:
            return _empty_analysis()
        pick_query = pick_query.filter(DraftPick.season_id == season.id)
        player_query = player_query.filter(PlayerSeason.season_id == season.id)

    picks = pick_query.all()
    player_stats = {
        (player.season_id, player.player_key): player
        for player in player_query.all()
    }

    max_pick_by_season: dict[int, int] = defaultdict(int)
    for pick in picks:
        max_pick_by_season[pick.season_id] = max(
            max_pick_by_season[pick.season_id],
            pick.pick,
        )

    enriched = []
    for pick in picks:
        manager_id = team_to_manager.get(pick.team_id)
        season = seasons.get(pick.season_id)
        if manager_id not in manager_ids or season is None:
            continue

        pick_value = max_pick_by_season[pick.season_id] - pick.pick + 1
        player = player_stats.get((pick.season_id, pick.player_key))
        fantasy_points = player.fantasy_points if player else 0.0
        enriched.append(
            {
                "manager_id": manager_id,
                "manager_name": manager_names[manager_id],
                "season_id": pick.season_id,
                "year": season.year,
                "round": pick.round,
                "pick": pick.pick,
                "player_name": pick.player_name,
                "position": pick.position,
                "pick_value": pick_value,
                "fantasy_points": fantasy_points,
                "roi": round(fantasy_points / pick_value, 2) if pick_value else 0.0,
            }
        )

    capital: dict[tuple[int, str], dict] = defaultdict(
        lambda: {"picks": [], "capital": 0.0}
    )
    tendencies_data: dict[tuple[int, str], dict[str, int]] = defaultdict(
        lambda: {"early": 0, "mid": 0, "late": 0, "total": 0}
    )
    grade_data: dict[tuple[int, int], list[dict]] = defaultdict(list)

    for pick in enriched:
        manager_position = (pick["manager_id"], pick["position"])
        capital[manager_position]["picks"].append(pick["pick"])
        capital[manager_position]["capital"] += pick["pick_value"]

        tendency = tendencies_data[manager_position]
        tendency["total"] += 1
        if pick["round"] <= 4:
            tendency["early"] += 1
        elif pick["round"] <= 9:
            tendency["mid"] += 1
        else:
            tendency["late"] += 1

        grade_data[(pick["manager_id"], pick["year"])].append(pick)

    position_capital = [
        {
            "manager_id": manager_id,
            "manager_name": manager_names[manager_id],
            "position": position,
            "picks_spent": len(values["picks"]),
            "avg_pick": round(sum(values["picks"]) / len(values["picks"]), 1),
            "total_capital": round(values["capital"], 1),
        }
        for (manager_id, position), values in capital.items()
    ]
    position_capital.sort(
        key=lambda row: (row["manager_name"], -row["total_capital"])
    )

    tendencies = []
    for (manager_id, position), values in tendencies_data.items():
        total = values["total"]
        tendencies.append(
            {
                "manager_id": manager_id,
                "manager_name": manager_names[manager_id],
                "position": position,
                "early_round_pct": round(values["early"] / total * 100, 1),
                "mid_round_pct": round(values["mid"] / total * 100, 1),
                "late_round_pct": round(values["late"] / total * 100, 1),
            }
        )
    tendencies.sort(key=lambda row: (row["manager_name"], row["position"]))

    grades = []
    for (manager_id, season_year), manager_picks in grade_data.items():
        average_roi = sum(pick["roi"] for pick in manager_picks) / len(manager_picks)
        grades.append(
            {
                "manager_id": manager_id,
                "manager_name": manager_names[manager_id],
                "year": season_year,
                "grade": _letter_grade(average_roi),
                "composite_score": round(average_roi, 2),
                "total_picks": len(manager_picks),
                "avg_roi": round(average_roi, 2),
            }
        )
    grades.sort(key=lambda row: -row["composite_score"])

    picks_with_stats = [pick for pick in enriched if pick["fantasy_points"] > 0]
    best_picks = sorted(picks_with_stats, key=lambda pick: -pick["roi"])[:10]
    worst_picks = [
        pick
        for pick in sorted(picks_with_stats, key=lambda pick: pick["roi"])
        if pick["pick_value"] >= 5
    ][:10]

    return {
        "position_capital": position_capital,
        "tendencies": tendencies,
        "grades": grades,
        "best_picks": best_picks,
        "worst_picks": worst_picks,
    }
