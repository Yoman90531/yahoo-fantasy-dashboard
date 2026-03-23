"""
Stats engine — all computed analytics for the dashboard.
Every function takes a SQLAlchemy Session and returns plain Python dicts/lists
that map directly to the Pydantic response schemas in schemas/stats.py.
"""
import math
from collections import defaultdict
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from app.models.manager import Manager
from app.models.season import Season
from app.models.team import Team
from app.models.matchup import Matchup


# ---------------------------------------------------------------------------
# All-time records
# ---------------------------------------------------------------------------

def compute_all_time_records(db: Session) -> list[dict]:
    """
    Returns per-manager all-time stats: W/L/T, PF, PA, championships,
    runner-ups, playoff appearances, seasons played, current drought.
    """
    managers = db.query(Manager).filter(~Manager.yahoo_guid.like("hidden_%")).all()
    all_seasons = db.query(Season).order_by(Season.year.desc()).all()
    most_recent_year = all_seasons[0].year if all_seasons else None

    results = []
    for mgr in managers:
        teams = db.query(Team).filter(Team.manager_id == mgr.id).all()
        if not teams:
            continue

        total_wins = sum(t.wins for t in teams)
        total_losses = sum(t.losses for t in teams)
        total_ties = sum(t.ties for t in teams)
        total_pf = round(sum(t.points_for for t in teams), 2)
        total_pa = round(sum(t.points_against for t in teams), 2)
        championships = sum(1 for t in teams if t.is_champion)
        runner_ups = sum(1 for t in teams if t.playoff_finish == 2)
        playoff_apps = sum(1 for t in teams if t.made_playoffs)
        best_finish = min((t.final_rank for t in teams if t.final_rank), default=None)
        total_games = total_wins + total_losses + total_ties
        win_pct = round(total_wins / total_games, 4) if total_games else 0.0

        # Drought: seasons since last championship
        champ_years = sorted([t.season.year for t in teams if t.is_champion], reverse=True)
        if champ_years and most_recent_year:
            last_champ = champ_years[0]
            drought = most_recent_year - last_champ
        else:
            drought = len(teams)  # never won

        pf_pa_ratio = round(total_pf / total_pa, 4) if total_pa else 0.0
        results.append({
            "id": mgr.id,
            "display_name": mgr.display_name,
            "nickname": mgr.nickname,
            "seasons_played": len(teams),
            "total_wins": total_wins,
            "total_losses": total_losses,
            "total_ties": total_ties,
            "win_pct": win_pct,
            "total_points_for": total_pf,
            "total_points_against": total_pa,
            "pf_pa_ratio": pf_pa_ratio,
            "championships": championships,
            "runner_ups": runner_ups,
            "playoff_appearances": playoff_apps,
            "best_finish": best_finish,
            "current_drought": drought,
        })

    return sorted(results, key=lambda x: (-x["championships"], -x["win_pct"]))


# ---------------------------------------------------------------------------
# Head-to-head matrix
# ---------------------------------------------------------------------------

def compute_head_to_head(db: Session) -> dict:
    """
    Returns the NxN H2H matrix. For each (manager_a, manager_b) pair,
    how many times has A beaten B (regular season + playoffs combined).
    """
    managers = db.query(Manager).order_by(Manager.display_name).all()
    mgr_by_id = {m.id: m for m in managers}

    # Map team_id → manager_id
    teams = db.query(Team).all()
    team_to_mgr: dict[int, int] = {t.id: t.manager_id for t in teams}

    matchups = db.query(Matchup).filter(Matchup.is_consolation == False).all()

    # records[a_id][b_id] = {"wins": 0, "losses": 0, "ties": 0, "pf": 0.0, "pa": 0.0}
    records: dict[int, dict[int, dict]] = defaultdict(lambda: defaultdict(lambda: {
        "wins": 0, "losses": 0, "ties": 0, "pf": 0.0, "pa": 0.0
    }))

    for m in matchups:
        a = team_to_mgr.get(m.team1_id)
        b = team_to_mgr.get(m.team2_id)
        if not a or not b or a == b:
            continue

        records[a][b]["pf"] += m.team1_points
        records[a][b]["pa"] += m.team2_points
        records[b][a]["pf"] += m.team2_points
        records[b][a]["pa"] += m.team1_points

        if m.winner_team_id == m.team1_id:
            records[a][b]["wins"] += 1
            records[b][a]["losses"] += 1
        elif m.winner_team_id == m.team2_id:
            records[b][a]["wins"] += 1
            records[a][b]["losses"] += 1
        else:
            records[a][b]["ties"] += 1
            records[b][a]["ties"] += 1

    h2h_list = []
    for a_id, opponents in records.items():
        for b_id, rec in opponents.items():
            if a_id >= b_id:
                continue  # avoid duplicates
            total = rec["wins"] + rec["losses"] + rec["ties"]
            h2h_list.append({
                "manager_a_id": a_id,
                "manager_a_name": mgr_by_id[a_id].display_name if a_id in mgr_by_id else str(a_id),
                "manager_b_id": b_id,
                "manager_b_name": mgr_by_id[b_id].display_name if b_id in mgr_by_id else str(b_id),
                "wins": rec["wins"],
                "losses": rec["losses"],
                "ties": rec["ties"],
                "win_pct": round(rec["wins"] / total, 4) if total else 0.0,
                "points_for": round(rec["pf"], 2),
                "points_against": round(rec["pa"], 2),
            })

    # Only include managers who appear in at least one matchup
    active_ids = set()
    for r in h2h_list:
        active_ids.add(r["manager_a_id"])
        active_ids.add(r["manager_b_id"])

    return {
        "managers": [
            {"id": m.id, "name": m.display_name}
            for m in managers
            if m.id in active_ids
        ],
        "records": h2h_list,
    }


# ---------------------------------------------------------------------------
# Luck Index
# ---------------------------------------------------------------------------

def compute_luck_index(db: Session, year: int | None = None) -> list[dict]:
    """
    Luck Index: for each week, how many opponents would a team have beaten?
    Expected wins = virtual_wins / (num_teams - 1)
    Luck = actual wins - expected wins (aggregated over season/all-time)

    If year is None, computes all-time luck.
    """
    teams = db.query(Team).all()
    team_to_mgr: dict[int, int] = {t.id: t.manager_id for t in teams}
    team_season: dict[int, int] = {t.id: t.season_id for t in teams}

    managers = {m.id: m for m in db.query(Manager).filter(~Manager.yahoo_guid.like("hidden_%")).all()}
    seasons = {s.id: s for s in db.query(Season).all()}

    matchup_q = db.query(Matchup).filter(Matchup.is_playoff == False)
    if year:
        season = db.query(Season).filter(Season.year == year).first()
        if not season:
            return []
        matchup_q = matchup_q.filter(Matchup.season_id == season.id)

    matchups = matchup_q.all()

    # Build weekly score map: {(season_id, week): [(team_id, points)]}
    week_scores: dict[tuple, list] = defaultdict(list)
    for m in matchups:
        week_scores[(m.season_id, m.week)].append((m.team1_id, m.team1_points))
        week_scores[(m.season_id, m.week)].append((m.team2_id, m.team2_points))

    # For each team, track actual vs expected wins
    team_actual: dict[int, float] = defaultdict(float)
    team_expected: dict[int, float] = defaultdict(float)

    for m in matchups:
        key = (m.season_id, m.week)
        all_scores = week_scores[key]
        n = len(all_scores)
        if n < 2:
            continue

        for team_id, pts in [(m.team1_id, m.team1_points), (m.team2_id, m.team2_points)]:
            others = [s for tid, s in all_scores if tid != team_id]
            virtual_wins = sum(1 for s in others if pts > s)
            expected = virtual_wins / len(others) if others else 0
            team_expected[team_id] += expected

        if m.winner_team_id == m.team1_id:
            team_actual[m.team1_id] += 1
        elif m.winner_team_id == m.team2_id:
            team_actual[m.team2_id] += 1
        else:
            team_actual[m.team1_id] += 0.5
            team_actual[m.team2_id] += 0.5

    # Aggregate by manager
    mgr_actual: dict[int, float] = defaultdict(float)
    mgr_expected: dict[int, float] = defaultdict(float)

    for team_id in set(team_actual) | set(team_expected):
        mgr_id = team_to_mgr.get(team_id)
        if mgr_id is None:
            continue
        mgr_actual[mgr_id] += team_actual[team_id]
        mgr_expected[mgr_id] += team_expected[team_id]

    results = []
    for mgr_id in set(mgr_actual) | set(mgr_expected):
        actual = mgr_actual[mgr_id]
        expected = mgr_expected[mgr_id]
        results.append({
            "manager_id": mgr_id,
            "manager_name": managers[mgr_id].display_name if mgr_id in managers else str(mgr_id),
            "year": year,
            "actual_wins": round(actual, 1),
            "expected_wins": round(expected, 2),
            "luck_score": round(actual - expected, 2),
        })

    return sorted(results, key=lambda x: -x["luck_score"])


# ---------------------------------------------------------------------------
# Weekly records
# ---------------------------------------------------------------------------

def _matchup_to_entries(m: Matchup, db: Session, team_to_mgr: dict, mgr_map: dict, season_map: dict) -> tuple:
    """Returns (entry_t1, entry_t2) dicts for a matchup."""
    def make(team_id, pts, opp_id, opp_pts):
        mgr_id = team_to_mgr.get(team_id)
        opp_mgr_id = team_to_mgr.get(opp_id)
        team = db.query(Team).filter(Team.id == team_id).first()
        season = season_map.get(m.season_id)
        return {
            "manager_id": mgr_id,
            "manager_name": mgr_map[mgr_id].display_name if mgr_id in mgr_map else "Unknown",
            "team_name": team.team_name if team else None,
            "year": season.year if season else 0,
            "week": m.week,
            "points": round(pts, 2),
            "opponent_points": round(opp_pts, 2),
            "opponent_manager_name": mgr_map[opp_mgr_id].display_name if opp_mgr_id in mgr_map else "Unknown",
        }

    return (
        make(m.team1_id, m.team1_points, m.team2_id, m.team2_points),
        make(m.team2_id, m.team2_points, m.team1_id, m.team1_points),
    )


