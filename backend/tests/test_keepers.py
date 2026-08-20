import tempfile
import unittest
import json
from pathlib import Path
from unittest import mock

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.adp import AdpEntry, AdpSnapshot
from app.models.draft_pick import DraftPick
from app.models.manager import Manager
from app.models.player_season import PlayerSeason
from app.models.season import Season
from app.models.team import Team
from app.schemas.keeper import KeeperBoard
from app.services.adp_import import read_csv_records, records_from_html
from app.services.keepers import (
    _candidate_rule_state,
    adp_round,
    build_keeper_board,
    normalize_player_name,
    value_rating,
)


class KeeperRulesTest(unittest.TestCase):
    def test_bundled_keeper_history_is_complete_through_2025(self) -> None:
        path = Path(__file__).resolve().parents[1] / "app" / "resources" / "keeper_history.json"
        history = json.loads(path.read_text(encoding="utf-8"))
        keepers_2025 = [entry for entry in history["entries"] if entry["season"] == 2025]
        dynasty_players = {
            entry["player_name"]: entry["dynasty_year"]
            for entry in keepers_2025
            if entry["keeper_type"] == "dynasty"
        }

        self.assertEqual(history["complete_through"], 2025)
        self.assertEqual(len(keepers_2025), 30)
        self.assertEqual(dynasty_players, {"Garrett Wilson": 3, "Sam LaPorta": 2})

    def test_fourteen_team_adp_round_boundaries(self) -> None:
        self.assertEqual(adp_round(1, 14), 1)
        self.assertEqual(adp_round(14, 14), 1)
        self.assertEqual(adp_round(15, 14), 2)
        self.assertEqual(adp_round(224, 14), 16)

    def test_first_time_non_first_round_player_gets_first_round_adp_exception(self) -> None:
        state = _candidate_rule_state(
            history_known=True,
            history_entries=[],
            source_year=2025,
            draft_round=7,
            current_adp_round=1,
            draft_rounds=16,
        )
        self.assertEqual(state["eligibility_status"], "eligible")
        self.assertEqual(state["base_keeper_round"], 7)

    def test_third_consecutive_standard_keeper_is_ineligible(self) -> None:
        state = _candidate_rule_state(
            history_known=True,
            history_entries=[
                {"season": 2023, "keeper_type": "standard", "cost_round": 9},
                {"season": 2024, "keeper_type": "standard", "cost_round": 6},
                {"season": 2025, "keeper_type": "standard", "cost_round": 4},
            ],
            source_year=2025,
            draft_round=10,
            current_adp_round=3,
            draft_rounds=16,
        )
        self.assertEqual(state["eligibility_status"], "ineligible")
        self.assertEqual(state["consecutive_keeper_years"], 3)

    def test_active_dynasty_keeps_locked_round_despite_first_round_adp(self) -> None:
        state = _candidate_rule_state(
            history_known=True,
            history_entries=[
                {
                    "season": 2025,
                    "keeper_type": "dynasty",
                    "dynasty_year": 2,
                    "locked_round": 6,
                }
            ],
            source_year=2025,
            draft_round=6,
            current_adp_round=1,
            draft_rounds=16,
        )
        self.assertEqual(state["eligibility_status"], "eligible")
        self.assertEqual(state["base_keeper_round"], 6)

    def test_unknown_history_is_reviewable_with_provisional_cost(self) -> None:
        state = _candidate_rule_state(
            history_known=False,
            history_entries=[],
            source_year=2025,
            draft_round=None,
            current_adp_round=8,
            draft_rounds=16,
        )
        self.assertEqual(state["eligibility_status"], "review")
        self.assertEqual(state["base_keeper_round"], 16)

    def test_value_ratings_and_name_normalization(self) -> None:
        self.assertEqual(value_rating(5), "Elite")
        self.assertEqual(value_rating(3), "Strong")
        self.assertEqual(value_rating(1), "Good")
        self.assertEqual(value_rating(0), "Fair")
        self.assertEqual(value_rating(-1), "Poor")
        self.assertEqual(normalize_player_name("Ja'Marr Chase Jr."), "ja marr chase")


