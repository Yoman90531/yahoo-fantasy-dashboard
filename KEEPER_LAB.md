# Keeper Lab operations

Keeper Lab uses the 2025 Yahoo final rosters and draft results to prepare the
fourteen-team 2026 keeper draft. Nabi and Squilly are configured as expansion
teams. Simulator choices are browser-session state only and are never written
to the API or Yahoo.

## Prepare Yahoo roster metadata

Apply migrations and resync 2025 so the new Yahoo player ID and NFL-team fields
are populated:

```powershell
cd backend
python scripts/migrate_database.py
python sync_runner.py --years 2025
```

## Import FantasyPros Half-PPR consensus ADP

Keeper Lab stores dated ADP snapshots and uses the latest locked 2026 Half-PPR
snapshot. The supplied 351-player FantasyPros export is bundled at
`backend/app/resources/fantasypros_2026_half_ppr_adp.csv` and is seeded
idempotently during deployment. To import a newer export manually:

```powershell
cd backend
python scripts/import_adp.py --file C:\path\to\FantasyPros_2026_Overall_ADP_Rankings.csv
```

The direct scrape can be attempted with `python scripts/import_adp.py`, but the
public FantasyPros page currently exposes only a five-player preview. The
importer refuses any source with fewer than 50 players so an incomplete scrape
cannot replace the locked snapshot.

## Load keeper history

`backend/app/resources/keeper_history.json` contains the 30 confirmed keepers
from the `2025 Keepers` tab of the league tracker, plus the 2024 and 2023 links
needed to calculate consecutive-year eligibility. The file records its source
URL and is marked complete through 2025.

```json
{
  "complete_through": 2025,
  "entries": [
    {
      "season": 2025,
      "player_id": "12345",
      "player_name": "Example Player",
      "owner": "Dan",
      "keeper_type": "standard",
      "cost_round": 6
    },
    {
      "season": 2025,
      "player_id": "67890",
      "player_name": "Dynasty Example",
      "owner": "Karna",
      "keeper_type": "dynasty",
      "cost_round": 8,
      "locked_round": 8,
      "dynasty_year": 2
    }
  ]
}
```

`player_id` is preferred and refers to the stable numeric portion of a Yahoo
player key. `player_name` is used as a fallback.

## Configure traded draft picks

Edit `backend/app/resources/keeper_draft_picks.json`. Values are total pick
capacity in a round, so only rounds with a non-default capacity need entries.

```json
{
  "season": 2026,
  "round_capacities": {
    "Dan": { "5": 2 },
    "Karna": { "5": 0, "8": 2 }
  }
}
```

All omitted rounds default to one pick. The simulator uses these capacities
when resolving multiple same-round keepers.

## Player matching overrides

If a Yahoo name does not match FantasyPros, add an alias to
`backend/app/resources/keeper_player_aliases.json`:

```json
{
  "aliases": {
    "Yahoo player name": "FantasyPros player name"
  }
}
```

Current-team gaps that are not present in the FantasyPros export are recorded
in `backend/app/resources/keeper_nfl_team_overrides.json`. The file includes its
capture date and the documented Sleeper player-feed URL used for the backfill;
`FA` means the player has no current NFL club in that feed.

