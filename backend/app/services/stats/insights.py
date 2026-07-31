"""Ranked data behind the dashboard's editorial insight cards."""

from __future__ import annotations

from collections.abc import Callable

from sqlalchemy.orm import Session

from app.services.stats.distributions import (
    compute_score_distribution,
    compute_weekly_finish_distribution,
)
from app.services.stats.margins import compute_win_margins
from app.services.stats.placements import compute_manager_placements


def _number(value: float, decimals: int = 1) -> str:
    return f"{value:,.{decimals}f}"


def _percent_fraction(value: float) -> str:
    return f"{value * 100:.1f}%"


def _percent_whole(value: float) -> str:
    return f"{value:.1f}%"


def _signed(value: float, decimals: int = 1) -> str:
    return f"{value:+.{decimals}f}"


def _rank_group(
    *,
    metric_key: str,
    title: str,
    description: str,
    rows: list[dict],
    value_key: str,
    id_key: str = "manager_id",
    name_key: str = "manager_name",
    higher_is_better: bool = True,
    formatter: Callable[[float], str] = _number,
) -> dict | None:
    candidates = [
        row
        for row in rows
        if row.get(value_key) is not None
        and row.get(id_key) is not None
        and row.get(name_key)
    ]
    if not candidates:
        return None

    candidates.sort(
        key=lambda row: (
            -float(row[value_key]) if higher_is_better else float(row[value_key]),
            str(row[name_key]),
        )
    )
    entries = []
    previous_value = None
    previous_rank = 0
    for index, row in enumerate(candidates, start=1):
        value = float(row[value_key])
        if previous_value is None or value != previous_value:
            previous_rank = index
            previous_value = value
        entries.append(
            {
                "rank": previous_rank,
                "manager_id": int(row[id_key]),
                "manager_name": str(row[name_key]),
                "value": value,
                "display_value": formatter(value),
            }
        )

    return {
        "metric_key": metric_key,
        "title": title,
        "description": description,
        "higher_is_better": higher_is_better,
        "entries": entries,
    }


