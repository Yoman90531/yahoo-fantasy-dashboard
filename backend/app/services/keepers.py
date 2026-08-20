from __future__ import annotations

import json
import math
import re
import unicodedata
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.models.adp import AdpEntry, AdpSnapshot
from app.models.draft_pick import DraftPick
from app.models.manager import Manager
from app.models.player_season import PlayerSeason
from app.models.season import Season
from app.models.team import Team
from app.services.manager_names import resolve_manager_name


RESOURCE_DIR = Path(__file__).resolve().parents[1] / "resources"
CONFIG_PATH = RESOURCE_DIR / "keeper_config.json"
HISTORY_PATH = RESOURCE_DIR / "keeper_history.json"
ALIASES_PATH = RESOURCE_DIR / "keeper_player_aliases.json"
DRAFT_PICKS_PATH = RESOURCE_DIR / "keeper_draft_picks.json"
NFL_TEAM_OVERRIDES_PATH = RESOURCE_DIR / "keeper_nfl_team_overrides.json"


def _read_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def normalize_player_name(name: str) -> str:
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    normalized = re.sub(r"[^a-z0-9]+", " ", ascii_name.lower()).strip()
    normalized = re.sub(r"\b(jr|sr|ii|iii|iv|v)\b$", "", normalized).strip()
    return re.sub(r"\s+", " ", normalized)


def yahoo_player_id(player_key: str | None, stored_id: str | None = None) -> str | None:
    if stored_id:
        return str(stored_id)
    if player_key and ".p." in player_key:
        return player_key.rsplit(".p.", 1)[-1] or None
    return None


def adp_round(rank: int, league_size: int) -> int:
    if rank < 1 or league_size < 1:
        raise ValueError("ADP rank and league size must be positive")
    return math.ceil(rank / league_size)


def value_rating(value_rounds: int | None) -> str:
    if value_rounds is None:
        return "Unrated"
    if value_rounds >= 5:
        return "Elite"
    if value_rounds >= 3:
        return "Strong"
    if value_rounds >= 1:
        return "Good"
    if value_rounds == 0:
        return "Fair"
    return "Poor"


def _history_matches(
    entry: dict[str, Any], player_id: str | None, normalized_name: str
) -> bool:
    entry_id = entry.get("player_id") or entry.get("yahoo_player_id")
    if player_id and entry_id and str(entry_id) == player_id:
        return True
    entry_name = entry.get("player_name")
    return bool(entry_name and normalize_player_name(str(entry_name)) == normalized_name)


def _latest_snapshot(db: Session, config: dict[str, Any]) -> AdpSnapshot | None:
    return (
        db.query(AdpSnapshot)
        .filter(
            AdpSnapshot.season == int(config["season"]),
            AdpSnapshot.scoring_format == str(config["scoring_format"]),
        )
        .order_by(AdpSnapshot.is_locked.desc(), AdpSnapshot.captured_at.desc(), AdpSnapshot.id.desc())
        .first()
    )


def _candidate_rule_state(
    *,
    history_known: bool,
    history_entries: list[dict[str, Any]],
    source_year: int,
    draft_round: int | None,
    current_adp_round: int | None,
    draft_rounds: int,
) -> dict[str, Any]:
    by_year = {
        int(entry["season"]): entry
        for entry in history_entries
        if entry.get("season") is not None
    }
    previous = by_year.get(source_year)
    consecutive_years = 0
    if history_known:
        year = source_year
        while year in by_year:
            consecutive_years += 1
            year -= 1

    kept_previous = previous is not None if history_known else None
    keeper_type = str(previous.get("keeper_type", "standard")).lower() if previous else ""
    is_dynasty = keeper_type == "dynasty" if history_known else None
    dynasty_year = int(previous.get("dynasty_year")) if previous and previous.get("dynasty_year") else None
    dynasty_locked_round = None
    if previous and is_dynasty:
        locked = previous.get("locked_round", previous.get("cost_round"))
        dynasty_locked_round = int(locked) if locked else None

    if previous and is_dynasty:
        base_round = dynasty_locked_round
    elif previous:
        base_round = current_adp_round
    elif draft_round is not None:
        base_round = draft_round
    else:
        base_round = draft_rounds

    if not history_known:
        status = "review"
        reason = "Keeper history has not been loaded; cost is provisional."
    elif current_adp_round is None:
        status = "review"
        reason = "No FantasyPros ADP match; first-round eligibility needs review."
    elif consecutive_years >= 3:
        status = "ineligible"
        reason = "Already kept for three consecutive seasons."
    elif is_dynasty and dynasty_year is not None and dynasty_year >= 3:
        status = "ineligible"
        reason = "Dynasty keeper has completed its three-year term."
    elif current_adp_round == 1:
        first_time_non_first_round = previous is None and draft_round != 1
        active_dynasty = bool(is_dynasty and (dynasty_year or 0) < 3)
        if first_time_non_first_round or active_dynasty:
            status = "eligible"
            reason = (
                "First-round ADP exception applies to this first-time keeper."
                if first_time_non_first_round
                else "Active dynasty exception applies to first-round ADP."
            )
        else:
            status = "ineligible"
            reason = "Current ADP is in the first round and no exception applies."
    else:
        status = "eligible"
        reason = "Eligible under the configured keeper rules."

    return {
        "kept_previous_year": kept_previous,
        "consecutive_keeper_years": consecutive_years if history_known else None,
        "is_dynasty": is_dynasty,
        "dynasty_year": dynasty_year,
        "dynasty_locked_round": dynasty_locked_round,
        "eligibility_status": status,
        "eligibility_reason": reason,
        "base_keeper_round": base_round,
    }


