"""
Helpers for persisting and loading Yahoo OAuth tokens.
YFPY handles the actual refresh — we just need to persist the refreshed token
after each sync so the next run doesn't require re-authentication.
"""
import json
from pathlib import Path

TOKEN_PATH = Path(__file__).parent.parent.parent.parent / "data" / "tokens.json"


def save_token(token_dict: dict) -> None:
    TOKEN_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(TOKEN_PATH, "w") as f:
        json.dump(token_dict, f, indent=2)


def load_token() -> dict | None:
    if not TOKEN_PATH.exists():
        return None
    with open(TOKEN_PATH) as f:
        return json.load(f)


def token_exists() -> bool:
    return TOKEN_PATH.exists()