def compute_weekly_records(db: Session, top_n: int = 10) -> dict:
    teams = db.query(Team).all()
    team_to_mgr = {t.id: t.manager_id for t in teams}
    mgr_map = {m.id: m for m in db.query(Manager).filter(~Manager.yahoo_guid.like("hidden_%")).all()}
    season_map = {s.id: s for s in db.query(Season).all()}

    matchups = db.query(Matchup).all()

    all_entries = []
    for m in matchups:
        e1, e2 = _matchup_to_entries(m, db, team_to_mgr, mgr_map, season_map)
        all_entries.append((m, e1, e2))

    # Highest individual scores
    all_scores = [(e["points"], e) for _, e1, e2 in all_entries for e in [e1, e2]]
    all_scores.sort(key=lambda x: -x[0])
    highest_score = [e for _, e in all_scores[:top_n]]

    # Lowest winning score (winner had lower score than opponent — impossible; lowest score that still won)
    winning_entries = []
    for m, e1, e2 in all_entries:
        if m.winner_team_id == m.team1_id:
            winning_entries.append(e1)
        elif m.winner_team_id == m.team2_id:
            winning_entries.append(e2)
    winning_entries.sort(key=lambda x: x["points"])
    lowest_winning_score = winning_entries[:top_n]

    # Highest losing score
    losing_entries = []
    for m, e1, e2 in all_entries:
        if m.winner_team_id == m.team1_id:
            losing_entries.append(e2)
        elif m.winner_team_id == m.team2_id:
            losing_entries.append(e1)
    losing_entries.sort(key=lambda x: -x["points"])
    highest_losing_score = losing_entries[:top_n]

    # Biggest blowouts (largest margin)
    blowout_entries = []
    for m, e1, e2 in all_entries:
        margin = abs(m.team1_points - m.team2_points)
        if m.winner_team_id == m.team1_id:
            winner_entry = {**e1, "margin": round(margin, 2)}
            blowout_entries.append(winner_entry)
        elif m.winner_team_id == m.team2_id:
            winner_entry = {**e2, "margin": round(margin, 2)}
            blowout_entries.append(winner_entry)
    blowout_entries.sort(key=lambda x: -x.get("margin", 0))
    biggest_blowout = blowout_entries[:top_n]

    # Closest games
    closest = sorted(blowout_entries, key=lambda x: x.get("margin", 0))
    closest_games = closest[:top_n]

    # Lowest individual score ever
    all_scores.sort(key=lambda x: x[0])
    lowest_score = [e for _, e in all_scores[:top_n]]

    return {
        "highest_score": highest_score,
        "lowest_score": lowest_score,
        "lowest_winning_score": lowest_winning_score,
        "highest_losing_score": highest_losing_score,
        "biggest_blowout": biggest_blowout,
        "closest_games": closest_games,
    }


# ---------------------------------------------------------------------------
# Season scoring — per-manager total PF per season (for multi-line chart)
# ---------------------------------------------------------------------------

def compute_season_scoring(db: Session) -> dict:
    """
    Returns per-manager season totals formatted for a multi-line recharts chart.
    { managers: [name, ...], seasons: [{year, name: pf, ...}, ...] }
    """
    seasons = db.query(Season).order_by(Season.year).all()
    managers = db.query(Manager).filter(~Manager.yahoo_guid.like("hidden_%")).all()
    mgr_by_id = {m.id: m.display_name for m in managers}

    # Collect all names that appear in at least one team
    active_mgr_names: set[str] = set()
    season_rows = []
    for s in seasons:
        teams = db.query(Team).filter(Team.season_id == s.id).all()
        row: dict = {"year": s.year}
        for t in teams:
            name = mgr_by_id.get(t.manager_id)
            if name:
                games = t.wins + t.losses + t.ties
                row[name] = round(t.points_for / games, 2) if games else None
                active_mgr_names.add(name)
        season_rows.append(row)

    return {
        "managers": sorted(active_mgr_names),
        "seasons": season_rows,
    }


# ---------------------------------------------------------------------------
# Consistency (std dev of weekly scores)
# ---------------------------------------------------------------------------

def compute_consistency(db: Session, year: int | None = None) -> list[dict]:
    teams = db.query(Team).all()
    team_to_mgr = {t.id: t.manager_id for t in teams}
    mgr_map = {m.id: m for m in db.query(Manager).filter(~Manager.yahoo_guid.like("hidden_%")).all()}
    season_map = {s.id: s for s in db.query(Season).all()}

    matchup_q = db.query(Matchup)
    if year:
        season = db.query(Season).filter(Season.year == year).first()
        if season:
            matchup_q = matchup_q.filter(Matchup.season_id == season.id)

    matchups = matchup_q.all()

    # Per-manager score list
    mgr_scores: dict[int, list[float]] = defaultdict(list)
    for m in matchups:
        for team_id, pts in [(m.team1_id, m.team1_points), (m.team2_id, m.team2_points)]:
            mgr_id = team_to_mgr.get(team_id)
            if mgr_id:
                mgr_scores[mgr_id].append(pts)

    results = []
    for mgr_id, scores in mgr_scores.items():
        if len(scores) < 2:
            continue
        avg = sum(scores) / len(scores)
        variance = sum((s - avg) ** 2 for s in scores) / (len(scores) - 1)
        std_dev = math.sqrt(variance)
        results.append({
            "manager_id": mgr_id,
            "manager_name": mgr_map[mgr_id].display_name if mgr_id in mgr_map else str(mgr_id),
            "year": year,
            "avg_score": round(avg, 2),
            "std_dev": round(std_dev, 2),
            "min_score": round(min(scores), 2),
            "max_score": round(max(scores), 2),
        })

    return sorted(results, key=lambda x: x["avg_score"], reverse=True)


# ---------------------------------------------------------------------------
# Points inflation
# ---------------------------------------------------------------------------

def compute_points_inflation(db: Session) -> list[dict]:
    seasons = db.query(Season).order_by(Season.year).all()
    results = []
    for season in seasons:
        matchups = db.query(Matchup).filter(Matchup.season_id == season.id).all()
        if not matchups:
            continue
        all_scores = [m.team1_points for m in matchups] + [m.team2_points for m in matchups]
        avg = round(sum(all_scores) / len(all_scores), 2)
        results.append({
            "year": season.year,
            "avg_weekly_score": avg,
            "max_weekly_score": round(max(all_scores), 2),
            "min_weekly_score": round(min(all_scores), 2),
        })
    return results


# ---------------------------------------------------------------------------
# Trophy case
# ---------------------------------------------------------------------------

def compute_trophy_case(db: Session, manager_id: int) -> dict | None:
    mgr = db.query(Manager).filter(Manager.id == manager_id).first()
    if not mgr:
        return None

    teams = (
        db.query(Team)
        .join(Season, Team.season_id == Season.id)
        .filter(Team.manager_id == manager_id)
        .order_by(Season.year)
        .all()
    )

    championships = [t.season.year for t in teams if t.is_champion]
    runner_ups = [t.season.year for t in teams if t.playoff_finish == 2]
    playoff_appearances = [t.season.year for t in teams if t.made_playoffs]

    # Best regular season: best win% among non-champion seasons (or all)
    best_season = None
    best_ratio = -1
    for t in teams:
        total = t.wins + t.losses + t.ties
        ratio = t.wins / total if total else 0
        if ratio > best_ratio:
            best_ratio = ratio
            best_season = t.season.year

    return {
        "manager_id": manager_id,
        "manager_name": mgr.display_name,
        "championships": championships,
        "runner_ups": runner_ups,
        "playoff_appearances": playoff_appearances,
        "best_regular_season": best_season,
    }


# ---------------------------------------------------------------------------
# Droughts
# ---------------------------------------------------------------------------

def compute_droughts(db: Session) -> list[dict]:
    managers = db.query(Manager).filter(~Manager.yahoo_guid.like("hidden_%")).all()
    all_seasons = db.query(Season).order_by(Season.year.desc()).all()
    most_recent_year = all_seasons[0].year if all_seasons else 0

    results = []
    for mgr in managers:
        teams = (
            db.query(Team)
            .join(Season, Team.season_id == Season.id)
            .filter(Team.manager_id == mgr.id)
            .all()
        )
        if not teams:
            continue

        champ_years = sorted([t.season.year for t in teams if t.is_champion], reverse=True)
        total_championships = len(champ_years)
        last_year = champ_years[0] if champ_years else None
        drought = (most_recent_year - last_year) if last_year else len(all_seasons)

        results.append({
            "manager_id": mgr.id,
            "manager_name": mgr.display_name,
            "last_championship_year": last_year,
            "seasons_since": drought,
            "total_championships": total_championships,
        })

    return sorted(results, key=lambda x: -x["seasons_since"])


# ---------------------------------------------------------------------------
# Streak computation
# ---------------------------------------------------------------------------

