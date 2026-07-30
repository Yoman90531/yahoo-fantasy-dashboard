"""Canonical manager identity configuration."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any


MANAGER_CONFIG_PATH = Path(__file__).resolve().parents[1] / "resources" / "manager_overrides.json"


def _validated_string_map(value: Any, *, field: str) -> dict[str, str]:
    if not isinstance(value, dict):
        raise ValueError(f"Manager configuration '{field}' must be an object.")

    result: dict[str, str] = {}
    for key, mapped_value in value.items():
        if not isinstance(key, str) or not key.strip():
            raise ValueError(f"Manager configuration '{field}' contains an invalid GUID.")
        if not isinstance(mapped_value, str) or not mapped_value.strip():
            raise ValueError(
                f"Manager configuration '{field}' contains an invalid value for {key!r}."
            )
        result[key.strip()] = mapped_value.strip()
    return result


@lru_cache(maxsize=1)
def load_manager_configuration() -> tuple[dict[str, str], dict[str, str]]:
    """Load and validate canonical renames and GUID merges once per process."""
    with MANAGER_CONFIG_PATH.open(encoding="utf-8") as config_file:
        data = json.load(config_file)
    return (
        _validated_string_map(data.get("renames", {}), field="renames"),
        _validated_string_map(data.get("merges", {}), field="merges"),
    )


MANAGER_RENAMES, MANAGER_MERGES = load_manager_configuration()


def override_name_for_guid(guid: str) -> str | None:
    """Resolve exact GUIDs first, then a unique legacy truncated-GUID match."""
    if guid in MANAGER_RENAMES:
        return MANAGER_RENAMES[guid]

    matches = {
        name
        for configured_guid, name in MANAGER_RENAMES.items()
        if guid.startswith(configured_guid) or configured_guid.startswith(guid)
    }
    return next(iter(matches)) if len(matches) == 1 else None


def resolve_manager_name(guid: str, fallback: str) -> str:
    return override_name_for_guid(guid) or fallback
