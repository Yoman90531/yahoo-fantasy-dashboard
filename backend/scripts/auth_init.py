"""
One-time OAuth setup script. Run this once to authenticate with Yahoo.
It will open a browser window for you to log in and authorize the app.

Usage (from the backend/ directory):
    python scripts/auth_init.py
"""
import base64
import json
import sys
import time
import webbrowser
from pathlib import Path
from urllib.parse import urlencode

import requests

# Allow imports from backend/app/
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings

DATA_DIR = Path(__file__).parent.parent.parent / "data"
ENV_FILE = DATA_DIR / ".env"
CALLBACK_URI = "https://localhost"

AUTHORIZE_URL = "https://api.login.yahoo.com/oauth2/request_auth"
TOKEN_URL = "https://api.login.yahoo.com/oauth2/get_token"


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Step 1: Build authorization URL
    params = {
        "client_id": settings.yahoo_client_id,
        "redirect_uri": CALLBACK_URI,
        "response_type": "code",
    }
    authorize_url = f"{AUTHORIZE_URL}?{urlencode(params)}"

    print("Opening browser for Yahoo authorization...")
    print(f"If the browser doesn't open, visit:\n  {authorize_url}\n")
    webbrowser.open(authorize_url)

    # Step 2: Get verifier code from user
    code = input("Paste the 'code' value from the redirect URL: ").strip()

    # Step 3: Exchange code for tokens
    credentials = base64.b64encode(
        f"{settings.yahoo_client_id}:{settings.yahoo_client_secret}".encode()
    ).decode()

    resp = requests.post(
        TOKEN_URL,
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data={
            "code": code,
            "redirect_uri": CALLBACK_URI,
            "grant_type": "authorization_code",
        },
    )

    print(f"\nYahoo response ({resp.status_code}):")
    try:
        data = resp.json()
        print(json.dumps(data, indent=2))
    except Exception:
        print(resp.text)
        sys.exit(1)

    if "access_token" not in data:
        print("\nToken exchange failed. See error above.")
        sys.exit(1)

    token_time = time.time()

    # Step 4: Save tokens to DATA_DIR/.env
    existing = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                k, _, v = line.partition("=")
                existing[k.strip()] = v.strip()

    existing.update({
        "YAHOO_ACCESS_TOKEN": data["access_token"],
        "YAHOO_REFRESH_TOKEN": data.get("refresh_token", ""),
        "YAHOO_TOKEN_TYPE": data.get("token_type", "bearer"),
        "YAHOO_TOKEN_TIME": str(token_time),
        "YAHOO_CONSUMER_KEY": settings.yahoo_client_id,
        "YAHOO_CONSUMER_SECRET": settings.yahoo_client_secret,
        "YAHOO_GUID": "",
    })

    with open(ENV_FILE, "w") as f:
        for k, v in existing.items():
            f.write(f"{k}={v}\n")

    print(f"\nTokens saved to {ENV_FILE}")

    # Step 5: Verify with a test API call
    print("Verifying with a test API call...")
    try:
        from yfpy.query import YahooFantasySportsQuery

        query = YahooFantasySportsQuery(
            league_id=settings.league_id,
            game_code="nfl",
            yahoo_consumer_key=settings.yahoo_client_id,
            yahoo_consumer_secret=settings.yahoo_client_secret,
            yahoo_access_token_json=json.dumps({
                "consumer_key": settings.yahoo_client_id,
                "consumer_secret": settings.yahoo_client_secret,
                "access_token": data["access_token"],
                "refresh_token": data.get("refresh_token", ""),
                "token_type": data.get("token_type", "bearer"),
                "token_time": token_time,
                "guid": "",
            }),
        )

        game_keys = query.get_all_yahoo_fantasy_game_keys()
        print(f"Success! Found {len(game_keys)} Yahoo game keys.")

        print("\nNFL seasons available:")
        for key in game_keys:
            season = getattr(key, "season", None)
            gid = getattr(key, "game_id", None)
            if season and int(season) >= settings.league_start_year:
                print(f"  {season} -> game_id {gid}")

    except Exception as e:
        print(f"Warning: test API call failed: {e}")
        print("Tokens were saved — try running sync_runner.py anyway.")

    print("\nDone!")


if __name__ == "__main__":
    main()
