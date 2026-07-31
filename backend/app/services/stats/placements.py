"""Final-placement and manager-identity analytics."""

from __future__ import annotations

from collections import defaultdict
from statistics import median

from sqlalchemy.orm import Session

from app.models.season import Season
from app.models.team import Team
from app.services.stats.context import (
    _all_teams,
    _get_active_managers,
    _get_matchups,
    _season_map,
    _team_to_manager,
)


def normalized_finish_percentile(final_rank: int | None, num_teams: int | None) -> float | None:
    """Normalize a final placement so first is 100 and last is 0."""
    if final_rank is None or num_teams is None or num_teams <= 1:
        return None
    if final_rank < 1 or final_rank > num_teams:
        return None
    return round((num_teams - final_rank) / (num_teams - 1) * 100, 1)


def _competition_ranks(rows: list[dict], key: str) -> None:
    """Assign 1, 1, 3 style ranks to rows already sorted by a numeric key."""
    previous_value = None
    previous_rank = 0
    for index, row in enumerate(rows, start=1):
        value = row[key]
        if previous_value is None or value != previous_value:
            previous_rank = index
            previous_value = value
        row["placement_rank"] = previous_rank


def compute_manager_placements(
    db: Session,
    year_start: int | None = None,
    year_end: int | None = None,
) -> list[dict]:
    """Aggregate official Yahoo final standings for each manager."""
    managers = _get_active_managers(db)
    manager_map = {manager.id: manager for manager in managers}
    seasons = _season_map(db)

    query = db.query(Team).join(Season, Team.season_id == Season.id)
    if year_start is not None:
        query = query.filter(Season.year >= year_start)
    if year_end is not None:
        query = query.filter(Season.year <= year_end)

    teams_by_manager: dict[int, list[Team]] = defaultdict(list)
    for team in query.all():
        if team.manager_id in manager_map:
            teams_by_manager[team.manager_id].append(team)

    results: list[dict] = []
    for manager_id, teams in teams_by_manager.items():
        ranked_teams = [
            team
            for team in teams
            if team.final_rank is not None and team.final_rank > 0
        ]
        if not ranked_teams:
            continue

        finishes = [team.final_rank for team in ranked_teams]
        normalized_finishes = [
            percentile
            for team in ranked_teams
            if (
                percentile := normalized_finish_percentile(
                    team.final_rank,
                    seasons.get(team.season_id).num_teams if seasons.get(team.season_id) else None,
                )
            )
            is not None
        ]
        championships = sum(
            1 for team in ranked_teams if team.is_champion or team.final_rank == 1
        )
        runner_ups = sum(1 for team in ranked_teams if team.final_rank == 2)
        top_three_finishes = sum(1 for finish in finishes if finish <= 3)
        last_place_finishes = sum(
            1
            for team in ranked_teams
            if (
                (season := seasons.get(team.season_id))
                and season.num_teams
                and team.final_rank == season.num_teams
            )
        )
        playoff_appearances = sum(1 for team in teams if team.made_playoffs)
        seasons_played = len(teams)

        results.append(
            {
                "placement_rank": 0,
                "manager_id": manager_id,
                "manager_name": manager_map[manager_id].display_name,
                "seasons_played": seasons_played,
                "ranked_seasons": len(ranked_teams),
                "average_finish": round(sum(finishes) / len(finishes), 2),
                "median_finish": round(float(median(finishes)), 2),
                "finish_percentile": (
                    round(sum(normalized_finishes) / len(normalized_finishes), 1)
                    if normalized_finishes
                    else None
                ),
                "best_finish": min(finishes),
                "worst_finish": max(finishes),
                "championships": championships,
                "runner_ups": runner_ups,
                "top_three_finishes": top_three_finishes,
                "top_three_rate": round(top_three_finishes / len(ranked_teams), 4),
                "last_place_finishes": last_place_finishes,
                "last_place_rate": round(last_place_finishes / len(ranked_teams), 4),
                "playoff_appearances": playoff_appearances,
                "playoff_rate": round(playoff_appearances / seasons_played, 4)
                if seasons_played
                else 0.0,
            }
        )

    results.sort(
        key=lambda row: (
            row["average_finish"],
            -(row["finish_percentile"] or 0),
            -row["championships"],
            -row["ranked_seasons"],
            row["manager_name"],
        )
    )
    _competition_ranks(results, "average_finish")
    return results


def _opponent_snapshot(
    opponent_id: int,
    stats: dict,
    manager_map: dict[int, object],
) -> dict:
    games = stats["wins"] + stats["losses"] + stats["ties"]
    return {
        "manager_id": opponent_id,
        "manager_name": manager_map[opponent_id].display_name,
        "games": games,
        "wins": stats["wins"],
        "losses": stats["losses"],
        "ties": stats["ties"],
        "win_pct": round(stats["wins"] / games, 4) if games else 0.0,
        "points_for": round(stats["points_for"], 2),
        "points_against": round(stats["points_against"], 2),
        "point_diff": round(stats["points_for"] - stats["points_against"], 2),
    }


