import json
from pathlib import Path


CANONICAL_MANAGER_RENAMES = {
    "BPHZFVHKP3ZTT4RB": "JK",
    "6MC5OCBN74EADFCF": "Brink",
    "QMQZLQNDDIYU7B76": "BFND",
    "VWOUQLXG6CXYN3ZLF7D2DOVRK4": "Lowell",
    "S5JYLEFLOBIKIP2TDI6CS26WZA": "Gottlieb",
    "BWP2TR2AM6UCK4O2SSB5QENMTA": "Dan",
    "GOGUB4NMXEO7JMGK4ORGST5T6U": "Karna",
    "55RLOFACMDZLSPWTEKYND5WLJ4": "Bennett",
    "6YACMFT7CNJGCBKVZZMEYUMMGM": "Himmel",
    "CFFTOVALCAGKZTO5CYUVZLQNXU": "Kang",
    "LY5H326U5L3SALUER4S4FAPPKY": "Sandy",
    "SMZJC5CPSCDSMMO2Z6ZTD4XEKE": "Michael",
}

_OVERRIDES_PATH = Path(__file__).resolve().parents[3] / "data" / "manager_overrides.json"


def _load_file_renames() -> dict[str, str]:
    try:
        with _OVERRIDES_PATH.open() as overrides_file:
            data = json.load(overrides_file)
        return data.get("renames", {})
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


MANAGER_RENAMES = {
    **_load_file_renames(),
    **CANONICAL_MANAGER_RENAMES,
}


def override_name_for_guid(guid: str) -> str | None:
    if guid in MANAGER_RENAMES:
        return MANAGER_RENAMES[guid]
    for prefix, name in MANAGER_RENAMES.items():
        if guid.startswith(prefix) or prefix.startswith(guid):
            return name
    return None


def resolve_manager_name(guid: str, fallback: str) -> str:
    return override_name_for_guid(guid) or fallback