def compute_streaks(db: Session, manager_id: int) -> dict:
    """Returns current and best win/loss streaks for a manager (regular season only)."""
    teams = (
        db.query(Team)
        .join(Season, Team.season_id == Season.id)
        .filter(Team.manager_id == manager_id)
        .order_by(Season.year)
        .all()
    )
    team_ids = [t.id for t in teams]
    season_id_to_year = {t.season_id: t.season.year for t in teams}

    # Gather all regular season matchups in chronological order
    matchups = (
        db.query(Matchup)
        .filter(
            Matchup.is_playoff == False,
            or_(Matchup.team1_id.in_(team_ids), Matchup.team2_id.in_(team_ids)),
        )
        .join(Season, Matchup.season_id == Season.id)
        .order_by(Season.year, Matchup.week)
        .all()
    )

    results = []  # 'W', 'L', 'T'
    for m in matchups:
        my_team = m.team1_id if m.team1_id in team_ids else m.team2_id
        if m.winner_team_id == my_team:
            results.append("W")
        elif m.winner_team_id is None:
            results.append("T")
        else:
            results.append("L")

    def best_streak(char):
        best = cur = 0
        for r in results:
            if r == char:
                cur += 1
                best = max(best, cur)
            else:
                cur = 0
        return best

    def current_streak():
        if not results:
            return "W", 0
        char = results[-1]
        count = 0
        for r in reversed(results):
            if r == char:
                count += 1
            else:
                break
        return char, count

    cur_type, cur_len = current_streak()
    return {
        "best_win_streak": best_streak("W"),
        "best_loss_streak": best_streak("L"),
        "current_streak_type": cur_type,
        "current_streak_length": cur_len,
    }


# ---------------------------------------------------------------------------
# Throne Tracker
# ---------------------------------------------------------------------------

def compute_throne_tracker(db: Session) -> dict:
    """Championship timeline with dynasty detection."""
    seasons = db.query(Season).order_by(Season.year).all()
    mgr_map = {m.id: m.display_name for m in db.query(Manager).filter(~Manager.yahoo_guid.like("hidden_%")).all()}

    timeline = []
    for s in seasons:
        champ_team = (
            db.query(Team)
            .filter(Team.season_id == s.id, Team.is_champion == True)
            .first()
        )
        champ_id = champ_team.manager_id if champ_team else None
        champ_name = mgr_map.get(champ_id) if champ_id else None
        timeline.append({
            "year": s.year,
            "champion_id": champ_id,
            "champion_name": champ_name,
        })

    # Detect dynasties: consecutive championships by same manager
    dynasties = []
    if timeline:
        cur_name = timeline[0]["champion_name"]
        cur_years = [timeline[0]["year"]]
        for entry in timeline[1:]:
            if entry["champion_name"] and entry["champion_name"] == cur_name:
                cur_years.append(entry["year"])
            else:
                if len(cur_years) >= 2 and cur_name:
                    dynasties.append({
                        "manager_name": cur_name,
                        "years": cur_years,
                        "count": len(cur_years),
                    })
                cur_name = entry["champion_name"]
                cur_years = [entry["year"]]
        if len(cur_years) >= 2 and cur_name:
            dynasties.append({
                "manager_name": cur_name,
                "years": cur_years,
                "count": len(cur_years),
            })

    # Most titles
    from collections import Counter
    title_counts = Counter(
        e["champion_name"] for e in timeline if e["champion_name"]
    )
    most_name, most_count = title_counts.most_common(1)[0] if title_counts else (None, 0)

    active = timeline[-1]["champion_name"] if timeline else None

    return {
        "timeline": timeline,
        "dynasties": sorted(dynasties, key=lambda d: -d["count"]),
        "most_titles": {"manager_name": most_name, "count": most_count},
        "active_champion": active,
    }


# ---------------------------------------------------------------------------
# Awards
# ---------------------------------------------------------------------------

def compute_awards(db: Session, year: int | None = None) -> dict:
    """Auto-generated superlatives for a season or all-time."""
    awards = []

    if year:
        season = db.query(Season).filter(Season.year == year).first()
        if not season:
            return {"year": year, "awards": []}
        season_ids = [season.id]
    else:
        season_ids = [s.id for s in db.query(Season).all()]

    teams = db.query(Team).filter(Team.season_id.in_(season_ids)).all()
    team_ids = [t.id for t in teams]
    team_to_mgr = {t.id: t.manager_id for t in teams}
    mgr_map = {m.id: m for m in db.query(Manager).filter(~Manager.yahoo_guid.like("hidden_%")).all()}

    matchups = (
        db.query(Matchup)
        .filter(Matchup.season_id.in_(season_ids), Matchup.is_consolation == False)
        .all()
    )

    # --- MVP: highest total PF ---
    mgr_pf: dict[int, float] = defaultdict(float)
    mgr_games: dict[int, int] = defaultdict(int)
    for t in teams:
        mgr_pf[t.manager_id] += t.points_for
        mgr_games[t.manager_id] += t.wins + t.losses + t.ties
    if mgr_pf:
        mvp_id = max(mgr_pf, key=lambda k: mgr_pf[k])
        awards.append({
            "award_name": "MVP",
            "icon": "🏆",
            "manager_id": mvp_id,
            "manager_name": mgr_map[mvp_id].display_name,
            "value": f"{mgr_pf[mvp_id]:,.1f} PF",
            "description": "Most total points scored",
        })

    # --- Mr. Consistent: lowest std dev ---
    consistency = compute_consistency(db, year=year)
    if consistency:
        most_consistent = min(consistency, key=lambda c: c["std_dev"])
        awards.append({
            "award_name": "Mr. Consistent",
            "icon": "📏",
            "manager_id": most_consistent["manager_id"],
            "manager_name": most_consistent["manager_name"],
            "value": f"±{most_consistent['std_dev']:.1f}",
            "description": "Lowest weekly scoring standard deviation",
        })

    # --- Boom or Bust: highest std dev ---
    if consistency:
        most_volatile = max(consistency, key=lambda c: c["std_dev"])
        awards.append({
            "award_name": "Boom or Bust",
            "icon": "💥",
            "manager_id": most_volatile["manager_id"],
            "manager_name": most_volatile["manager_name"],
            "value": f"±{most_volatile['std_dev']:.1f}",
            "description": "Highest weekly scoring standard deviation",
        })

    # --- Luckiest / Unluckiest ---
    luck = compute_luck_index(db, year=year)
    if luck:
        luckiest = luck[0]  # already sorted desc
        unluckiest = luck[-1]
        awards.append({
            "award_name": "Luckiest",
            "icon": "🍀",
            "manager_id": luckiest["manager_id"],
            "manager_name": luckiest["manager_name"],
            "value": f"+{luckiest['luck_score']:.1f}",
            "description": "Most wins above expected based on schedule",
        })
        awards.append({
            "award_name": "Unluckiest",
            "icon": "😤",
            "manager_id": unluckiest["manager_id"],
            "manager_name": unluckiest["manager_name"],
            "value": f"{unluckiest['luck_score']:.1f}",
            "description": "Most wins below expected based on schedule",
        })

    # --- Highest Single Week ---
    all_scores = []
    for m in matchups:
        for tid, pts in [(m.team1_id, m.team1_points), (m.team2_id, m.team2_points)]:
            mid = team_to_mgr.get(tid)
            if mid:
                all_scores.append((pts, mid, m.week, m.season_id))
    if all_scores:
        best = max(all_scores, key=lambda x: x[0])
        season_map = {s.id: s.year for s in db.query(Season).all()}
        awards.append({
            "award_name": "Highest Single Week",
            "icon": "🚀",
            "manager_id": best[1],
            "manager_name": mgr_map[best[1]].display_name,
            "value": f"{best[0]:.1f} pts (Wk {best[2]}, {season_map.get(best[3], '')})",
            "description": "Highest individual weekly score",
        })

    # --- Weekly High Scorer: most weeks with #1 score ---
    week_scores: dict[tuple, list] = defaultdict(list)
    for m in matchups:
        for tid, pts in [(m.team1_id, m.team1_points), (m.team2_id, m.team2_points)]:
            mid = team_to_mgr.get(tid)
            if mid:
                week_scores[(m.season_id, m.week)].append((pts, mid))
    weekly_wins: dict[int, int] = defaultdict(int)
    for key, scores in week_scores.items():
        if scores:
            top_score = max(scores, key=lambda x: x[0])
            weekly_wins[top_score[1]] += 1
    if weekly_wins:
        hw_id = max(weekly_wins, key=lambda k: weekly_wins[k])
        awards.append({
            "award_name": "Weekly High Scorer",
            "icon": "⭐",
            "manager_id": hw_id,
            "manager_name": mgr_map[hw_id].display_name,
            "value": f"{weekly_wins[hw_id]} weeks",
            "description": "Most weeks with the highest score in the league",
        })

    # --- Close Game King: best record in games decided by <5 pts ---
    close_wins: dict[int, int] = defaultdict(int)
    close_losses: dict[int, int] = defaultdict(int)
    for m in matchups:
        margin = abs(m.team1_points - m.team2_points)
        if margin < 5 and m.winner_team_id:
            w_mgr = team_to_mgr.get(m.winner_team_id)
            l_tid = m.team2_id if m.winner_team_id == m.team1_id else m.team1_id
            l_mgr = team_to_mgr.get(l_tid)
            if w_mgr:
                close_wins[w_mgr] += 1
            if l_mgr:
                close_losses[l_mgr] += 1
    close_all = set(close_wins) | set(close_losses)
    if close_all:
        def close_pct(mid):
            w = close_wins.get(mid, 0)
            total = w + close_losses.get(mid, 0)
            return w / total if total >= 3 else -1  # min 3 close games
        ck_id = max(close_all, key=close_pct)
        if close_pct(ck_id) >= 0:
            cw = close_wins.get(ck_id, 0)
            cl = close_losses.get(ck_id, 0)
            awards.append({
                "award_name": "Close Game King",
                "icon": "🎯",
                "manager_id": ck_id,
                "manager_name": mgr_map[ck_id].display_name,
                "value": f"{cw}-{cl} ({cw/(cw+cl)*100:.0f}%)",
                "description": "Best record in games decided by fewer than 5 points",
            })

    # --- Blowout Artist: most wins by 20+ pts ---
    blowout_wins: dict[int, int] = defaultdict(int)
    for m in matchups:
        margin = abs(m.team1_points - m.team2_points)
        if margin >= 20 and m.winner_team_id:
            w_mgr = team_to_mgr.get(m.winner_team_id)
            if w_mgr:
                blowout_wins[w_mgr] += 1
    if blowout_wins:
        ba_id = max(blowout_wins, key=lambda k: blowout_wins[k])
        awards.append({
            "award_name": "Blowout Artist",
            "icon": "💪",
            "manager_id": ba_id,
            "manager_name": mgr_map[ba_id].display_name,
            "value": f"{blowout_wins[ba_id]} blowouts",
            "description": "Most wins by 20+ points",
        })

    # --- Most Improved (season mode only) ---
    if year:
        prev_season = db.query(Season).filter(Season.year == year - 1).first()
        if prev_season:
            prev_teams = db.query(Team).filter(Team.season_id == prev_season.id).all()
            prev_pct = {}
            for t in prev_teams:
                total = t.wins + t.losses + t.ties
                if total:
                    prev_pct[t.manager_id] = t.wins / total

            cur_teams = db.query(Team).filter(Team.season_id == season_ids[0]).all()
            best_delta = -999
            best_mid = None
            for t in cur_teams:
                total = t.wins + t.losses + t.ties
                if total and t.manager_id in prev_pct:
                    cur_pct_val = t.wins / total
                    delta = cur_pct_val - prev_pct[t.manager_id]
                    if delta > best_delta:
                        best_delta = delta
                        best_mid = t.manager_id

            if best_mid and best_delta > 0:
                awards.append({
                    "award_name": "Most Improved",
                    "icon": "📈",
                    "manager_id": best_mid,
                    "manager_name": mgr_map[best_mid].display_name,
                    "value": f"+{best_delta*100:.0f}% win rate",
                    "description": f"Biggest win% improvement from {year-1}",
                })

    return {"year": year, "awards": awards}


