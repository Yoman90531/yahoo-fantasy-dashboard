"""
Read-only cross-route audit for a running fantasy dashboard.

Usage:
    python scripts/audit_live_api.py
    python scripts/audit_live_api.py https://vibedan.duckdns.org/fantasy
"""
from __future__ import annotations

import json
import math
import sys
from collections import Counter, defaultdict
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.manager_names import override_name_for_guid


BASE_URL = (
    sys.argv[1]
    if len(sys.argv) > 1
    else "https://vibedan.duckdns.org/fantasy"
).rstrip("/")
YEAR_ENDPOINTS = (
    "/api/stats/luck-index",
    "/api/stats/consistency",
    "/api/stats/awards",
    "/api/stats/power-rankings",
    "/api/stats/projection-performance",
    "/api/stats/win-margins",
    "/api/stats/playoff-performance",
    "/api/stats/consolation",
    "/api/stats/strength-of-schedule",
    "/api/draft/analysis",
)
GLOBAL_ENDPOINTS = (
    "/api/stats/alltime",
    "/api/stats/headtohead",
    "/api/stats/weekly-records?top_n=50",
    "/api/stats/points-inflation",
    "/api/stats/droughts",
    "/api/stats/season-scoring",
    "/api/stats/score-distribution",
    "/api/stats/weekly-finish-distribution",
    "/api/stats/throne-tracker",
    "/api/stats/awards",
    "/api/stats/power-rankings",
    "/api/stats/projection-performance",
    "/api/stats/win-margins",
    "/api/stats/playoff-performance",
    "/api/stats/league-parity",
    "/api/stats/streaks",
    "/api/stats/consolation",
    "/api/stats/manager-tiers",
    "/api/stats/strength-of-schedule",
    "/api/draft/analysis",
    "/api/sync/status",
    "/api/sync/log?limit=100",
)


class Audit:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.info: list[str] = []
        self.responses: dict[str, object] = {}

    def error(self, message: str) -> None:
        if message not in self.errors:
            self.errors.append(message)

    def warn(self, message: str) -> None:
        if message not in self.warnings:
            self.warnings.append(message)

    def note(self, message: str) -> None:
        if message not in self.info:
            self.info.append(message)

    def fetch(self, path: str) -> object | None:
        url = f"{BASE_URL}{path}"
        try:
            request = Request(url, headers={"Accept": "application/json"})
            with urlopen(request, timeout=30) as response:
                body = response.read().decode("utf-8")
                data = json.loads(body)
                self.responses[path] = data
                return data
        except HTTPError as error:
            self.error(f"{path} returned HTTP {error.code}.")
        except (URLError, TimeoutError) as error:
            self.error(f"{path} could not be reached: {error}.")
        except json.JSONDecodeError:
            self.error(f"{path} did not return valid JSON.")
        return None

    def print_report(self) -> None:
        print(f"=== Live Fantasy API Audit: {BASE_URL} ===")
        for title, entries in (
            ("ERRORS", self.errors),
            ("WARNINGS", self.warnings),
            ("NOTES", self.info),
        ):
            print(f"\n{title} ({len(entries)})")
            if entries:
                for entry in entries:
                    print(f"  - {entry}")
            else:
                print("  None")
        print(
            f"\nChecked {len(self.responses)} responses. Result: "
            f"{len(self.errors)} error(s), {len(self.warnings)} warning(s)."
        )


