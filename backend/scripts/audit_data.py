"""
Read-only integrity and completeness audit for the fantasy dashboard database.

Usage (from the backend directory):
    python scripts/audit_data.py
"""
from __future__ import annotations

import math
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models.draft_pick import DraftPick
from app.models.manager import Manager
from app.models.matchup import Matchup
from app.models.player_season import PlayerSeason
from app.models.season import Season
from app.models.team import Team
from app.services.manager_names import MANAGER_RENAMES
from app.services.stats.context import _get_active_managers


class Audit:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.info: list[str] = []

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)

    def note(self, message: str) -> None:
        self.info.append(message)

    def print_report(self) -> None:
        print("=== Fantasy Dashboard Data Audit ===")
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
            f"\nResult: {len(self.errors)} error(s), "
            f"{len(self.warnings)} warning(s), {len(self.info)} note(s)"
        )


def audit_database(session_factory=SessionLocal) -> Audit:
    audit = Audit()
    db = session_factory()
    try:
        managers = db.query(Manager).all()
        seasons = db.query(Season).order_by(Season.year).all()
        teams = db.query(Team).all()
        matchups = db.query(Matchup).all()
        draft_picks = db.query(DraftPick).all()
        player_seasons = db.query(PlayerSeason).all()

        manager_by_id = {manager.id: manager for manager in managers}
        season_by_id = {season.id: season for season in seasons}
        team_by_id = {team.id: team for team in teams}
        resolved_manager_ids = {manager.id for manager in _get_active_managers(db)}

        audit.note(
            f"Loaded {len(seasons)} seasons, {len(managers)} managers, "
            f"{len(teams)} teams, {len(matchups)} matchups, "
            f"{len(draft_picks)} draft picks, and {len(player_seasons)} player seasons."
        )

        years = [season.year for season in seasons]
        duplicate_years = [year for year, count in Counter(years).items() if count > 1]
        if duplicate_years:
            audit.error(f"Duplicate season years: {duplicate_years}")
        if years:
            missing_years = sorted(set(range(min(years), max(years) + 1)) - set(years))
            if missing_years:
                audit.warn(f"Missing seasons inside the synced range: {missing_years}")

        teams_by_season: dict[int, list[Team]] = defaultdict(list)
        matchups_by_season: dict[int, list[Matchup]] = defaultdict(list)
        for team in teams:
            teams_by_season[team.season_id].append(team)
            if team.season_id not in season_by_id:
                audit.error(f"Team {team.id} references missing season {team.season_id}.")
            if team.manager_id not in manager_by_id:
                audit.error(f"Team {team.id} references missing manager {team.manager_id}.")
            elif team.manager_id not in resolved_manager_ids:
                manager = manager_by_id[team.manager_id]
                audit.error(
                    f"Unresolved manager {manager.id} ({manager.yahoo_guid}) owns "
                    f"team {team.team_name!r} in season {season_by_id.get(team.season_id).year if team.season_id in season_by_id else team.season_id}."
                )

            numeric_values = {
                "wins": team.wins,
                "losses": team.losses,
                "ties": team.ties,
                "points_for": team.points_for,
                "points_against": team.points_against,
            }
            for field, value in numeric_values.items():
                if value is None or not math.isfinite(value) or value < 0:
                    audit.error(f"Team {team.id} has invalid {field}: {value!r}.")

        for season in seasons:
            season_teams = teams_by_season[season.id]
            if season.num_teams is not None and len(season_teams) != season.num_teams:
                audit.error(
                    f"{season.year} declares {season.num_teams} teams but has {len(season_teams)}."
                )

            ranks = [team.final_rank for team in season_teams if team.final_rank is not None]
            if len(ranks) != len(set(ranks)):
                duplicates = sorted(rank for rank, count in Counter(ranks).items() if count > 1)
                audit.error(f"{season.year} has duplicate final ranks: {duplicates}.")
            if ranks and sorted(ranks) != list(range(1, len(season_teams) + 1)):
                audit.warn(f"{season.year} final ranks are incomplete: {sorted(ranks)}.")

            champions = [team for team in season_teams if team.is_champion]
            if len(champions) != 1:
                audit.error(f"{season.year} has {len(champions)} teams marked champion.")
            if season.champion_team_id is None:
                audit.error(f"{season.year} has no champion_team_id.")
            elif season.champion_team_id not in {team.id for team in season_teams}:
                audit.error(
                    f"{season.year} champion_team_id {season.champion_team_id} is not a team in that season."
                )
            elif champions and season.champion_team_id != champions[0].id:
                audit.error(
                    f"{season.year} champion pointer and is_champion flag disagree."
                )

        matchup_keys: Counter[tuple[int, int, frozenset[int]]] = Counter()
        scores_by_team: dict[int, list[float]] = defaultdict(list)
        for matchup in matchups:
            matchups_by_season[matchup.season_id].append(matchup)
            if matchup.season_id not in season_by_id:
                audit.error(f"Matchup {matchup.id} references missing season {matchup.season_id}.")
                continue

            season = season_by_id[matchup.season_id]
            for team_id in (matchup.team1_id, matchup.team2_id):
                if team_id not in team_by_id:
                    audit.error(f"Matchup {matchup.id} references missing team {team_id}.")
                elif team_by_id[team_id].season_id != matchup.season_id:
                    audit.error(
                        f"Matchup {matchup.id} uses team {team_id} from a different season."
                    )

            if matchup.team1_id == matchup.team2_id:
                audit.error(f"Matchup {matchup.id} has the same team on both sides.")

            for score in (matchup.team1_points, matchup.team2_points):
                if score is None or not math.isfinite(score) or score < 0:
                    audit.error(f"Matchup {matchup.id} has invalid score {score!r}.")

            expected_winner = None
            if matchup.team1_points > matchup.team2_points:
                expected_winner = matchup.team1_id
            elif matchup.team2_points > matchup.team1_points:
                expected_winner = matchup.team2_id
            if matchup.winner_team_id != expected_winner:
                audit.error(
                    f"Matchup {matchup.id} winner {matchup.winner_team_id} does not match "
                    f"the {matchup.team1_points}-{matchup.team2_points} score."
                )

            matchup_keys[
                (matchup.season_id, matchup.week, frozenset((matchup.team1_id, matchup.team2_id)))
            ] += 1
            scores_by_team[matchup.team1_id].append(matchup.team1_points)
            scores_by_team[matchup.team2_id].append(matchup.team2_points)

        duplicate_matchups = [key for key, count in matchup_keys.items() if count > 1]
        if duplicate_matchups:
            audit.error(f"Found {len(duplicate_matchups)} duplicate matchup pair/week records.")

        for season in seasons:
            season_matchups = matchups_by_season[season.id]
            if not season_matchups:
                audit.error(f"{season.year} has no matchups.")
                continue

            regular_matchups = [matchup for matchup in season_matchups if not matchup.is_playoff]
            appearances: Counter[tuple[int, int]] = Counter()
            for matchup in regular_matchups:
                appearances[(matchup.week, matchup.team1_id)] += 1
                appearances[(matchup.week, matchup.team2_id)] += 1
            repeated = [key for key, count in appearances.items() if count > 1]
            if repeated:
                audit.error(
                    f"{season.year} has {len(repeated)} team/week entries appearing in multiple regular-season matchups."
                )

            expected_weeks = season.num_regular_season_weeks
            actual_weeks = sorted({matchup.week for matchup in regular_matchups})
            if expected_weeks and actual_weeks != list(range(1, expected_weeks + 1)):
                audit.warn(
                    f"{season.year} regular-season weeks are {actual_weeks}; expected 1-{expected_weeks}."
                )

        unknown_players = [
            pick for pick in draft_picks
            if pick.player_name.lower().startswith("unknown")
            or pick.position.lower() == "unknown"
        ]
        if unknown_players:
            audit.warn(f"{len(unknown_players)} draft picks have unresolved player data.")

        teams_without_scores = [team.id for team in teams if team.id not in scores_by_team]
        if teams_without_scores:
            audit.warn(f"{len(teams_without_scores)} teams never appear in a matchup.")

        unused_overrides = [
            guid for guid in MANAGER_RENAMES
            if not any(_guid_matches(guid, manager.yahoo_guid) for manager in managers)
        ]
        if unused_overrides:
            audit.warn(f"Manager overrides with no matching database row: {unused_overrides}.")

        unresolved_without_teams = [
            manager for manager in managers
            if manager.id not in resolved_manager_ids
            and not any(team.manager_id == manager.id for team in teams)
        ]
        if unresolved_without_teams:
            audit.note(
                f"{len(unresolved_without_teams)} unresolved manager rows have no teams and do not affect dashboard data."
            )
    finally:
        db.close()

    return audit


def _guid_matches(prefix: str, guid: str) -> bool:
    return guid.startswith(prefix) or prefix.startswith(guid)


if __name__ == "__main__":
    report = audit_database()
    report.print_report()
    raise SystemExit(1 if report.errors else 0)