# ---------------------------------------------------------------------------
# Power Rankings
# ---------------------------------------------------------------------------

def compute_power_rankings(db: Session, year: int | None = None) -> list[dict]:
    """
    Composite dominance score with 5 dimensions, each normalized 0-100.
    """
    # Gather raw data
    if year:
        season = db.query(Season).filter(Season.year == year).first()
        if not season:
            return []
        teams = db.query(Team).filter(Team.season_id == season.id).all()
        mgr_ids = [t.manager_id for t in teams]
    else:
        teams = db.query(Team).all()
        mgr_ids = list({t.manager_id for t in teams})

    if not mgr_ids:
        return []

    mgr_map = {m.id: m for m in db.query(Manager).filter(~Manager.yahoo_guid.like("hidden_%")).all()}

    # 1. Win Rate
    mgr_wins: dict[int, int] = defaultdict(int)
    mgr_games: dict[int, int] = defaultdict(int)
    for t in teams:
        if t.manager_id in mgr_ids:
            mgr_wins[t.manager_id] += t.wins
            mgr_games[t.manager_id] += t.wins + t.losses + t.ties

    win_rates = {
        mid: mgr_wins[mid] / mgr_games[mid] if mgr_games[mid] else 0
        for mid in mgr_ids
    }

    # 2. Scoring Power (avg PF per game)
    mgr_pf: dict[int, float] = defaultdict(float)
    for t in teams:
        if t.manager_id in mgr_ids:
            mgr_pf[t.manager_id] += t.points_for
    scoring = {
        mid: mgr_pf[mid] / mgr_games[mid] if mgr_games.get(mid) else 0
        for mid in mgr_ids
    }

    # 3. Consistency (inverse std dev)
    consistency_data = compute_consistency(db, year=year)
    std_devs = {c["manager_id"]: c["std_dev"] for c in consistency_data}

    # 4. Luck-adjusted (expected wins per game)
    luck_data = compute_luck_index(db, year=year)
    expected = {l["manager_id"]: l["expected_wins"] for l in luck_data}
    exp_per_game = {
        mid: expected.get(mid, 0) / mgr_games[mid] if mgr_games.get(mid) else 0
        for mid in mgr_ids
    }

    # 5. Playoff success
    playoff_scores: dict[int, float] = defaultdict(float)
    playoff_seasons: dict[int, int] = defaultdict(int)
    for t in teams:
        if t.manager_id in mgr_ids:
            playoff_seasons[t.manager_id] += 1
            if t.is_champion:
                playoff_scores[t.manager_id] += 100
            elif t.playoff_finish == 2:
                playoff_scores[t.manager_id] += 70
            elif t.made_playoffs:
                playoff_scores[t.manager_id] += 40

    playoff_avg = {
        mid: playoff_scores[mid] / playoff_seasons[mid] if playoff_seasons.get(mid) else 0
        for mid in mgr_ids
    }

    # Normalize each dimension to 0-100 using percentile rank
    def normalize(values: dict[int, float], invert: bool = False) -> dict[int, float]:
        if not values:
            return {}
        sorted_ids = sorted(values, key=lambda k: values[k], reverse=not invert)
        n = len(sorted_ids)
        return {mid: round((n - 1 - rank) / max(n - 1, 1) * 100, 1) for rank, mid in enumerate(sorted_ids)}

    norm_wr = normalize(win_rates)
    norm_sc = normalize(scoring)
    norm_co = normalize(std_devs, invert=True)  # lower std dev = better
    norm_la = normalize(exp_per_game)
    norm_pl = normalize(playoff_avg)

    results = []
    for mid in mgr_ids:
        if mid not in mgr_map:
            continue
        dims = {
            "win_rate": norm_wr.get(mid, 0),
            "scoring": norm_sc.get(mid, 0),
            "consistency": norm_co.get(mid, 0),
            "luck_adjusted": norm_la.get(mid, 0),
            "playoff_success": norm_pl.get(mid, 0),
        }
        overall = round(sum(dims.values()) / 5, 1)
        results.append({
            "manager_id": mid,
            "manager_name": mgr_map[mid].display_name,
            "overall_score": overall,
            "dimensions": dims,
        })

    return sorted(results, key=lambda x: -x["overall_score"])


# ---------------------------------------------------------------------------
# Rivalry
# ---------------------------------------------------------------------------

def compute_rivalry(db: Session, manager_a_id: int, manager_b_id: int) -> dict | None:
    """Full rivalry history between two managers."""
    mgr_a = db.query(Manager).filter(Manager.id == manager_a_id).first()
    mgr_b = db.query(Manager).filter(Manager.id == manager_b_id).first()
    if not mgr_a or not mgr_b:
        return None

    teams = db.query(Team).all()
    team_to_mgr = {t.id: t.manager_id for t in teams}
    season_map = {s.id: s for s in db.query(Season).all()}

    # Find all matchups between these two managers
    all_matchups = (
        db.query(Matchup)
        .filter(Matchup.is_consolation == False)
        .all()
    )

    rivalry_matchups = []
    for m in all_matchups:
        a_mgr = team_to_mgr.get(m.team1_id)
        b_mgr = team_to_mgr.get(m.team2_id)
        if not a_mgr or not b_mgr:
            continue

        if {a_mgr, b_mgr} == {manager_a_id, manager_b_id}:
            # Normalize so a_points always belongs to manager_a
            if a_mgr == manager_a_id:
                a_pts, b_pts = m.team1_points, m.team2_points
                winner_tid = m.winner_team_id
                a_tid, b_tid = m.team1_id, m.team2_id
            else:
                a_pts, b_pts = m.team2_points, m.team1_points
                winner_tid = m.winner_team_id
                a_tid, b_tid = m.team2_id, m.team1_id

            if winner_tid == a_tid:
                winner = "a"
            elif winner_tid == b_tid:
                winner = "b"
            else:
                winner = "tie"

            s = season_map.get(m.season_id)
            rivalry_matchups.append({
                "year": s.year if s else 0,
                "week": m.week,
                "a_points": round(a_pts, 2),
                "b_points": round(b_pts, 2),
                "winner": winner,
                "margin": round(abs(a_pts - b_pts), 2),
                "is_playoff": m.is_playoff,
            })

    rivalry_matchups.sort(key=lambda x: (x["year"], x["week"]))

    # Summary
    a_wins = sum(1 for m in rivalry_matchups if m["winner"] == "a")
    b_wins = sum(1 for m in rivalry_matchups if m["winner"] == "b")
    ties = sum(1 for m in rivalry_matchups if m["winner"] == "tie")
    a_pf = round(sum(m["a_points"] for m in rivalry_matchups), 2)
    b_pf = round(sum(m["b_points"] for m in rivalry_matchups), 2)
    total = a_wins + b_wins + ties

    # Trends: per-season
    season_data: dict[int, dict] = defaultdict(lambda: {"a_wins": 0, "b_wins": 0, "a_pf": 0.0, "b_pf": 0.0})
    for m in rivalry_matchups:
        sd = season_data[m["year"]]
        if m["winner"] == "a":
            sd["a_wins"] += 1
        elif m["winner"] == "b":
            sd["b_wins"] += 1
        sd["a_pf"] += m["a_points"]
        sd["b_pf"] += m["b_points"]

    trends = [
        {"year": yr, "a_wins": d["a_wins"], "b_wins": d["b_wins"],
         "a_pf": round(d["a_pf"], 2), "b_pf": round(d["b_pf"], 2)}
        for yr, d in sorted(season_data.items())
    ]

    # Streaks
    def calc_streaks(matchups_list):
        cur_holder = None
        cur_len = 0
        best_holder = None
        best_len = 0
        for m in matchups_list:
            w = m["winner"]
            if w == "tie":
                continue
            if w == cur_holder:
                cur_len += 1
            else:
                cur_holder = w
                cur_len = 1
            if cur_len > best_len:
                best_len = cur_len
                best_holder = cur_holder
        return (
            {"holder": cur_holder or "a", "length": cur_len},
            {"holder": best_holder or "a", "length": best_len},
        )

    current_streak, longest_streak = calc_streaks(rivalry_matchups)

    # Fun facts
    biggest = max(rivalry_matchups, key=lambda m: m["margin"]) if rivalry_matchups else None
    closest = min(
        (m for m in rivalry_matchups if m["winner"] != "tie"),
        key=lambda m: m["margin"],
        default=None,
    )

    return {
        "manager_a_id": manager_a_id,
        "manager_a_name": mgr_a.display_name,
        "manager_b_id": manager_b_id,
        "manager_b_name": mgr_b.display_name,
        "summary": {
            "a_wins": a_wins,
            "b_wins": b_wins,
            "ties": ties,
            "a_pf": a_pf,
            "b_pf": b_pf,
            "win_pct": round(a_wins / total, 4) if total else 0.0,
        },
        "matchups": rivalry_matchups,
        "trends": trends,
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "biggest_blowout": biggest,
        "closest_game": closest,
    }


