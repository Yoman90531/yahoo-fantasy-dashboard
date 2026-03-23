"""
Discovers your Yahoo Fantasy league ID for each historical season.

Yahoo assigns a new league ID each year when a league renews, so we need
to look up which league ID corresponds to YOUR league for each game year.

This calls the Yahoo API endpoint:
  /users;use_login=1/games;game_keys={...}/leagues

and saves the result to data/league_ids.json.

Usage (from the backend/ directory):
    python scripts/find_league_ids.py
"""
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

DATA_DIR = Path(__file__).parent.parent.parent / "data"
LEAGUE_IDS_FILE = DATA_DIR / "league_ids.json"
YAHOO_API = "https://fantasysports.yahooapis.com/fantasy/v2"


def get_access_token() -> str:
    load_dotenv(DATA_DIR / ".env")
    token = os.environ.get("YAHOO_ACCESS_TOKEN")
    if not token:
        print("ERROR: No access token found in data/.env — run scripts/auth_init.py first.")
        sys.exit(1)
    return token


def get_game_id_map() -> dict[int, int]:
    """Reuse yahoo_sync's game ID fetcher."""
    from app.config import settings
    from app.services.yahoo_sync import get_game_id_map as _get
    return _get(start_year=settings.league_start_year)


def fetch_user_leagues(game_keys: list[int], access_token: str) -> dict:
    import requests

    keys_str = ",".join(str(k) for k in game_keys)
    url = f"{YAHOO_API}/users;use_login=1/games;game_keys={keys_str}/leagues"
    resp = requests.get(
        url,
        headers={"Authorization": f"Bearer {access_token}"},
        params={"format": "json"},
    )
    if resp.status_code != 200:
        print(f"ERROR: Yahoo API returned {resp.status_code}: {resp.text[:500]}")
        sys.exit(1)
    return resp.json()


def parse_league_ids(data: dict, game_id_map: dict[int, int]) -> dict[int, str]:
    """
    Parse the nested Yahoo response to extract {year: league_id}.
    Yahoo's structure: fantasy_content.users.0.user[1].games.N.game = [game_info, {leagues: ...}]
    """
    # Build reverse map: game_id -> year
    gid_to_year = {v: k for k, v in game_id_map.items()}

    result = {}
    try:
        users = data["fantasy_content"]["users"]
        user = users["0"]["user"]
        # user is a list: [user_info_dict, {games: {...}}]
        games_wrapper = user[1]["games"]
    except (KeyError, IndexError, TypeError) as e:
        print(f"ERROR: Unexpected response structure: {e}")
        print(json.dumps(data, indent=2)[:2000])
        sys.exit(1)

    for i in range(games_wrapper.get("count", 0)):
        game_entry = games_wrapper.get(str(i), {}).get("game", [])
        if not game_entry or len(game_entry) < 2:
            continue

        game_info = game_entry[0]
        leagues_wrapper = game_entry[1].get("leagues", {})

        try:
            game_id = int(game_info["game_id"])
        except (KeyError, ValueError):
            continue

        year = gid_to_year.get(game_id)
        if year is None:
            continue

        # Grab the first league in this game (your league)
        league_count = leagues_wrapper.get("count", 0)
        if league_count == 0:
            print(f"  {year}: no leagues found (you may not have been in the league that year)")
            continue

        if league_count > 1:
            print(f"  {year}: {league_count} leagues found — picking the one matching your league name")

        from app.config import settings
        chosen_league_id = None
        chosen_name = None

        for j in range(league_count):
            league_data = leagues_wrapper.get(str(j), {}).get("league", [])
            if not league_data:
                continue
            league_info = league_data[0]
            league_id = str(league_info.get("league_id", ""))
            league_key = str(league_info.get("league_key", ""))
            name = league_info.get("name", "")

            # Prefer exact league_id match with settings.league_id if multiple
            if league_id == str(settings.league_id) or league_count == 1:
                chosen_league_id = league_id
                chosen_name = name
                break
            # Fallback: pick first
            if chosen_league_id is None:
                chosen_league_id = league_id
                chosen_name = name

        if chosen_league_id:
            result[year] = chosen_league_id
            print(f"  {year} (game_id={game_id}): league_id={chosen_league_id}  \"{chosen_name}\"")

    return result


def main():
    print("Fetching Yahoo game ID map...")
    game_id_map = get_game_id_map()
    print(f"Found {len(game_id_map)} seasons: {sorted(game_id_map.keys())}\n")

    access_token = get_access_token()

    game_keys = list(game_id_map.values())
    print(f"Querying Yahoo for your leagues across {len(game_keys)} seasons...")
    data = fetch_user_leagues(game_keys, access_token)

    print("\nLeague IDs found:")
    league_id_map = parse_league_ids(data, game_id_map)

    if not league_id_map:
        print("\nNo league IDs found. Check that your Yahoo account is a member of the league.")
        sys.exit(1)

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(LEAGUE_IDS_FILE, "w") as f:
        json.dump(league_id_map, f, indent=2)

    print(f"\nSaved {len(league_id_map)} league IDs to {LEAGUE_IDS_FILE}")
    print("\nYou can now run: python sync_runner.py")


if __name__ == "__main__":
    main()