def build_keeper_board(db: Session) -> dict[str, Any]:
    config = _read_json(CONFIG_PATH)
    history = _read_json(HISTORY_PATH)
    aliases = _read_json(ALIASES_PATH).get("aliases", {})
    draft_pick_config = _read_json(DRAFT_PICKS_PATH).get("round_capacities", {})
    nfl_team_overrides = {
        normalize_player_name(player_name): str(team)
        for player_name, team in _read_json(NFL_TEAM_OVERRIDES_PATH).get("teams", {}).items()
    }
    source_year = int(config["source_season"])
    target_year = int(config["season"])
    league_size = int(config["league_size"])
    draft_rounds = int(config["draft_rounds"])
    complete_through = history.get("complete_through")
    history_known = complete_through is not None and int(complete_through) >= source_year
    history_rows = list(history.get("entries", []))

    season = db.query(Season).filter(Season.year == source_year).first()
    snapshot = _latest_snapshot(db, config)
    snapshot_entries = (
        db.query(AdpEntry)
        .filter(AdpEntry.snapshot_id == snapshot.id)
        .order_by(AdpEntry.rank)
        .all()
        if snapshot
        else []
    )

    adp_by_name: dict[str, AdpEntry] = {}
    for entry in snapshot_entries:
        adp_by_name.setdefault(entry.normalized_name, entry)

    normalized_aliases = {
        normalize_player_name(source): normalize_player_name(target)
        for source, target in aliases.items()
    }

    teams: list[dict[str, Any]] = []
    candidates: list[dict[str, Any]] = []
    warnings: list[str] = []

    if season:
        roster_teams = (
            db.query(Team, Manager)
            .join(Manager, Team.manager_id == Manager.id)
            .filter(Team.season_id == season.id)
            .order_by(Manager.display_name)
            .all()
        )
        canonical_roster_teams = sorted(
            roster_teams,
            key=lambda row: resolve_manager_name(row[1].yahoo_guid, row[1].display_name),
        )
        teams.extend(
            {
                "key": f"team:{team.id}",
                "name": resolve_manager_name(manager.yahoo_guid, manager.display_name),
                "team_name": team.team_name,
                "is_expansion": False,
                "round_capacities": {
                    int(round_number): int(capacity)
                    for round_number, capacity in draft_pick_config.get(
                        resolve_manager_name(manager.yahoo_guid, manager.display_name), {}
                    ).items()
                },
            }
            for team, manager in canonical_roster_teams
        )

        draft_picks = db.query(DraftPick).filter(DraftPick.season_id == season.id).all()
        draft_by_id: dict[str, DraftPick] = {}
        draft_by_name: dict[str, DraftPick] = {}
        for pick in draft_picks:
            pick_player_id = yahoo_player_id(pick.player_key)
            if pick_player_id:
                draft_by_id[pick_player_id] = pick
            draft_by_name.setdefault(normalize_player_name(pick.player_name), pick)

        roster_rows = (
            db.query(PlayerSeason, Team, Manager)
            .join(Team, PlayerSeason.team_id == Team.id)
            .join(Manager, Team.manager_id == Manager.id)
            .filter(PlayerSeason.season_id == season.id)
            .order_by(Manager.display_name, PlayerSeason.player_name)
            .all()
        )

        for player, team, manager in roster_rows:
            player_id = yahoo_player_id(player.player_key, player.player_id)
            normalized_name = normalize_player_name(player.player_name)
            lookup_name = normalized_aliases.get(normalized_name, normalized_name)
            adp = adp_by_name.get(lookup_name)
            draft = draft_by_id.get(player_id) if player_id else None
            if draft is None:
                draft = draft_by_name.get(normalized_name)
            current_adp_round = adp_round(adp.rank, league_size) if adp else None
            matched_history = [
                row for row in history_rows if _history_matches(row, player_id, normalized_name)
            ]
            rule_state = _candidate_rule_state(
                history_known=history_known,
                history_entries=matched_history,
                source_year=source_year,
                draft_round=draft.round if draft else None,
                current_adp_round=current_adp_round,
                draft_rounds=draft_rounds,
            )
            base_round = rule_state["base_keeper_round"]
            value_rounds = (
                base_round - current_adp_round
                if base_round is not None and current_adp_round is not None
                else None
            )
            candidate_id = f"yahoo:{player_id}" if player_id else f"name:{normalized_name}"
            candidates.append(
                {
                    "candidate_id": candidate_id,
                    "yahoo_player_id": player_id,
                    "player_name": player.player_name,
                    "position": player.position,
                    "nfl_team": (
                        (adp.nfl_team if adp else None)
                        or nfl_team_overrides.get(normalized_name)
                        or player.nfl_team
                    ),
                    "roster_team_key": f"team:{team.id}",
                    "roster_team_name": team.team_name,
                    "manager_name": resolve_manager_name(
                        manager.yahoo_guid, manager.display_name
                    ),
                    "draft_round": draft.round if draft else None,
                    "draft_pick": draft.pick if draft else None,
                    "acquisition_label": f"Round {draft.round}" if draft else "FA/Waiver",
                    "history_known": history_known,
                    "adp_rank": adp.rank if adp else None,
                    "adp_round": current_adp_round,
                    "average_adp": adp.average_adp if adp else None,
                    "value_rounds": value_rounds,
                    "value_rating": value_rating(value_rounds),
                    **rule_state,
                }
            )
    else:
        warnings.append(f"No Yahoo roster data is available for {source_year}.")

    for expansion in config.get("expansion_teams", []):
        teams.append(
            {
                "key": str(expansion["key"]),
                "name": str(expansion["name"]),
                "team_name": "Expansion team",
                "is_expansion": True,
                "round_capacities": {
                    int(round_number): int(capacity)
                    for round_number, capacity in draft_pick_config.get(str(expansion["name"]), {}).items()
                },
            }
        )

    if not snapshot:
        warnings.append(
            "No FantasyPros ADP snapshot has been imported; ADP values and draft projections are unavailable."
        )
    if not history_known:
        warnings.append(
            "Keeper history is pending. Eligibility, tenure, and dynasty fields require review until it is loaded."
        )
    missing_nfl_teams = sum(1 for candidate in candidates if not candidate["nfl_team"])
    if missing_nfl_teams:
        warnings.append(
            f"{missing_nfl_teams} roster players do not have a current NFL-team match."
        )

    recap = [
        "Owners may select up to three keepers.",
        "A player may be kept for at most three consecutive seasons.",
        f"First-time drafted keepers retain their {source_year} draft round.",
        f"First-time FA/waiver keepers start at round {draft_rounds}; Yahoo assignments remain authoritative.",
        f"Returning standard keepers use FantasyPros Half-PPR consensus rank in {league_size}-player rounds.",
        "One first-time keeper per team may be designated dynasty and retain its locked cost for three seasons.",
        "Duplicate round costs move to earlier rounds unless the owner has another pick in that round.",
        "Lineup-activation, IR-activation, and undrafted-trade activation rules are not evaluated here.",
    ]

    return {
        "rules": {
            "season": target_year,
            "source_season": source_year,
            "league_size": league_size,
            "draft_rounds": draft_rounds,
            "scoring_format": str(config["scoring_format"]),
            "adp_source": str(config["adp_source"]),
            "adp_url": str(config["adp_url"]),
            "recap": recap,
        },
        "teams": teams,
        "candidates": candidates,
        "adp_snapshot": (
            {
                "id": snapshot.id,
                "source": snapshot.source,
                "source_url": snapshot.source_url,
                "captured_at": snapshot.captured_at,
                "player_count": len(snapshot_entries),
                "is_locked": snapshot.is_locked,
            }
            if snapshot
            else None
        ),
        "adp_players": [
            {
                "rank": entry.rank,
                "player_name": entry.player_name,
                "position": entry.position,
                "nfl_team": entry.nfl_team,
                "average_adp": entry.average_adp,
                "adp_round": adp_round(entry.rank, league_size),
            }
            for entry in snapshot_entries
        ],
        "data_warnings": warnings,
    }