# ---------------------------------------------------------------------------
# Score Distribution (box plot stats per manager)
# ---------------------------------------------------------------------------

def compute_score_distribution(db: Session) -> list[dict]:
    """
    Per-manager weekly score distribution: min, Q1, median, Q3, max, mean,
    std_dev, and outliers (beyond 1.5*IQR). Includes all matchup weeks.
    """
    teams = db.query(Team).all()
    team_to_mgr = {t.id: t.manager_id for t in teams}
    mgr_map = {m.id: m for m in db.query(Manager).filter(~Manager.yahoo_guid.like("hidden_%")).all()}

    mgr_scores: dict[int, list[float]] = defaultdict(list)
    for m in db.query(Matchup).all():
        for team_id, pts in [(m.team1_id, m.team1_points), (m.team2_id, m.team2_points)]:
            mid = team_to_mgr.get(team_id)
            if mid:
                mgr_scores[mid].append(pts)

    results = []
    for mid, scores in mgr_scores.items():
        if len(scores) < 4:
            continue
        s = sorted(scores)
        n = len(s)

        def percentile(p):
            idx = (n - 1) * p
            lo, hi = int(idx), min(int(idx) + 1, n - 1)
            return s[lo] + (s[hi] - s[lo]) * (idx - lo)

        q1, med, q3 = percentile(0.25), percentile(0.5), percentile(0.75)
        iqr = q3 - q1
        lo_fence = q1 - 1.5 * iqr
        hi_fence = q3 + 1.5 * iqr
        whisker_lo = min(v for v in s if v >= lo_fence)
        whisker_hi = max(v for v in s if v <= hi_fence)
        outliers = [v for v in s if v < lo_fence or v > hi_fence]
        mean = sum(scores) / n
        variance = sum((v - mean) ** 2 for v in scores) / (n - 1)

        results.append({
            "manager_id": mid,
            "manager_name": mgr_map[mid].display_name if mid in mgr_map else str(mid),
            "n": n,
            "min": round(whisker_lo, 2),
            "q1": round(q1, 2),
            "median": round(med, 2),
            "q3": round(q3, 2),
            "max": round(whisker_hi, 2),
            "mean": round(mean, 2),
            "std_dev": round(math.sqrt(variance), 2),
            "outliers": [round(v, 2) for v in outliers],
        })

    return sorted(results, key=lambda x: -x["median"])


# ---------------------------------------------------------------------------
# Weekly Finish Distribution
# ---------------------------------------------------------------------------

def compute_weekly_finish_distribution(db: Session) -> list[dict]:
    """
    For every regular-season week, rank all teams by score within that week.
    Bucket each manager's finishes into: 1st, top-3, top-half, bottom-half,
    bottom-3, last. Returns counts and percentages per manager.
    """
    teams = db.query(Team).all()
    team_to_mgr = {t.id: t.manager_id for t in teams}
    mgr_map = {m.id: m for m in db.query(Manager).filter(~Manager.yahoo_guid.like("hidden_%")).all()}

    matchups = db.query(Matchup).filter(Matchup.is_playoff == False).all()

    # Build weekly score maps: (season_id, week) -> [(team_id, pts)]
    week_scores: dict[tuple, list] = defaultdict(list)
    for m in matchups:
        week_scores[(m.season_id, m.week)].append((m.team1_id, m.team1_points))
        week_scores[(m.season_id, m.week)].append((m.team2_id, m.team2_points))

    # Tally finish buckets per manager
    buckets = ("first", "top_three", "top_half", "bottom_half", "bottom_three", "last")
    mgr_counts: dict[int, dict[str, int]] = defaultdict(lambda: {b: 0 for b in buckets})

    for scores in week_scores.values():
        n = len(scores)
        if n < 2:
            continue
        ranked = sorted(scores, key=lambda x: -x[1])  # highest score = rank 1
        for rank_idx, (team_id, _) in enumerate(ranked):
            mid = team_to_mgr.get(team_id)
            if not mid:
                continue
            rank = rank_idx + 1  # 1-based
            if rank == 1:
                mgr_counts[mid]["first"] += 1
            elif rank <= 3:
                mgr_counts[mid]["top_three"] += 1
            elif rank <= n // 2:
                mgr_counts[mid]["top_half"] += 1
            elif rank >= n and n > 3:
                mgr_counts[mid]["last"] += 1
            elif rank >= n - 2 and n > 3:
                mgr_counts[mid]["bottom_three"] += 1
            else:
                mgr_counts[mid]["bottom_half"] += 1

    results = []
    for mid, counts in mgr_counts.items():
        total = sum(counts.values())
        if total == 0:
            continue
        results.append({
            "manager_id": mid,
            "manager_name": mgr_map[mid].display_name if mid in mgr_map else str(mid),
            "total_weeks": total,
            **counts,
            "pct_first": round(counts["first"] / total * 100, 1),
            "pct_top_three": round((counts["first"] + counts["top_three"]) / total * 100, 1),
            "pct_top_half": round((counts["first"] + counts["top_three"] + counts["top_half"]) / total * 100, 1),
            "pct_last": round(counts["last"] / total * 100, 1),
            "pct_bottom_three": round((counts["last"] + counts["bottom_three"]) / total * 100, 1),
        })

    return sorted(results, key=lambda x: -x["pct_top_half"])


# ---------------------------------------------------------------------------
# Manager Eras
# ---------------------------------------------------------------------------

ERAS = [
    {"name": "Early Years", "start": 2012, "end": 2016},
    {"name": "Middle Years", "start": 2017, "end": 2020},
    {"name": "Recent Years", "start": 2021, "end": 9999},
]


def compute_manager_eras(db: Session) -> list[dict]:
    """
    Divides seasons into three eras and returns per-manager stats for each.
    """
    seasons_by_year = {s.year: s for s in db.query(Season).all()}
    teams = db.query(Team).all()
    mgr_map = {m.id: m for m in db.query(Manager).filter(~Manager.yahoo_guid.like("hidden_%")).all()}

    results = []
    for era in ERAS:
        era_seasons = [s for y, s in seasons_by_year.items() if era["start"] <= y <= era["end"]]
        if not era_seasons:
            continue
        season_ids = {s.id for s in era_seasons}
        era_teams = [t for t in teams if t.season_id in season_ids]

        # Aggregate per manager
        mgr_stats: dict[int, dict] = {}
        for t in era_teams:
            mid = t.manager_id
            if mid not in mgr_stats:
                mgr_stats[mid] = {"wins": 0, "losses": 0, "ties": 0, "champs": 0, "playoffs": 0, "seasons": 0, "pf": 0.0}
            s = mgr_stats[mid]
            s["wins"] += t.wins
            s["losses"] += t.losses
            s["ties"] += t.ties
            s["champs"] += int(t.is_champion)
            s["playoffs"] += int(t.made_playoffs)
            s["seasons"] += 1
            s["pf"] += t.points_for

        era_rows = []
        for mid, s in mgr_stats.items():
            games = s["wins"] + s["losses"] + s["ties"]
            era_rows.append({
                "manager_id": mid,
                "manager_name": mgr_map[mid].display_name if mid in mgr_map else str(mid),
                "seasons": s["seasons"],
                "wins": s["wins"],
                "losses": s["losses"],
                "win_pct": round(s["wins"] / games, 4) if games else 0.0,
                "avg_pf": round(s["pf"] / games, 2) if games else 0.0,
                "championships": s["champs"],
                "playoff_appearances": s["playoffs"],
            })

        era_rows.sort(key=lambda x: (-x["championships"], -x["win_pct"]))
        results.append({
            "era_name": era["name"],
            "years": f"{era['start']}–{min(era['end'], max(y for y in seasons_by_year))}",
            "num_seasons": len(era_seasons),
            "managers": era_rows,
        })

    return results

# ---------------------------------------------------------------------------
# Projection performance
# ---------------------------------------------------------------------------

