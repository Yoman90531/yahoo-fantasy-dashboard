"""Weekly scoring and finish-distribution analytics."""

from __future__ import annotations

import math
from collections import defaultdict

from sqlalchemy.orm import Session

from app.models.matchup import Matchup
from app.services.stats.context import (
    _all_teams,
    _get_active_managers,
    _get_matchups,
    _team_to_manager,
)


def compute_score_distribution(db: Session) -> list[dict]:
    team_to_manager = _team_to_manager(_all_teams(db))
    managers = {manager.id: manager for manager in _get_active_managers(db)}
    scores_by_manager: dict[int, list[float]] = defaultdict(list)

    for matchup in db.query(Matchup).all():
        for team_id, points in (
            (matchup.team1_id, matchup.team1_points),
            (matchup.team2_id, matchup.team2_points),
        ):
            manager_id = team_to_manager.get(team_id)
            if manager_id is not None:
                scores_by_manager[manager_id].append(points)

    results = []
    for manager_id, scores in scores_by_manager.items():
        manager = managers.get(manager_id)
        if manager is None or len(scores) < 4:
            continue

        ordered = sorted(scores)
        count = len(ordered)

        def percentile(value: float) -> float:
            index = (count - 1) * value
            lower = int(index)
            upper = min(lower + 1, count - 1)
            return ordered[lower] + (ordered[upper] - ordered[lower]) * (
                index - lower
            )

        first_quartile = percentile(0.25)
        median = percentile(0.5)
        third_quartile = percentile(0.75)
        interquartile_range = third_quartile - first_quartile
        lower_fence = first_quartile - 1.5 * interquartile_range
        upper_fence = third_quartile + 1.5 * interquartile_range
        mean = sum(scores) / count
        variance = sum((score - mean) ** 2 for score in scores) / (count - 1)

        results.append(
            {
                "manager_id": manager_id,
                "manager_name": manager.display_name,
                "n": count,
                "min": round(min(score for score in ordered if score >= lower_fence), 2),
                "q1": round(first_quartile, 2),
                "median": round(median, 2),
                "q3": round(third_quartile, 2),
                "max": round(max(score for score in ordered if score <= upper_fence), 2),
                "mean": round(mean, 2),
                "std_dev": round(math.sqrt(variance), 2),
                "outliers": [
                    round(score, 2)
                    for score in ordered
                    if score < lower_fence or score > upper_fence
                ],
            }
        )

    return sorted(results, key=lambda row: -row["median"])


def compute_weekly_finish_distribution(db: Session) -> list[dict]:
    team_to_manager = _team_to_manager(_all_teams(db))
    managers = {manager.id: manager for manager in _get_active_managers(db)}
    week_scores: dict[tuple[int, int], list[tuple[int, float]]] = defaultdict(list)

    for matchup in _get_matchups(db, is_playoff=False):
        week = (matchup.season_id, matchup.week)
        week_scores[week].extend(
            (
                (matchup.team1_id, matchup.team1_points),
                (matchup.team2_id, matchup.team2_points),
            )
        )

    buckets = (
        "first",
        "top_three",
        "top_half",
        "bottom_half",
        "bottom_three",
        "last",
    )
    counts_by_manager: dict[int, dict[str, int]] = defaultdict(
        lambda: {bucket: 0 for bucket in buckets}
    )

    for scores in week_scores.values():
        team_count = len(scores)
        if team_count < 2:
            continue
        for index, (team_id, _) in enumerate(
            sorted(scores, key=lambda score: -score[1])
        ):
            manager_id = team_to_manager.get(team_id)
            if manager_id is None:
                continue
            rank = index + 1
            if rank == 1:
                bucket = "first"
            elif rank <= 3:
                bucket = "top_three"
            elif rank <= team_count // 2:
                bucket = "top_half"
            elif rank == team_count and team_count > 3:
                bucket = "last"
            elif rank >= team_count - 2 and team_count > 3:
                bucket = "bottom_three"
            else:
                bucket = "bottom_half"
            counts_by_manager[manager_id][bucket] += 1

    results = []
    for manager_id, counts in counts_by_manager.items():
        manager = managers.get(manager_id)
        total = sum(counts.values())
        if manager is None or total == 0:
            continue
        results.append(
            {
                "manager_id": manager_id,
                "manager_name": manager.display_name,
                "total_weeks": total,
                **counts,
                "pct_first": round(counts["first"] / total * 100, 1),
                "pct_top_three": round(
                    (counts["first"] + counts["top_three"]) / total * 100,
                    1,
                ),
                "pct_top_half": round(
                    (
                        counts["first"]
                        + counts["top_three"]
                        + counts["top_half"]
                    )
                    / total
                    * 100,
                    1,
                ),
                "pct_last": round(counts["last"] / total * 100, 1),
                "pct_bottom_three": round(
                    (counts["last"] + counts["bottom_three"]) / total * 100,
                    1,
                ),
            }
        )

    return sorted(results, key=lambda row: -row["pct_top_half"])