def _manager_badges(placement: dict) -> list[dict]:
    badges: list[dict] = []
    championships = placement["championships"]
    seasons = placement["ranked_seasons"]

    if championships >= 3:
        badges.append(
            {
                "key": "dynasty-club",
                "label": "Dynasty Club",
                "icon": "crown",
                "description": f"{championships} league championships.",
            }
        )
    elif championships > 0:
        badges.append(
            {
                "key": "league-champion",
                "label": "League Champion",
                "icon": "trophy",
                "description": f"{championships} league championship"
                f"{'s' if championships != 1 else ''}.",
            }
        )

    if seasons >= 3 and placement["top_three_rate"] >= 0.4:
        badges.append(
            {
                "key": "podium-regular",
                "label": "Podium Regular",
                "icon": "medal",
                "description": (
                    f"Finished in the top three in {placement['top_three_finishes']} "
                    f"of {seasons} ranked seasons."
                ),
            }
        )

    if seasons >= 3 and placement["playoff_rate"] >= 0.7:
        badges.append(
            {
                "key": "playoff-mainstay",
                "label": "Playoff Mainstay",
                "icon": "badge-check",
                "description": (
                    f"Reached the playoffs in {placement['playoff_appearances']} "
                    f"of {placement['seasons_played']} seasons."
                ),
            }
        )

    if seasons >= 5 and placement["last_place_finishes"] == 0:
        badges.append(
            {
                "key": "never-last",
                "label": "Never Last",
                "icon": "shield",
                "description": f"Avoided last place across {seasons} ranked seasons.",
            }
        )

    if placement["seasons_played"] >= 10:
        badges.append(
            {
                "key": "league-lifer",
                "label": "League Lifer",
                "icon": "history",
                "description": f"{placement['seasons_played']} seasons in the league.",
            }
        )

    return badges[:5]


def compute_manager_profile_summary(db: Session, manager_id: int) -> dict | None:
    """Build the placement, rivalry, and signature-season profile summary."""
    placements = compute_manager_placements(db)
    placement = next(
        (row for row in placements if row["manager_id"] == manager_id),
        None,
    )
    if placement is None:
        return None

    manager_map = {manager.id: manager for manager in _get_active_managers(db)}
    if manager_id not in manager_map:
        return None

    all_teams = _all_teams(db)
    team_to_manager = _team_to_manager(all_teams)
    opponent_stats: dict[int, dict] = defaultdict(
        lambda: {
            "wins": 0,
            "losses": 0,
            "ties": 0,
            "points_for": 0.0,
            "points_against": 0.0,
        }
    )

    for matchup in _get_matchups(db):
        manager_a = team_to_manager.get(matchup.team1_id)
        manager_b = team_to_manager.get(matchup.team2_id)
        if manager_id not in (manager_a, manager_b):
            continue

        opponent_id = manager_b if manager_a == manager_id else manager_a
        if opponent_id is None or opponent_id not in manager_map or opponent_id == manager_id:
            continue

        my_team_id = matchup.team1_id if manager_a == manager_id else matchup.team2_id
        my_points = matchup.team1_points if manager_a == manager_id else matchup.team2_points
        opponent_points = matchup.team2_points if manager_a == manager_id else matchup.team1_points
        stats = opponent_stats[opponent_id]
        stats["points_for"] += my_points
        stats["points_against"] += opponent_points

        if matchup.winner_team_id == my_team_id:
            stats["wins"] += 1
        elif matchup.winner_team_id is None:
            stats["ties"] += 1
        else:
            stats["losses"] += 1

    snapshots = [
        _opponent_snapshot(opponent_id, stats, manager_map)
        for opponent_id, stats in opponent_stats.items()
    ]
    qualified = [snapshot for snapshot in snapshots if snapshot["games"] >= 3] or snapshots

    favorite_opponent = (
        max(
            qualified,
            key=lambda row: (row["win_pct"], row["games"], row["point_diff"]),
        )
        if qualified
        else None
    )
    nemesis = (
        min(
            qualified,
            key=lambda row: (row["win_pct"], -row["games"], row["point_diff"]),
        )
        if qualified
        else None
    )
    closest_rivalry = (
        min(
            qualified,
            key=lambda row: (
                abs(row["wins"] - row["losses"]),
                -row["games"],
                abs(row["point_diff"]),
            ),
        )
        if qualified
        else None
    )

    seasons = _season_map(db)
    manager_teams = [team for team in all_teams if team.manager_id == manager_id]
    ranked_teams = [team for team in manager_teams if team.final_rank is not None]
    signature_team = (
        min(
            ranked_teams,
            key=lambda team: (
                team.final_rank,
                -(
                    team.wins / (team.wins + team.losses + team.ties)
                    if team.wins + team.losses + team.ties
                    else 0
                ),
                -team.points_for,
                -seasons[team.season_id].year,
            ),
        )
        if ranked_teams
        else None
    )
    signature_season = None
    if signature_team is not None:
        season = seasons[signature_team.season_id]
        signature_season = {
            "year": season.year,
            "team_name": signature_team.team_name,
            "final_finish": signature_team.final_rank,
            "finish_percentile": normalized_finish_percentile(
                signature_team.final_rank,
                season.num_teams,
            ),
            "wins": signature_team.wins,
            "losses": signature_team.losses,
            "ties": signature_team.ties,
            "points_for": round(signature_team.points_for, 2),
            "is_champion": signature_team.is_champion or signature_team.final_rank == 1,
        }

    return {
        "placement": placement,
        "favorite_opponent": favorite_opponent,
        "nemesis": nemesis,
        "closest_rivalry": closest_rivalry,
        "signature_season": signature_season,
        "badges": _manager_badges(placement),
    }