def compute_projection_performance(db: Session, year: int | None = None) -> list[dict]:
    """
    Per-manager analysis of actual scores vs pre-game projected scores.
    Only includes weeks where projected data is available (non-null, non-zero).
    Regular season only.
    """
    managers = db.query(Manager).filter(~Manager.yahoo_guid.like("hidden_%")).all()
    mgr_map = {m.id: m for m in managers}

    # Build team_id -> manager_id map
    team_mgr: dict[int, int] = {}
    for mgr in managers:
        teams_q = db.query(Team).filter(Team.manager_id == mgr.id)
        if year:
            season = db.query(Season).filter(Season.year == year).first()
            if season:
                teams_q = teams_q.filter(Team.season_id == season.id)
        for t in teams_q.all():
            team_mgr[t.id] = mgr.id

    # Fetch regular-season matchups with projection data
    q = (
        db.query(Matchup)
        .filter(
            Matchup.is_consolation == False,
            Matchup.is_playoff == False,
            Matchup.team1_projected.isnot(None),
            Matchup.team2_projected.isnot(None),
            Matchup.team1_projected > 0,
            Matchup.team2_projected > 0,
        )
    )
    if year:
        season = db.query(Season).filter(Season.year == year).first()
        if season:
            q = q.filter(Matchup.season_id == season.id)

    matchups = q.all()

    # Accumulate per-manager stats
    stats: dict[int, dict] = {}

    def _ensure(mgr_id: int):
        if mgr_id not in stats:
            stats[mgr_id] = {
                "weeks": 0,
                "total_actual": 0.0,
                "total_projected": 0.0,
                "total_diff": 0.0,
                "beats_projection": 0,
                "diffs": [],
            }

    for m in matchups:
        for team_id, actual, projected in [
            (m.team1_id, m.team1_points, m.team1_projected),
            (m.team2_id, m.team2_points, m.team2_projected),
        ]:
            mgr_id = team_mgr.get(team_id)
            if mgr_id is None:
                continue
            diff = actual - projected
            _ensure(mgr_id)
            s = stats[mgr_id]
            s["weeks"] += 1
            s["total_actual"] += actual
            s["total_projected"] += projected
            s["total_diff"] += diff
            s["diffs"].append(diff)
            if diff > 0:
                s["beats_projection"] += 1

    results = []
    for mgr_id, s in stats.items():
        mgr = mgr_map.get(mgr_id)
        if not mgr or s["weeks"] == 0:
            continue
        n = s["weeks"]
        diffs = s["diffs"]
        avg_diff = s["total_diff"] / n
        variance = sum((d - avg_diff) ** 2 for d in diffs) / n
        std_dev = math.sqrt(variance)
        results.append({
            "manager_id": mgr_id,
            "manager_name": mgr.display_name,
            "weeks": n,
            "avg_actual": round(s["total_actual"] / n, 2),
            "avg_projected": round(s["total_projected"] / n, 2),
            "avg_diff": round(avg_diff, 2),
            "beat_projection_pct": round(s["beats_projection"] / n * 100, 1),
            "std_dev_diff": round(std_dev, 2),
            "total_over": round(s["total_diff"], 2),
        })

    results.sort(key=lambda x: -x["avg_diff"])
    return results


# ---------------------------------------------------------------------------
# Playoff vs Regular Season Performance
# ---------------------------------------------------------------------------

def compute_playoff_performance(db: Session, year: int | None = None) -> list[dict]:
    """
    Compares each manager's regular-season record/scoring against their
    playoff record/scoring.  Returns a list sorted by delta_win_pct desc.
    """
    managers = {m.id: m for m in db.query(Manager).filter(~Manager.yahoo_guid.like("hidden_%")).all()}

    # Build matchup query
    q = (
        db.query(Matchup)
        .join(Team, Matchup.team1_id == Team.id)
        .join(Season, Matchup.season_id == Season.id)
    )
    if year:
        q = q.filter(Season.year == year)

    # Exclude consolation matchups
    matchups = q.filter(Matchup.is_consolation == False).all()

    # Accumulators per manager: {mgr_id: {reg: {...}, playoff: {...}}}
    stats: dict[int, dict] = {}

    def ensure(mgr_id: int):
        if mgr_id not in stats:
            stats[mgr_id] = {
                "reg": {"wins": 0, "losses": 0, "points": 0.0, "games": 0},
                "playoff": {"wins": 0, "losses": 0, "points": 0.0, "games": 0},
            }

    for m in matchups:
        t1 = db.get(Team, m.team1_id)
        t2 = db.get(Team, m.team2_id)
        if not t1 or not t2:
            continue
        mgr1 = t1.manager_id
        mgr2 = t2.manager_id
        ensure(mgr1)
        ensure(mgr2)

        bucket = "playoff" if m.is_playoff else "reg"

        stats[mgr1][bucket]["points"] += m.team1_points
        stats[mgr1][bucket]["games"] += 1
        stats[mgr2][bucket]["points"] += m.team2_points
        stats[mgr2][bucket]["games"] += 1

        if m.winner_team_id == m.team1_id:
            stats[mgr1][bucket]["wins"] += 1
            stats[mgr2][bucket]["losses"] += 1
        elif m.winner_team_id == m.team2_id:
            stats[mgr2][bucket]["wins"] += 1
            stats[mgr1][bucket]["losses"] += 1

    results = []
    for mgr_id, buckets in stats.items():
        mgr = managers.get(mgr_id)
        if not mgr:
            continue

        reg = buckets["reg"]
        po = buckets["playoff"]

        # Skip managers with zero playoff games
        if po["games"] == 0:
            continue

        reg_total = reg["wins"] + reg["losses"]
        po_total = po["wins"] + po["losses"]

        reg_win_pct = round(reg["wins"] / reg_total * 100, 1) if reg_total else 0.0
        po_win_pct = round(po["wins"] / po_total * 100, 1) if po_total else 0.0
        reg_avg_pts = round(reg["points"] / reg["games"], 2) if reg["games"] else 0.0
        po_avg_pts = round(po["points"] / po["games"], 2) if po["games"] else 0.0

        results.append({
            "manager_id": mgr_id,
            "manager_name": mgr.display_name,
            "reg_wins": reg["wins"],
            "reg_losses": reg["losses"],
            "reg_win_pct": reg_win_pct,
            "reg_avg_pts": reg_avg_pts,
            "reg_games": reg["games"],
            "playoff_wins": po["wins"],
            "playoff_losses": po["losses"],
            "playoff_win_pct": po_win_pct,
            "playoff_avg_pts": po_avg_pts,
            "playoff_games": po["games"],
            "delta_win_pct": round(po_win_pct - reg_win_pct, 1),
            "delta_avg_pts": round(po_avg_pts - reg_avg_pts, 2),
        })

    results.sort(key=lambda x: -x["delta_win_pct"])
    return results


# ---------------------------------------------------------------------------
# Win Margin Analytics
# ---------------------------------------------------------------------------

def compute_win_margins(db: Session, year: int | None = None) -> list[dict]:
    """
    Per-manager win/loss margin analytics: average margins, blowout/close
    game counts, and biggest win/loss.
    """
    teams = db.query(Team).all()
    team_to_mgr: dict[int, int] = {t.id: t.manager_id for t in teams}
    managers = {m.id: m for m in db.query(Manager).filter(~Manager.yahoo_guid.like("hidden_%")).all()}

    matchup_q = db.query(Matchup).filter(Matchup.is_playoff == False)
    if year:
        season = db.query(Season).filter(Season.year == year).first()
        if not season:
            return []
        matchup_q = matchup_q.filter(Matchup.season_id == season.id)

    matchups = matchup_q.all()

    # Collect win/loss margins per manager
    win_margins: dict[int, list[float]] = defaultdict(list)
    loss_margins: dict[int, list[float]] = defaultdict(list)

    for m in matchups:
        margin = abs(m.team1_points - m.team2_points)
        if m.winner_team_id is None:
            continue  # tie — skip

        if m.winner_team_id == m.team1_id:
            winner_mgr = team_to_mgr.get(m.team1_id)
            loser_mgr = team_to_mgr.get(m.team2_id)
        else:
            winner_mgr = team_to_mgr.get(m.team2_id)
            loser_mgr = team_to_mgr.get(m.team1_id)

        if winner_mgr is not None:
            win_margins[winner_mgr].append(margin)
        if loser_mgr is not None:
            loss_margins[loser_mgr].append(margin)

    all_mgr_ids = set(win_margins) | set(loss_margins)
    results = []
    for mgr_id in all_mgr_ids:
        mgr = managers.get(mgr_id)
        if not mgr:
            continue
        wins = win_margins.get(mgr_id, [])
        losses = loss_margins.get(mgr_id, [])

        avg_win = round(sum(wins) / len(wins), 2) if wins else 0.0
        avg_loss = round(sum(losses) / len(losses), 2) if losses else 0.0
        blowout_wins = sum(1 for m in wins if m > 30)
        close_wins = sum(1 for m in wins if m < 5)
        blowout_losses = sum(1 for m in losses if m > 30)
        close_losses = sum(1 for m in losses if m < 5)
        biggest_win = round(max(wins), 2) if wins else 0.0
        biggest_loss = round(max(losses), 2) if losses else 0.0

        results.append({
            "manager_id": mgr_id,
            "manager_name": mgr.display_name,
            "avg_win_margin": avg_win,
            "avg_loss_margin": avg_loss,
            "blowout_wins": blowout_wins,
            "close_wins": close_wins,
            "blowout_losses": blowout_losses,
            "close_losses": close_losses,
            "biggest_win": biggest_win,
            "biggest_loss": biggest_loss,
        })

    results.sort(key=lambda x: -x["avg_win_margin"])
    return results


# ---------------------------------------------------------------------------
# Streak Tracker (league-wide)
# ---------------------------------------------------------------------------

