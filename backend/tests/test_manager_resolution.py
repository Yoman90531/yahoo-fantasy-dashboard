import os
import unittest

os.environ.setdefault("YAHOO_CLIENT_ID", "test")
os.environ.setdefault("YAHOO_CLIENT_SECRET", "test")
os.environ.setdefault("LEAGUE_ID", "test")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import crud
from app.database import Base
from app.models import draft_pick, manager, matchup, player_season, season, team
from app.models.manager import Manager
from app.models.matchup import Matchup
from app.models.season import Season
from app.models.team import Team
from app.routers.managers import get_manager
from app.routers.seasons import get_season_matchups
from app.schemas.stats import (
    H2HMatrix,
    InsightRankings,
    LeagueParityRow,
    ManagerPlacementRow,
    ScoreDistributionRow,
    SeasonAwards,
    StreakRow,
    StrengthOfScheduleRow,
    WeeklyFinishRow,
    WeeklyRecords,
    WinMarginRow,
)
from app.schemas.draft import DraftAnalysis
from app.services.stats.distributions import (
    compute_score_distribution,
    compute_weekly_finish_distribution,
)
from app.services.stats.draft import compute_draft_analysis
from app.services.stats.margins import compute_win_margins
from app.services.stats.insights import compute_insight_rankings
from app.services.stats.placements import (
    compute_manager_placements,
    compute_manager_profile_summary,
    normalized_finish_percentile,
)
from app.services.stats_engine import (
    _get_active_managers,
    _tie_aware_percentiles,
    compute_awards,
    compute_head_to_head,
    compute_league_parity,
    compute_manager_tiers,
    compute_rivalry,
    compute_streaks_all,
    compute_strength_of_schedule,
    compute_trophy_case,
    compute_weekly_records,
)
from scripts.audit_data import audit_database


CANONICAL_NAME_CASES = (
    ("BWP2TR2AM6UCK4O2SSB5QENMTA", "Dan Yo", "Dan"),
    ("GOGUB4NMXEO7JMGK4ORGST5T6U", "karna", "Karna"),
    ("55RLOFACMDZLSPWTEKYND5WLJ4", "Benito", "Bennett"),
    ("6YACMFT7CNJGCBKVZZMEYUMMGM", "Ben", "Himmel"),
    ("CFFTOVALCAGKZTO5CYUVZLQNXU", "Ryan", "Kang"),
    ("LY5H326U5L3SALUER4S4FAPPKY", "Sandy August", "Sandy"),
    ("SMZJC5CPSCDSMMO2Z6ZTD4XEKE", "Michael C", "Michael"),
)


class ManagerResolutionTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(bind=self.engine)
        self.db = self.session_factory()

        jk = Manager(
            id=22,
            yahoo_guid="BPHZFVHKP3ZTT4RBFDQPRCOPCA",
            display_name="--hidden--",
        )
        david = Manager(
            id=23,
            yahoo_guid="DAVID_TEST_GUID",
            display_name="David",
        )
        season_2017 = Season(
            id=1,
            year=2017,
            game_id=371,
            league_id="test",
            league_name="Test League",
            num_teams=2,
            num_playoff_teams=2,
            num_regular_season_weeks=1,
        )
        trap_willy = Team(
            id=101,
            season_id=1,
            manager_id=22,
            yahoo_team_key="371.l.test.t.1",
            yahoo_team_id=1,
            team_name="Trap Willy",
            final_rank=1,
            wins=1,
            losses=0,
            ties=0,
            points_for=57.4,
            points_against=52.82,
            made_playoffs=True,
            is_champion=True,
            playoff_finish=1,
        )
        david_team = Team(
            id=102,
            season_id=1,
            manager_id=23,
            yahoo_team_key="371.l.test.t.2",
            yahoo_team_id=2,
            team_name="David's Team",
            final_rank=2,
            wins=0,
            losses=1,
            ties=0,
            points_for=52.82,
            points_against=57.4,
            made_playoffs=True,
            is_champion=False,
            playoff_finish=2,
        )
        week_five = Matchup(
            id=1001,
            season_id=1,
            week=1,
            team1_id=101,
            team2_id=102,
            team1_points=57.4,
            team2_points=52.82,
            winner_team_id=101,
            is_playoff=False,
            is_championship=False,
            is_consolation=False,
        )

        self.db.add_all([jk, david, season_2017, trap_willy, david_team])
        self.db.flush()
        season_2017.champion_team_id = trap_willy.id
        self.db.add(week_five)
        self.db.commit()

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()

    def test_weekly_records_apply_override_before_filtering(self) -> None:
        records = compute_weekly_records(self.db)

        lowest_winner = records["lowest_winning_score"][0]
        self.assertEqual(lowest_winner["manager_id"], 22)
        self.assertEqual(lowest_winner["manager_name"], "JK")
        self.assertEqual(lowest_winner["opponent_manager_name"], "David")

    def test_season_matchups_use_the_same_resolved_manager_names(self) -> None:
        result = get_season_matchups(2017, week=None, db=self.db)

        self.assertEqual(result[0].team1_manager_name, "JK")
        self.assertEqual(result[0].team2_manager_name, "David")

    def test_direct_manager_analytics_apply_overrides(self) -> None:
        trophy_case = compute_trophy_case(self.db, 22)
        rivalry = compute_rivalry(self.db, 22, 23)

        self.assertEqual(trophy_case["manager_name"], "JK")
        self.assertEqual(rivalry["manager_a_name"], "JK")
        self.assertEqual(rivalry["manager_b_name"], "David")

    def test_clean_fixture_passes_data_audit(self) -> None:
        report = audit_database(self.session_factory)

        self.assertEqual(report.errors, [])
        unexpected_warnings = [
            warning for warning in report.warnings
            if not warning.startswith("Manager overrides with no matching database row:")
        ]
        self.assertEqual(unexpected_warnings, [])

    def test_career_tiers_include_schedule_adjusted_performance(self) -> None:
        rows = compute_manager_tiers(self.db, year_start=2017, year_end=2017)
        by_manager = {row["manager_id"]: row for row in rows}

        self.assertEqual(by_manager[22]["expected_win_pct"], 1.0)
        self.assertEqual(by_manager[23]["expected_win_pct"], 0.0)
        self.assertEqual(by_manager[22]["dimension_scores"]["expected_win_pct"], 100.0)
        self.assertEqual(by_manager[23]["dimension_scores"]["expected_win_pct"], 0.0)
        self.assertEqual(by_manager[22]["tier"], "Elite")
        self.assertEqual(by_manager[23]["tier"], "Rebuilding")

    def test_percentile_scores_are_tie_aware(self) -> None:
        scores = _tie_aware_percentiles({1: 10.0, 2: 10.0, 3: 5.0})

        self.assertEqual(scores[1], scores[2])
        self.assertEqual(scores[1], 75.0)
        self.assertEqual(scores[3], 0.0)

    def test_requested_manager_names_are_canonical_everywhere(self) -> None:
        manager_ids = {}
        for guid, yahoo_name, expected_name in CANONICAL_NAME_CASES:
            persisted = crud.manager.upsert_manager(
                self.db,
                yahoo_guid=guid,
                display_name=yahoo_name,
            )
            manager_ids[guid] = persisted.id
            self.assertEqual(persisted.display_name, expected_name)
        self.db.commit()

        active_by_guid = {
            manager.yahoo_guid: manager.display_name
            for manager in _get_active_managers(self.db)
        }
        for guid, _yahoo_name, expected_name in CANONICAL_NAME_CASES:
            self.assertEqual(active_by_guid[guid], expected_name)
            profile = get_manager(manager_ids[guid], db=self.db)
            self.assertEqual(profile.manager.display_name, expected_name)

    def test_final_placement_metrics_include_postseason_results(self) -> None:
        placements = compute_manager_placements(self.db)
        by_manager = {row["manager_id"]: row for row in placements}

        champion = by_manager[22]
        runner_up = by_manager[23]
        self.assertEqual(champion["placement_rank"], 1)
        self.assertEqual(champion["average_finish"], 1.0)
        self.assertEqual(champion["finish_percentile"], 100.0)
        self.assertEqual(champion["championships"], 1)
        self.assertEqual(runner_up["average_finish"], 2.0)
        self.assertEqual(runner_up["runner_ups"], 1)
        self.assertEqual(runner_up["last_place_finishes"], 1)
        self.assertEqual(runner_up["finish_percentile"], 0.0)
        self.assertEqual(compute_trophy_case(self.db, 23)["runner_ups"], [2017])
        self.assertEqual(normalized_finish_percentile(3, 12), 81.8)

        for row in placements:
            ManagerPlacementRow.model_validate(row)

    def test_manager_profile_summary_reuses_placement_and_rivalry_data(self) -> None:
        summary = compute_manager_profile_summary(self.db, 22)
        profile = get_manager(22, db=self.db)

        self.assertIsNotNone(summary)
        self.assertEqual(summary["placement"]["average_finish"], 1.0)
        self.assertEqual(summary["signature_season"]["year"], 2017)
        self.assertTrue(summary["signature_season"]["is_champion"])
        self.assertEqual(summary["favorite_opponent"]["manager_name"], "David")
        self.assertEqual(summary["nemesis"]["manager_name"], "David")
        self.assertEqual(profile.summary.placement.average_finish, 1.0)
        self.assertEqual(profile.season_history[0].num_teams, 2)
        self.assertEqual(profile.season_history[0].finish_percentile, 100.0)

    def test_ranked_insights_expose_complete_manager_order(self) -> None:
        rankings = compute_insight_rankings(self.db, "allTimeStandings")
        validated = InsightRankings.model_validate(rankings)

        average_finish = next(
            group
            for group in validated.groups
            if group.metric_key == "average_finish"
        )
        self.assertEqual(
            [entry.manager_name for entry in average_finish.entries],
            ["JK", "David"],
        )

    def test_representative_analytics_match_declared_api_contracts(self) -> None:
        H2HMatrix.model_validate(compute_head_to_head(self.db))
        WeeklyRecords.model_validate(compute_weekly_records(self.db))
        SeasonAwards.model_validate(compute_awards(self.db, year=2017))

        for row in compute_win_margins(self.db, year=2017):
            WinMarginRow.model_validate(row)
        for row in compute_streaks_all(self.db):
            StreakRow.model_validate(row)
        for row in compute_league_parity(self.db):
            LeagueParityRow.model_validate(row)
        for row in compute_strength_of_schedule(self.db, year=2017):
            StrengthOfScheduleRow.model_validate(row)
        for row in compute_score_distribution(self.db):
            ScoreDistributionRow.model_validate(row)
        for row in compute_weekly_finish_distribution(self.db):
            WeeklyFinishRow.model_validate(row)
        DraftAnalysis.model_validate(compute_draft_analysis(self.db, year=2017))


if __name__ == "__main__":
    unittest.main()