class AdpImportTest(unittest.TestCase):
    def test_bundled_fantasypros_snapshot_is_complete(self) -> None:
        path = Path(__file__).resolve().parents[1] / "app" / "resources" / "fantasypros_2026_half_ppr_adp.csv"
        records = read_csv_records(path)

        self.assertEqual(len(records), 351)
        self.assertEqual((records[0].rank, records[-1].rank), (1, 351))
        self.assertEqual(records[16].player_name, "Kenneth Walker III")
        self.assertEqual(records[16].nfl_team, "KC")

    def test_fantasypros_csv_shape_is_parsed(self) -> None:
        csv_text = (
            "Rank,Player Team (Bye),POS,Yahoo,RTSports,Sleeper,AVG\n"
            '1,"Jahmyr Gibbs (DET)",RB1,2,1,2,1.7\n'
            '2,"Ja\'Marr Chase (CIN)",WR1,4,2,3,3.0\n'
        )
        with tempfile.TemporaryDirectory() as temporary_directory:
            path = Path(temporary_directory) / "adp.csv"
            path.write_text(csv_text, encoding="utf-8")
            records = read_csv_records(path)

        self.assertEqual(len(records), 2)
        self.assertEqual(records[0].player_name, "Jahmyr Gibbs")
        self.assertEqual(records[0].nfl_team, "DET")
        self.assertEqual(records[0].position, "RB")
        self.assertEqual(records[0].average_adp, 1.7)

    def test_server_rendered_html_table_is_parsed(self) -> None:
        html = """
        <table>
          <tr><th>Rank</th><th>Player Team (Bye)</th><th>POS</th><th>AVG</th></tr>
          <tr><td>1</td><td>Bijan Robinson (ATL)</td><td>RB1</td><td>1.5</td></tr>
          <tr><td>2</td><td>Puka Nacua (LAR)</td><td>WR1</td><td>2.4</td></tr>
        </table>
        """
        records = records_from_html(html)
        self.assertEqual([record.player_name for record in records], ["Bijan Robinson", "Puka Nacua"])
        self.assertEqual(records[1].nfl_team, "LAR")

    def test_fantasypros_embedded_report_config_is_parsed(self) -> None:
        html = """
        <script>
          window.FP = window.FP || {};
          window.FP.reportConfig = {"table":{"rows":[
            {"rank":1,"player":{"name":"Jahmyr Gibbs","team":"DET (6)"},"pos":"RB1","avg":1.3},
            {"rank":2,"player":{"name":"Bijan Robinson","team":"ATL (11)"},"pos":"RB2","avg":1.7}
          ]}};
        </script>
        """
        records = records_from_html(html)
        self.assertEqual(len(records), 2)
        self.assertEqual(records[0].player_name, "Jahmyr Gibbs")
        self.assertEqual(records[0].nfl_team, "DET")
        self.assertEqual(records[1].average_adp, 1.7)