def compute_streaks_all(db: Session) -> list[dict]:
    """Returns current and best win/loss streaks for every manager."""
    managers = db.query(Manager).filter(~Manager.yahoo_guid.like("hidden_%")).all()
    mgr_map = {m.id: m.display_name for m in managers}

    # Pre-fetch all regular-season matchups in chronological order
    all_matchups = (
        db.query(Matchup)
        .filter(Matchup.is_playoff == False)
        .join(Season, Matchup.season_id == Season.id)
        .order_by(Season.year, Matchup.week)
        .all()
    )

    # Build season_id -> year lookup
    season_ids = {m.season_id for m in all_matchups}
    seasons_list = db.query(Season).filter(Season.id.in_(season_ids)).all()
    season_year = {s.id: s.year for s in seasons_list}

    # Map team_id -> manager_id
    team_ids_set: set[int] = set()
    for m in all_matchups:
        team_ids_set.add(m.team1_id)
        team_ids_set.add(m.team2_id)
    teams_list = db.query(Team).filter(Team.id.in_(team_ids_set)).all()
    team_to_manager = {t.id: t.manager_id for t in teams_list}

    # Build per-manager ordered results with (year, week, result)
    manager_results: dict[int, list[tuple[int, int, str]]] = defaultdict(list)
    for m in all_matchups:
        year = season_year.get(m.season_id, 0)
        mgr1 = team_to_manager.get(m.team1_id)
        mgr2 = team_to_manager.get(m.team2_id)
        if mgr1 is not None:
            if m.winner_team_id == m.team1_id:
                manager_results[mgr1].append((year, m.week, "W"))
            elif m.winner_team_id is None:
                manager_results[mgr1].append((year, m.week, "T"))
            else:
                manager_results[mgr1].append((year, m.week, "L"))
        if mgr2 is not None:
            if m.winner_team_id == m.team2_id:
                manager_results[mgr2].append((year, m.week, "W"))
            elif m.winner_team_id is None:
                manager_results[mgr2].append((year, m.week, "T"))
            else:
                manager_results[mgr2].append((year, m.week, "L"))

    def _best_streak(res, char):
        """Find best streak of char, returning (length, start_year, start_week, end_year, end_week)."""
        best_len = 0
        best_start = best_end = 0
        cur_len = 0
        cur_start = 0
        for i, (yr, wk, r) in enumerate(res):
            if r == char:
                if cur_len == 0:
                    cur_start = i
                cur_len += 1
                if cur_len > best_len:
                    best_len = cur_len
                    best_start = cur_start
                    best_end = i
            else:
                cur_len = 0
        if best_len == 0:
            return 0, None, None, None, None
        sy, sw, _ = res[best_start]
        ey, ew, _ = res[best_end]
        return best_len, sy, sw, ey, ew

    def _current_streak(res):
        if not res:
            return "W", 0
        char = res[-1][2]
        count = 0
        for yr, wk, r in reversed(res):
            if r == char:
                count += 1
            else:
                break
        return char, count

    rows = []
    for mgr_id, res in manager_results.items():
        if mgr_id not in mgr_map:
            continue
        cur_type, cur_len = _current_streak(res)
        wl, ws_year, ws_week, we_year, we_week = _best_streak(res, "W")
        ll, ls_year, ls_week, le_year, le_week = _best_streak(res, "L")
        rows.append({
            "manager_id": mgr_id,
            "manager_name": mgr_map[mgr_id],
            "current_streak_type": cur_type,
            "current_streak_length": cur_len,
            "longest_win_streak": wl,
            "longest_win_start_year": ws_year,
            "longest_win_start_week": ws_week,
            "longest_win_end_year": we_year,
            "longest_win_end_week": we_week,
            "longest_loss_streak": ll,
            "longest_loss_start_year": ls_year,
            "longest_loss_start_week": ls_week,
            "longest_loss_end_year": le_year,
            "longest_loss_end_week": le_week,
        })

    rows.sort(key=lambda x: -x["current_streak_length"])
    return rows


# ---------------------------------------------------------------------------
# League Parity
# ---------------------------------------------------------------------------

def compute_league_parity(db: Session) -> list[dict]:
    """
    Per-season parity metrics: how competitive/tight was the league each year.
    Lower scoring std dev and smaller record spread indicate more parity.
    """
    seasons = db.query(Season).order_by(Season.year).all()
    results = []

    for season in seasons:
        teams = db.query(Team).filter(Team.season_id == season.id).all()
        if not teams or len(teams) < 2:
            continue

        num_teams = len(teams)
        points_for_list = [t.points_for for t in teams]
        wins_list = [t.wins for t in teams]

        # Scoring std dev
        mean_pf = sum(points_for_list) / num_teams
        variance = sum((pf - mean_pf) ** 2 for pf in points_for_list) / num_teams
        scoring_std_dev = round(math.sqrt(variance), 2)

        # Scoring range
        scoring_range = round(max(points_for_list) - min(points_for_list), 2)

        # Record spread (best wins - worst wins)
        record_spread = max(wins_list) - min(wins_list)

        # Average points per game across the league
        total_matchups = db.query(Matchup).filter(
            Matchup.season_id == season.id,
            Matchup.is_playoff == False,
            Matchup.is_consolation == False,
        ).all()
        all_scores = []
        for m in total_matchups:
            all_scores.append(m.team1_points)
            all_scores.append(m.team2_points)
        avg_ppg = round(sum(all_scores) / len(all_scores), 2) if all_scores else 0.0

        # Closest standings gap: minimum difference in wins between
        # adjacent teams when sorted by wins descending
        sorted_wins = sorted(wins_list, reverse=True)
        gaps = [sorted_wins[i] - sorted_wins[i + 1] for i in range(len(sorted_wins) - 1)]
        closest_gap = min(gaps) if gaps else 0

        # Gini coefficient for scoring — 0 = perfect equality, 1 = total inequality
        sorted_pf = sorted(points_for_list)
        n = len(sorted_pf)
        if mean_pf > 0:
            numerator = sum((2 * (i + 1) - n - 1) * sorted_pf[i] for i in range(n))
            gini = round(numerator / (n * n * mean_pf), 4)
        else:
            gini = 0.0

        results.append({
            "year": season.year,
            "num_teams": num_teams,
            "scoring_std_dev": scoring_std_dev,
            "scoring_range": scoring_range,
            "record_spread": record_spread,
            "avg_points_per_game": avg_ppg,
            "closest_standings_gap": closest_gap,
            "gini_coefficient": gini,
        })

    return results


# ---------------------------------------------------------------------------
# Consolation Bracket
# ---------------------------------------------------------------------------

def compute_consolation_bracket(db: Session, year: int | None = None) -> list[dict]:
    """
    Per-manager consolation bracket stats: games, wins, losses, win%,
    average points scored in consolation matchups, and times missed playoffs.
    """
    managers = db.query(Manager).filter(~Manager.yahoo_guid.like("hidden_%")).all()
    mgr_map = {m.id: m for m in managers}

    # Map team_id -> manager_id
    teams = db.query(Team).all()
    team_to_mgr: dict[int, int] = {t.id: t.manager_id for t in teams}

    # Count missed playoffs per manager
    missed_playoffs: dict[int, int] = defaultdict(int)
    for t in teams:
        if year and t.season.year != year:
            continue
        if not t.made_playoffs:
            missed_playoffs[t.manager_id] += 1

    # Query consolation matchups
    q = db.query(Matchup).filter(Matchup.is_consolation == True)
    if year:
        q = q.join(Season).filter(Season.year == year)
    consolation_matchups = q.all()

    # Aggregate per manager
    stats: dict[int, dict] = defaultdict(lambda: {
        "wins": 0, "losses": 0, "points": []
    })

    for m in consolation_matchups:
        mgr1 = team_to_mgr.get(m.team1_id)
        mgr2 = team_to_mgr.get(m.team2_id)
        if mgr1 is None or mgr2 is None:
            continue

        # Team 1
        stats[mgr1]["points"].append(m.team1_points)
        # Team 2
        stats[mgr2]["points"].append(m.team2_points)

        if m.winner_team_id == m.team1_id:
            stats[mgr1]["wins"] += 1
            stats[mgr2]["losses"] += 1
        elif m.winner_team_id == m.team2_id:
            stats[mgr2]["wins"] += 1
            stats[mgr1]["losses"] += 1

    results = []
    for mgr_id, s in stats.items():
        mgr = mgr_map.get(mgr_id)
        if not mgr:
            continue
        games = s["wins"] + s["losses"]
        win_pct = round(s["wins"] / games, 4) if games else 0.0
        avg_pts = round(sum(s["points"]) / len(s["points"]), 2) if s["points"] else 0.0

        results.append({
            "manager_id": mgr_id,
            "manager_name": mgr.display_name,
            "times_missed_playoffs": missed_playoffs.get(mgr_id, 0),
            "consolation_games": games,
            "consolation_wins": s["wins"],
            "consolation_losses": s["losses"],
            "consolation_win_pct": win_pct,
            "consolation_avg_points": avg_pts,
        })

    # Also include managers who missed playoffs but have no consolation games
    for mgr_id, count in missed_playoffs.items():
        if mgr_id not in stats:
            mgr = mgr_map.get(mgr_id)
            if mgr:
                results.append({
                    "manager_id": mgr_id,
                    "manager_name": mgr.display_name,
                    "times_missed_playoffs": count,
                    "consolation_games": 0,
                    "consolation_wins": 0,
                    "consolation_losses": 0,
                    "consolation_win_pct": 0.0,
                    "consolation_avg_points": 0.0,
                })

    results.sort(key=lambda x: (-x["consolation_wins"], -x["consolation_win_pct"]))
    return results


# ---------------------------------------------------------------------------
# Manager Tiers
# ---------------------------------------------------------------------------