def compute_insight_rankings(db: Session, insight_key: str) -> dict:
    """Return complete rankings for insight sections with comparable metrics."""
    # Imported lazily because stats_engine still owns several legacy domains.
    from app.services import stats_engine

    groups: list[dict | None]

    if insight_key in {"leagueHq", "seasonArchive", "allTimeStandings"}:
        placements = compute_manager_placements(db)
        all_time = stats_engine.compute_all_time_records(db)
        groups = [
            _rank_group(
                metric_key="average_finish",
                title="Best Average Finish",
                description="Average official final standing, including postseason results. Lower is better.",
                rows=placements,
                value_key="average_finish",
                higher_is_better=False,
                formatter=lambda value: f"{value:.2f}",
            ),
            _rank_group(
                metric_key="finish_percentile",
                title="Era-Adjusted Finish",
                description="Average placement normalized for league size. First is 100%; last is 0%.",
                rows=placements,
                value_key="finish_percentile",
                formatter=_percent_whole,
            ),
            _rank_group(
                metric_key="championships",
                title="Championships",
                description="Official first-place finishes.",
                rows=all_time,
                value_key="championships",
                id_key="id",
                name_key="display_name",
                formatter=lambda value: f"{int(value)}",
            ),
            _rank_group(
                metric_key="total_points_for",
                title="Career Points",
                description="Regular-season points scored across all completed seasons.",
                rows=all_time,
                value_key="total_points_for",
                id_key="id",
                name_key="display_name",
                formatter=lambda value: _number(value, 0),
            ),
        ]
    elif insight_key == "scoringProfiles":
        rows = compute_score_distribution(db)
        groups = [
            _rank_group(
                metric_key="mean",
                title="Highest Weekly Average",
                description="Mean weekly score across regular-season games.",
                rows=rows,
                value_key="mean",
            ),
            _rank_group(
                metric_key="consistency",
                title="Most Consistent",
                description="Lowest weekly scoring standard deviation.",
                rows=rows,
                value_key="std_dev",
                higher_is_better=False,
                formatter=lambda value: f"±{value:.1f}",
            ),
            _rank_group(
                metric_key="volatility",
                title="Most Volatile",
                description="Highest weekly scoring standard deviation.",
                rows=rows,
                value_key="std_dev",
                formatter=lambda value: f"±{value:.1f}",
            ),
        ]
    elif insight_key == "weeklyRankings":
        rows = compute_weekly_finish_distribution(db)
        groups = [
            _rank_group(
                metric_key="first",
                title="Weekly Scoring Crowns",
                description="Weeks finishing first in league scoring.",
                rows=rows,
                value_key="first",
                formatter=lambda value: f"{int(value)}",
            ),
            _rank_group(
                metric_key="pct_top_half",
                title="Top-Half Rate",
                description="Share of weeks finishing in the top half.",
                rows=rows,
                value_key="pct_top_half",
                formatter=_percent_whole,
            ),
            _rank_group(
                metric_key="pct_last",
                title="Lowest Last-Place Rate",
                description="Share of weeks finishing last. Lower is better.",
                rows=rows,
                value_key="pct_last",
                higher_is_better=False,
                formatter=_percent_whole,
            ),
        ]
    elif insight_key == "projectionAccuracy":
        rows = stats_engine.compute_projection_performance(db)
        groups = [
            _rank_group(
                metric_key="avg_diff",
                title="Average Projection Beat",
                description="Average weekly score minus Yahoo's projection.",
                rows=rows,
                value_key="avg_diff",
                formatter=_signed,
            ),
            _rank_group(
                metric_key="beat_projection_pct",
                title="Beat-Projection Rate",
                description="Share of weeks finishing above Yahoo's projection.",
                rows=rows,
                value_key="beat_projection_pct",
                formatter=_percent_whole,
            ),
        ]
    elif insight_key == "scheduleLuck":
        rows = stats_engine.compute_luck_index(db)
        groups = [
            _rank_group(
                metric_key="luckiest",
                title="Luckiest",
                description="Actual wins above schedule-neutral expected wins.",
                rows=rows,
                value_key="luck_score",
                formatter=_signed,
            ),
            _rank_group(
                metric_key="unluckiest",
                title="Unluckiest",
                description="Actual wins below schedule-neutral expected wins.",
                rows=rows,
                value_key="luck_score",
                higher_is_better=False,
                formatter=_signed,
            ),
        ]
    elif insight_key == "scheduleDifficulty":
        rows = stats_engine.compute_strength_of_schedule(db)
        groups = [
            _rank_group(
                metric_key="avg_opp_win_pct",
                title="Toughest Schedule",
                description="Average opponent win percentage.",
                rows=rows,
                value_key="avg_opp_win_pct",
                formatter=_percent_fraction,
            ),
            _rank_group(
                metric_key="adjusted_win_pct",
                title="Schedule-Adjusted Win Rate",
                description="Win rate adjusted for opponent quality.",
                rows=rows,
                value_key="adjusted_win_pct",
                formatter=_percent_fraction,
            ),
        ]
    elif insight_key == "playoffRecords":
        rows = [
            row
            for row in stats_engine.compute_playoff_performance(db)
            if row["playoff_games"] > 0
        ]
        groups = [
            _rank_group(
                metric_key="playoff_wins",
                title="Playoff Wins",
                description="Total championship-bracket victories.",
                rows=rows,
                value_key="playoff_wins",
                formatter=lambda value: f"{int(value)}",
            ),
            _rank_group(
                metric_key="playoff_win_pct",
                title="Playoff Win Rate",
                description="Championship-bracket win percentage.",
                rows=rows,
                value_key="playoff_win_pct",
                formatter=_percent_fraction,
            ),
            _rank_group(
                metric_key="playoff_avg_pts",
                title="Playoff Scoring",
                description="Average points scored in championship-bracket games.",
                rows=rows,
                value_key="playoff_avg_pts",
            ),
        ]
    elif insight_key == "toiletBowl":
        rows = stats_engine.compute_consolation_bracket(db)
        groups = [
            _rank_group(
                metric_key="consolation_wins",
                title="Consolation Wins",
                description="Total Toilet Bowl and consolation victories.",
                rows=rows,
                value_key="consolation_wins",
                formatter=lambda value: f"{int(value)}",
            ),
            _rank_group(
                metric_key="consolation_win_pct",
                title="Consolation Win Rate",
                description="Win percentage after missing the playoffs.",
                rows=rows,
                value_key="consolation_win_pct",
                formatter=_percent_fraction,
            ),
        ]
    elif insight_key == "blowoutsNailBiters":
        rows = compute_win_margins(db)
        groups = [
            _rank_group(
                metric_key="blowout_wins",
                title="Blowout Wins",
                description="Wins by at least the league's blowout threshold.",
                rows=rows,
                value_key="blowout_wins",
                formatter=lambda value: f"{int(value)}",
            ),
            _rank_group(
                metric_key="close_wins",
                title="Close Wins",
                description="Wins in games decided by the close-game threshold.",
                rows=rows,
                value_key="close_wins",
                formatter=lambda value: f"{int(value)}",
            ),
        ]
    elif insight_key == "hotColdStreaks":
        rows = stats_engine.compute_streaks_all(db)
        groups = [
            _rank_group(
                metric_key="longest_win_streak",
                title="Longest Win Streak",
                description="Longest consecutive regular-season winning streak.",
                rows=rows,
                value_key="longest_win_streak",
                formatter=lambda value: f"{int(value)}",
            ),
            _rank_group(
                metric_key="longest_loss_streak",
                title="Longest Losing Streak",
                description="Longest consecutive regular-season losing streak.",
                rows=rows,
                value_key="longest_loss_streak",
                formatter=lambda value: f"{int(value)}",
            ),
        ]
    else:
        groups = []

    return {
        "insight_key": insight_key,
        "groups": [group for group in groups if group is not None],
    }