def _walk(value: object, path: str = "$"):
    if isinstance(value, dict):
        for key, child in value.items():
            yield from _walk(child, f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from _walk(child, f"{path}[{index}]")
    else:
        yield path, value


def _scan_response(audit: Audit, endpoint: str, data: object) -> None:
    unresolved_identities: Counter[tuple[str, str]] = Counter()
    unresolved_source_data: Counter[tuple[str, str]] = Counter()
    for path, value in _walk(data):
        field = path.rsplit(".", 1)[-1].lower()
        if isinstance(value, str):
            normalized = value.strip().lower()
            if "manager" in field and (
                normalized == "unknown"
                or "hidden" in normalized
                or normalized.isdigit()
            ):
                unresolved_identities[(field, value)] += 1
            if normalized.startswith("unknown ("):
                unresolved_source_data[(field, value)] += 1
        elif isinstance(value, float) and not math.isfinite(value):
            audit.error(f"{endpoint} has non-finite numeric data at {path}: {value!r}.")

    for (field, value), count in unresolved_identities.items():
        audit.error(
            f"{endpoint} has {count} unresolved {field} value(s): {value!r}."
        )
    for (field, value), count in unresolved_source_data.items():
        audit.warn(
            f"{endpoint} has {count} unresolved source {field} value(s): {value!r}."
        )


def _audit_seasons(audit: Audit) -> tuple[dict[int, str], dict[int, dict]]:
    summaries = audit.fetch("/api/seasons")
    if not isinstance(summaries, list):
        return {}, {}

    years = [summary.get("year") for summary in summaries]
    if any(not isinstance(year, int) for year in years):
        audit.error("/api/seasons contains a missing or invalid year.")
        years = [year for year in years if isinstance(year, int)]
    if len(years) != len(set(years)):
        audit.error("The seasons endpoint contains duplicate years.")
    if years:
        missing = sorted(set(range(min(years), max(years) + 1)) - set(years))
        if missing:
            audit.warn(f"Missing seasons inside the synced range: {missing}.")

    canonical_names: dict[int, str] = {}
    season_details: dict[int, dict] = {}
    computed_manager_totals: dict[int, dict] = defaultdict(
        lambda: {
            "seasons": 0,
            "wins": 0,
            "losses": 0,
            "ties": 0,
            "points_for": 0.0,
            "points_against": 0.0,
            "championships": 0,
            "runner_ups": 0,
            "playoffs": 0,
        }
    )

    for summary in summaries:
        year = summary["year"]
        detail = audit.fetch(f"/api/seasons/{year}")
        matchups = audit.fetch(f"/api/seasons/{year}/matchups")
        if not isinstance(detail, dict) or not isinstance(matchups, list):
            continue
        season_details[year] = detail
        standings = detail.get("standings", [])
        num_teams = detail.get("num_teams")

        if num_teams is not None and len(standings) != num_teams:
            audit.error(
                f"{year} declares {num_teams} teams but standings contain {len(standings)}."
            )

        ranks = [row.get("final_rank") for row in standings]
        non_null_ranks = [rank for rank in ranks if isinstance(rank, int)]
        duplicate_ranks = sorted(
            rank for rank, count in Counter(non_null_ranks).items() if count > 1
        )
        if duplicate_ranks:
            audit.error(f"{year} has duplicate final ranks: {duplicate_ranks}.")
        if non_null_ranks and sorted(non_null_ranks) != list(range(1, len(standings) + 1)):
            audit.warn(f"{year} has incomplete final ranks: {sorted(non_null_ranks)}.")

        champions = [row for row in standings if row.get("is_champion")]
        if len(champions) != 1:
            audit.error(f"{year} has {len(champions)} teams marked champion.")
        elif summary.get("champion_name") != champions[0].get("manager_name"):
            audit.error(
                f"{year} season summary champion {summary.get('champion_name')!r} "
                f"does not match standings champion {champions[0].get('manager_name')!r}."
            )

        standing_by_manager: dict[int, dict] = {}
        for row in standings:
            manager_id = row.get("manager_id")
            manager_name = row.get("manager_name")
            if not isinstance(manager_id, int):
                audit.error(f"{year} has a standing without a valid manager ID.")
                continue
            standing_by_manager[manager_id] = row
            existing_name = canonical_names.get(manager_id)
            if existing_name and existing_name != manager_name:
                audit.error(
                    f"Manager {manager_id} is named both {existing_name!r} and "
                    f"{manager_name!r} across seasons."
                )
            canonical_names[manager_id] = manager_name

            totals = computed_manager_totals[manager_id]
            totals["seasons"] += 1
            totals["wins"] += row.get("wins", 0)
            totals["losses"] += row.get("losses", 0)
            totals["ties"] += row.get("ties", 0)
            totals["points_for"] += row.get("points_for", 0)
            totals["points_against"] += row.get("points_against", 0)
            totals["championships"] += int(bool(row.get("is_champion")))
            totals["runner_ups"] += int(row.get("playoff_finish") == 2)
            totals["playoffs"] += int(bool(row.get("made_playoffs")))

        seen_matchup_ids: set[int] = set()
        weekly_appearances: Counter[tuple[int, int]] = Counter()
        identity_mismatches: Counter[tuple[int, str, str]] = Counter()
        regular_totals: dict[int, dict] = defaultdict(
            lambda: {"games": 0, "wins": 0, "losses": 0, "ties": 0, "pf": 0.0, "pa": 0.0}
        )
        regular_weeks = detail.get("num_regular_season_weeks")

        for matchup in matchups:
            matchup_id = matchup.get("id")
            if matchup_id in seen_matchup_ids:
                audit.error(f"{year} repeats matchup ID {matchup_id}.")
            seen_matchup_ids.add(matchup_id)

            manager_1 = matchup.get("team1_manager_id")
            manager_2 = matchup.get("team2_manager_id")
            name_1 = matchup.get("team1_manager_name")
            name_2 = matchup.get("team2_manager_name")
            score_1 = matchup.get("team1_points")
            score_2 = matchup.get("team2_points")
            winner = matchup.get("winner_manager_id")

            if manager_1 == manager_2:
                audit.error(f"{year} matchup {matchup_id} has the same manager on both sides.")
            for manager_id, name in ((manager_1, name_1), (manager_2, name_2)):
                if manager_id not in standing_by_manager:
                    audit.error(
                        f"{year} matchup {matchup_id} references manager {manager_id} "
                        "who is absent from standings."
                    )
                elif standing_by_manager[manager_id].get("manager_name") != name:
                    identity_mismatches[
                        (manager_id, name, standing_by_manager[manager_id].get("manager_name"))
                    ] += 1

            if not all(isinstance(score, (int, float)) and math.isfinite(score) and score >= 0
                       for score in (score_1, score_2)):
                audit.error(f"{year} matchup {matchup_id} has invalid scores.")
                continue

            expected_winner = manager_1 if score_1 > score_2 else manager_2 if score_2 > score_1 else None
            if winner != expected_winner:
                audit.error(
                    f"{year} matchup {matchup_id} winner {winner} does not match "
                    f"the {score_1}-{score_2} score."
                )

            if not matchup.get("is_playoff") and (
                regular_weeks is None or matchup.get("week", 0) <= regular_weeks
            ):
                week = matchup.get("week")
                weekly_appearances[(week, manager_1)] += 1
                weekly_appearances[(week, manager_2)] += 1
                row_1 = regular_totals[manager_1]
                row_2 = regular_totals[manager_2]
                row_1["games"] += 1
                row_2["games"] += 1
                row_1["pf"] += score_1
                row_1["pa"] += score_2
                row_2["pf"] += score_2
                row_2["pa"] += score_1
                if score_1 > score_2:
                    row_1["wins"] += 1
                    row_2["losses"] += 1
                elif score_2 > score_1:
                    row_2["wins"] += 1
                    row_1["losses"] += 1
                else:
                    row_1["ties"] += 1
                    row_2["ties"] += 1

        repeated_appearances = [
            key for key, count in weekly_appearances.items() if count > 1
        ]
        for (manager_id, matchup_name, standing_name), count in identity_mismatches.items():
            audit.error(
                f"{year} has {count} matchup appearance(s) naming manager {manager_id} "
                f"{matchup_name!r}; standings use {standing_name!r}."
            )
        if repeated_appearances:
            audit.error(
                f"{year} has {len(repeated_appearances)} manager/week entries in "
                "multiple regular-season matchups."
            )

        for manager_id, standing in standing_by_manager.items():
            totals = regular_totals.get(manager_id)
            if totals is None:
                audit.error(f"{year} manager {manager_id} has standings but no regular games.")
                continue
            expected = {
                "wins": standing.get("wins"),
                "losses": standing.get("losses"),
                "ties": standing.get("ties"),
            }
            actual = {key: totals[key] for key in ("wins", "losses", "ties")}
            if actual != expected:
                audit.error(
                    f"{year} {standing.get('manager_name')} matchup record {actual} "
                    f"does not match standings {expected}."
                )
            if abs(totals["pf"] - standing.get("points_for", 0)) > 0.05:
                audit.error(
                    f"{year} {standing.get('manager_name')} matchup PF {totals['pf']:.2f} "
                    f"does not match standings PF {standing.get('points_for', 0):.2f}."
                )
            if abs(totals["pa"] - standing.get("points_against", 0)) > 0.05:
                audit.error(
                    f"{year} {standing.get('manager_name')} matchup PA {totals['pa']:.2f} "
                    f"does not match standings PA {standing.get('points_against', 0):.2f}."
                )

    all_time = audit.fetch("/api/managers")
    all_time_by_id = {
        row["id"]: row for row in all_time
        if isinstance(row, dict) and isinstance(row.get("id"), int)
    } if isinstance(all_time, list) else {}

    missing_from_all_time = sorted(set(canonical_names) - set(all_time_by_id))
    if missing_from_all_time:
        audit.error(
            f"Managers present in season data are missing from /api/managers: "
            f"{[(manager_id, canonical_names[manager_id]) for manager_id in missing_from_all_time]}."
        )

    for manager_id, expected in computed_manager_totals.items():
        row = all_time_by_id.get(manager_id)
        if not row:
            continue
        fields = {
            "seasons_played": "seasons",
            "total_wins": "wins",
            "total_losses": "losses",
            "total_ties": "ties",
            "championships": "championships",
            "runner_ups": "runner_ups",
            "playoff_appearances": "playoffs",
        }
        for response_field, computed_field in fields.items():
            if row.get(response_field) != expected[computed_field]:
                audit.error(
                    f"{canonical_names[manager_id]} {response_field} is "
                    f"{row.get(response_field)}; season data totals {expected[computed_field]}."
                )
        for response_field, computed_field in (
            ("total_points_for", "points_for"),
            ("total_points_against", "points_against"),
        ):
            if abs(row.get(response_field, 0) - expected[computed_field]) > 0.05:
                audit.error(
                    f"{canonical_names[manager_id]} {response_field} is "
                    f"{row.get(response_field, 0):.2f}; season data totals "
                    f"{expected[computed_field]:.2f}."
                )

    return canonical_names, season_details


def run_audit() -> Audit:
    audit = Audit()
    canonical_names, season_details = _audit_seasons(audit)

    for manager_id, expected_name in sorted(canonical_names.items()):
        profile = audit.fetch(f"/api/managers/{manager_id}")
        audit.fetch(f"/api/managers/{manager_id}/streak")
        trophy = audit.fetch(f"/api/stats/trophy-case/{manager_id}")
        if isinstance(profile, dict):
            profile_manager = profile.get("manager", {})
            actual_name = profile_manager.get("display_name")
            if actual_name != expected_name:
                audit.error(
                    f"Manager {manager_id} profile name {actual_name!r} does not "
                    f"match season name {expected_name!r}."
                )
            expected_override = override_name_for_guid(
                profile_manager.get("yahoo_guid", "")
            )
            if expected_override and actual_name != expected_override:
                audit.error(
                    f"Manager {manager_id} profile name {actual_name!r} does not "
                    f"match canonical name {expected_override!r}."
                )
        if isinstance(trophy, dict) and trophy.get("manager_name") != expected_name:
            audit.error(
                f"Manager {manager_id} trophy-case name {trophy.get('manager_name')!r} "
                f"does not match season name {expected_name!r}."
            )

    for endpoint in GLOBAL_ENDPOINTS:
        if endpoint not in audit.responses:
            audit.fetch(endpoint)

    for year in sorted(season_details):
        for endpoint in YEAR_ENDPOINTS:
            separator = "&" if "?" in endpoint else "?"
            path = f"{endpoint}{separator}{urlencode({'year': year})}"
            audit.fetch(path)

    h2h = audit.responses.get("/api/stats/headtohead")
    if isinstance(h2h, dict):
        h2h_ids = {manager.get("id") for manager in h2h.get("managers", [])}
        record_ids = {
            manager_id
            for record in h2h.get("records", [])
            for manager_id in (record.get("manager_a_id"), record.get("manager_b_id"))
        }
        if h2h_ids != record_ids:
            audit.error(
                f"Head-to-head manager IDs {sorted(h2h_ids)} do not match "
                f"record IDs {sorted(record_ids)}."
            )
        for record in h2h.get("records", []):
            manager_a = record.get("manager_a_id")
            manager_b = record.get("manager_b_id")
            if isinstance(manager_a, int) and isinstance(manager_b, int):
                audit.fetch(
                    f"/api/stats/rivalry?{urlencode({'manager_a': manager_a, 'manager_b': manager_b})}"
                )

    weekly = audit.responses.get("/api/stats/weekly-records?top_n=50")
    if isinstance(weekly, dict):
        sort_rules = {
            "highest_score": ("points", True),
            "lowest_score": ("points", False),
            "lowest_winning_score": ("points", False),
            "highest_losing_score": ("points", True),
            "biggest_blowout": ("margin", True),
            "closest_games": ("margin", False),
        }
        for section, (field, descending) in sort_rules.items():
            values = [entry.get(field) for entry in weekly.get(section, [])]
            if values != sorted(values, reverse=descending):
                audit.error(f"Weekly records section {section} is not sorted correctly.")

    for endpoint, response in audit.responses.items():
        _scan_response(audit, endpoint, response)

    audit.note(
        f"Found {len(season_details)} seasons and {len(canonical_names)} distinct "
        "manager IDs in season data."
    )
    return audit


if __name__ == "__main__":
    report = run_audit()
    report.print_report()
    raise SystemExit(1 if report.errors else 0)