def compute_manager_tiers(db: Session) -> list[dict]:
    """
    Clusters managers into performance tiers based on a composite score
    computed from: win%, avg PPG, championships, playoff appearance rate,
    and consistency (low std dev of season finishes).
    Only managers with 3+ seasons are included.
    """
    managers = db.query(Manager).filter(~Manager.yahoo_guid.like("hidden_%")).all()
    mgr_map = {m.id: m for m in managers}

    # Gather per-manager career data
    raw: list[dict] = []
    for mgr in managers:
        teams = db.query(Team).filter(Team.manager_id == mgr.id).all()
        if len(teams) < 3:
            continue

        total_wins = sum(t.wins for t in teams)
        total_losses = sum(t.losses for t in teams)
        total_ties = sum(t.ties for t in teams)
        total_games = total_wins + total_losses + total_ties
        win_pct = total_wins / total_games if total_games else 0.0

        total_pf = sum(t.points_for for t in teams)
        avg_ppg = total_pf / total_games if total_games else 0.0

        championships = sum(1 for t in teams if t.is_champion)
        playoff_apps = sum(1 for t in teams if t.made_playoffs)
        playoff_rate = playoff_apps / len(teams) if teams else 0.0

        # Consistency of season finishes (lower std dev = more consistent)
        finishes = [t.final_rank for t in teams if t.final_rank is not None]
        if len(finishes) >= 2:
            mean_finish = sum(finishes) / len(finishes)
            variance = sum((f - mean_finish) ** 2 for f in finishes) / len(finishes)
            finish_std = math.sqrt(variance)
        else:
            finish_std = 0.0

        raw.append({
            "manager_id": mgr.id,
            "manager_name": mgr.display_name,
            "win_pct": round(win_pct, 4),
            "avg_ppg": round(avg_ppg, 2),
            "championships": championships,
            "playoff_rate": round(playoff_rate, 4),
            "finish_std": finish_std,
            "seasons_played": len(teams),
        })

    if not raw:
        return []

    # Percentile-rank each dimension 0-100
    def pct_rank(items: list[dict], key: str, invert: bool = False) -> dict[int, float]:
        vals = sorted(items, key=lambda x: x[key], reverse=not invert)
        n = len(vals)
        return {
            v["manager_id"]: round((n - 1 - rank) / max(n - 1, 1) * 100, 1)
            for rank, v in enumerate(vals)
        }

    pct_win = pct_rank(raw, "win_pct")
    pct_ppg = pct_rank(raw, "avg_ppg")
    pct_champ = pct_rank(raw, "championships")
    pct_playoff = pct_rank(raw, "playoff_rate")
    pct_consistency = pct_rank(raw, "finish_std", invert=True)  # lower std = better

    # Composite score: weighted average
    # Win% and PPG are strongest signals; championships and playoffs reward success;
    # consistency adds a stability dimension.
    weights = {
        "win_pct": 0.25,
        "avg_ppg": 0.25,
        "championships": 0.20,
        "playoff_rate": 0.15,
        "consistency": 0.15,
    }

    results = []
    for r in raw:
        mid = r["manager_id"]
        composite = (
            pct_win[mid] * weights["win_pct"]
            + pct_ppg[mid] * weights["avg_ppg"]
            + pct_champ[mid] * weights["championships"]
            + pct_playoff[mid] * weights["playoff_rate"]
            + pct_consistency[mid] * weights["consistency"]
        )
        results.append({
            **r,
            "composite_score": round(composite, 1),
            "consistency_score": round(pct_consistency[mid], 1),
        })

    # Sort by composite score descending
    results.sort(key=lambda x: -x["composite_score"])

    # Assign tiers based on percentile position in the sorted list
    n = len(results)
    for i, r in enumerate(results):
        pct_position = i / n  # 0 = top, 1 = bottom
        if pct_position < 0.20:
            r["tier"] = "Elite"
        elif pct_position < 0.50:
            r["tier"] = "Contender"
        elif pct_position < 0.80:
            r["tier"] = "Middle of the Pack"
        else:
            r["tier"] = "Rebuilding"

    # Remove internal field
    for r in results:
        r.pop("finish_std", None)

    return results


# ---------------------------------------------------------------------------
# Strength of Schedule
# ---------------------------------------------------------------------------

def compute_strength_of_schedule(db: Session, year: int | None = None) -> list[dict]:
    """
    For each manager, compute the average win% and points_for of the opponents
    they actually faced in regular-season matchups.

    Metrics:
    - avg_opp_win_pct: mean win% of all opponents faced
    - avg_opp_pf: mean points_for of all opponents faced (season total PF)
    - sos_rank: 1 = hardest schedule (highest avg_opp_win_pct)
    - actual_win_pct: manager's own win%
    - adjusted_win_pct: actual_win_pct + (avg_opp_win_pct - league_avg_opp_win_pct)
    - wins_above_expected: actual_wins - expected_wins (where expected = games * league_avg_win_pct_for_their_opponents)
    """
    teams = db.query(Team).all()
    managers = {m.id: m for m in db.query(Manager).filter(~Manager.yahoo_guid.like("hidden_%")).all()}
    seasons = {s.id: s for s in db.query(Season).all()}

    # Map team_id -> manager_id and team_id -> season_id
    team_to_mgr: dict[int, int] = {t.id: t.manager_id for t in teams}
    team_to_season: dict[int, int] = {t.id: t.season_id for t in teams}

    # Build team win percentages: team_id -> (wins, losses, ties)
    team_record: dict[int, dict] = {}
    for t in teams:
        total_games = t.wins + t.losses + t.ties
        team_record[t.id] = {
            "wins": t.wins,
            "losses": t.losses,
            "ties": t.ties,
            "games": total_games,
            "win_pct": t.wins / total_games if total_games else 0.0,
            "points_for": t.points_for,
        }

    # Get regular-season matchups
    matchup_q = db.query(Matchup).filter(Matchup.is_playoff == False)
    if year:
        season = db.query(Season).filter(Season.year == year).first()
        if not season:
            return []
        matchup_q = matchup_q.filter(Matchup.season_id == season.id)

    matchups = matchup_q.all()

    # For each manager, collect the team_ids of opponents they faced
    # Key: manager_id -> list of opponent team_ids
    mgr_opponents: dict[int, list[int]] = defaultdict(list)
    mgr_wins: dict[int, float] = defaultdict(float)
    mgr_games: dict[int, int] = defaultdict(int)

    for m in matchups:
        mgr1 = team_to_mgr.get(m.team1_id)
        mgr2 = team_to_mgr.get(m.team2_id)
        if mgr1 is None or mgr2 is None:
            continue

        mgr_opponents[mgr1].append(m.team2_id)
        mgr_opponents[mgr2].append(m.team1_id)

        mgr_games[mgr1] += 1
        mgr_games[mgr2] += 1

        if m.winner_team_id == m.team1_id:
            mgr_wins[mgr1] += 1
        elif m.winner_team_id == m.team2_id:
            mgr_wins[mgr2] += 1
        else:
            mgr_wins[mgr1] += 0.5
            mgr_wins[mgr2] += 0.5

    # Compute per-manager SOS metrics
    results = []
    for mgr_id, opp_team_ids in mgr_opponents.items():
        if mgr_id not in managers:
            continue

        games = mgr_games[mgr_id]
        if games == 0:
            continue

        # Average opponent win% (using each opponent team's season win%)
        opp_win_pcts = [team_record[tid]["win_pct"] for tid in opp_team_ids if tid in team_record]
        avg_opp_win_pct = sum(opp_win_pcts) / len(opp_win_pcts) if opp_win_pcts else 0.0

        # Average opponent points_for (season total divided by games for per-game avg)
        opp_pfs = []
        for tid in opp_team_ids:
            if tid in team_record:
                rec = team_record[tid]
                ppg = rec["points_for"] / rec["games"] if rec["games"] else 0.0
                opp_pfs.append(ppg)
        avg_opp_pf = sum(opp_pfs) / len(opp_pfs) if opp_pfs else 0.0

        actual_win_pct = mgr_wins[mgr_id] / games if games else 0.0

        results.append({
            "manager_id": mgr_id,
            "manager_name": managers[mgr_id].display_name,
            "year": year,
            "games": games,
            "actual_win_pct": round(actual_win_pct, 4),
            "avg_opp_win_pct": round(avg_opp_win_pct, 4),
            "avg_opp_pf": round(avg_opp_pf, 2),
            "sos_rank": 0,  # filled below
            "adjusted_win_pct": 0.0,  # filled below
            "wins_above_expected": 0.0,  # filled below
        })

    if not results:
        return []

    # League average opponent win% (used as baseline)
    league_avg_opp_wp = sum(r["avg_opp_win_pct"] for r in results) / len(results)

    # Compute adjusted win% and wins above expected
    for r in results:
        # Adjusted win% = actual + (opp_strength - league_avg_opp_strength)
        # This rewards managers who faced harder schedules
        adjustment = r["avg_opp_win_pct"] - league_avg_opp_wp
        r["adjusted_win_pct"] = round(r["actual_win_pct"] + adjustment, 4)

        # Expected win% given opponent quality:
        # If you faced average opponents, your expected win% = actual_win_pct
        # The delta from schedule difficulty shifts expected wins
        expected_win_pct = r["actual_win_pct"] - adjustment
        expected_wins = expected_win_pct * r["games"]
        actual_wins = r["actual_win_pct"] * r["games"]
        r["wins_above_expected"] = round(actual_wins - expected_wins, 2)

    # SOS rank: 1 = hardest schedule (highest avg_opp_win_pct)
    results.sort(key=lambda x: -x["avg_opp_win_pct"])
    for i, r in enumerate(results):
        r["sos_rank"] = i + 1

    # Final sort by adjusted win% descending
    results.sort(key=lambda x: -x["adjusted_win_pct"])

    return results