class KeeperBoardIntegrationTest(unittest.TestCase):
    def test_board_combines_yahoo_roster_draft_history_and_adp(self) -> None:
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        Session = sessionmaker(bind=engine)

        with Session() as db:
            manager = Manager(yahoo_guid="dan", display_name="Dan")
            season = Season(year=2025, game_id=449, league_id="1", num_teams=12)
            db.add_all([manager, season])
            db.flush()
            team = Team(
                season_id=season.id,
                manager_id=manager.id,
                yahoo_team_key="449.l.1.t.1",
                yahoo_team_id=1,
                team_name="Dan's Team",
            )
            db.add(team)
            db.flush()
            db.add(
                PlayerSeason(
                    season_id=season.id,
                    team_id=team.id,
                    player_key="449.p.123",
                    player_id="123",
                    player_name="Jahmyr Gibbs",
                    position="RB",
                    nfl_team="DET",
                    fantasy_points=300,
                )
            )
            db.add(
                DraftPick(
                    season_id=season.id,
                    team_id=team.id,
                    round=3,
                    pick=29,
                    player_name="Jahmyr Gibbs",
                    position="RB",
                    player_key="449.p.123",
                )
            )
            snapshot = AdpSnapshot(
                season=2026,
                source="FantasyPros",
                source_url="https://example.test/adp",
                scoring_format="half_ppr",
                league_size=14,
                is_locked=True,
            )
            db.add(snapshot)
            db.flush()
            db.add(
                AdpEntry(
                    snapshot_id=snapshot.id,
                    rank=1,
                    player_name="Jahmyr Gibbs",
                    normalized_name="jahmyr gibbs",
                    position="RB",
                    nfl_team="DET",
                    average_adp=1.0,
                )
            )
            db.commit()

            with tempfile.TemporaryDirectory() as temporary_directory:
                root = Path(temporary_directory)
                config_path = root / "config.json"
                history_path = root / "history.json"
                aliases_path = root / "aliases.json"
                draft_picks_path = root / "draft-picks.json"
                config_path.write_text(
                    json.dumps(
                        {
                            "season": 2026,
                            "source_season": 2025,
                            "league_size": 14,
                            "draft_rounds": 16,
                            "scoring_format": "half_ppr",
                            "adp_source": "FantasyPros",
                            "adp_url": "https://example.test/adp",
                            "expansion_teams": [
                                {"key": "expansion:nabi", "name": "Nabi"},
                                {"key": "expansion:squilly", "name": "Squilly"},
                            ],
                        }
                    ),
                    encoding="utf-8",
                )
                history_path.write_text(
                    json.dumps({"complete_through": 2025, "entries": []}),
                    encoding="utf-8",
                )
                aliases_path.write_text(json.dumps({"aliases": {}}), encoding="utf-8")
                draft_picks_path.write_text(
                    json.dumps({"season": 2026, "round_capacities": {"Dan": {"5": 2}}}),
                    encoding="utf-8",
                )

                with (
                    mock.patch("app.services.keepers.CONFIG_PATH", config_path),
                    mock.patch("app.services.keepers.HISTORY_PATH", history_path),
                    mock.patch("app.services.keepers.ALIASES_PATH", aliases_path),
                    mock.patch("app.services.keepers.DRAFT_PICKS_PATH", draft_picks_path),
                ):
                    board = KeeperBoard.model_validate(build_keeper_board(db))

            self.assertEqual(len(board.teams), 3)
            self.assertEqual(board.teams[0].round_capacities, {5: 2})
            self.assertEqual(board.candidates[0].nfl_team, "DET")
            self.assertEqual(board.candidates[0].base_keeper_round, 3)
            self.assertEqual(board.candidates[0].adp_round, 1)
            self.assertEqual(board.candidates[0].value_rounds, 2)
            self.assertEqual(board.candidates[0].eligibility_status, "eligible")

        engine.dispose()

    def test_board_prefers_adp_nfl_team_and_canonical_manager_name(self) -> None:
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        Session = sessionmaker(bind=engine)

        with Session() as db:
            manager = Manager(yahoo_guid="VWOUQLXG6CXYN3ZLF7D2DOVRK4", display_name="Andrew")
            season = Season(year=2025, game_id=449, league_id="1", num_teams=12)
            db.add_all([manager, season])
            db.flush()
            team = Team(
                season_id=season.id,
                manager_id=manager.id,
                yahoo_team_key="449.l.1.t.1",
                yahoo_team_id=1,
                team_name="Jamarcus Susseles",
            )
            db.add(team)
            db.flush()
            db.add(
                PlayerSeason(
                    season_id=season.id,
                    team_id=team.id,
                    player_key="449.p.123",
                    player_id="123",
                    player_name="Kenneth Walker III",
                    position="RB",
                    nfl_team="SEA",
                    fantasy_points=250,
                )
            )
            snapshot = AdpSnapshot(
                season=2026,
                source="FantasyPros",
                source_url="https://example.test/adp",
                scoring_format="half_ppr",
                league_size=14,
                is_locked=True,
            )
            db.add(snapshot)
            db.flush()
            db.add(
                AdpEntry(
                    snapshot_id=snapshot.id,
                    rank=17,
                    player_name="Kenneth Walker III",
                    normalized_name="kenneth walker",
                    position="RB",
                    nfl_team="KC",
                    average_adp=17.0,
                )
            )
            db.commit()

            with tempfile.TemporaryDirectory() as temporary_directory:
                root = Path(temporary_directory)
                config_path = root / "config.json"
                history_path = root / "history.json"
                aliases_path = root / "aliases.json"
                draft_picks_path = root / "draft-picks.json"
                config_path.write_text(
                    json.dumps(
                        {
                            "season": 2026,
                            "source_season": 2025,
                            "league_size": 14,
                            "draft_rounds": 16,
                            "scoring_format": "half_ppr",
                            "adp_source": "FantasyPros",
                            "adp_url": "https://example.test/adp",
                            "expansion_teams": [],
                        }
                    ),
                    encoding="utf-8",
                )
                history_path.write_text(
                    json.dumps({"complete_through": 2025, "entries": []}), encoding="utf-8"
                )
                aliases_path.write_text(json.dumps({"aliases": {}}), encoding="utf-8")
                draft_picks_path.write_text(
                    json.dumps({"season": 2026, "round_capacities": {}}), encoding="utf-8"
                )

                with (
                    mock.patch("app.services.keepers.CONFIG_PATH", config_path),
                    mock.patch("app.services.keepers.HISTORY_PATH", history_path),
                    mock.patch("app.services.keepers.ALIASES_PATH", aliases_path),
                    mock.patch("app.services.keepers.DRAFT_PICKS_PATH", draft_picks_path),
                ):
                    board = KeeperBoard.model_validate(build_keeper_board(db))

            self.assertEqual(board.teams[0].name, "Lowell")
            self.assertEqual(board.candidates[0].manager_name, "Lowell")
            self.assertEqual(board.candidates[0].nfl_team, "KC")

        engine.dispose()


if __name__ == "__main__":
    unittest.main()
