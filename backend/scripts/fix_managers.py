"""
Apply manager name overrides and merges from data/manager_overrides.json.

Run this after any sync to clean up hidden managers and duplicate entries.

Usage (from the backend/ directory):
    python scripts/fix_managers.py          # preview changes
    python scripts/fix_managers.py --apply  # apply changes
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

DATA_DIR = Path(__file__).parent.parent.parent / "data"
OVERRIDES_FILE = DATA_DIR / "manager_overrides.json"


def load_overrides():
    if not OVERRIDES_FILE.exists():
        print(f"No overrides file found at {OVERRIDES_FILE}")
        sys.exit(1)
    with open(OVERRIDES_FILE) as f:
        data = json.load(f)
    return data.get("renames", {}), data.get("merges", {})


def main():
    apply = "--apply" in sys.argv

    from app.database import SessionLocal
    from app.models.manager import Manager
    from app.models.team import Team

    renames, merges = load_overrides()
    db = SessionLocal()

    try:
        # --- Renames ---
        print("\n=== Renames ===")
        for guid, new_name in renames.items():
            mgr = db.query(Manager).filter(Manager.yahoo_guid.startswith(guid)).first()
            if not mgr:
                print(f"  SKIP  {guid[:12]}... — not found in DB")
                continue
            if mgr.display_name == new_name:
                print(f"  OK    {guid[:12]}... already '{new_name}'")
                continue
            print(f"  {'APPLY' if apply else 'WOULD'} rename {guid[:12]}... '{mgr.display_name}' -> '{new_name}'")
            if apply:
                mgr.display_name = new_name

        # --- Merges ---
        print("\n=== Merges ===")
        for src_guid, dst_guid in merges.items():
            src = db.query(Manager).filter(Manager.yahoo_guid.startswith(src_guid)).first()
            dst = db.query(Manager).filter(Manager.yahoo_guid.startswith(dst_guid)).first()
            if not src:
                print(f"  SKIP  src {src_guid[:12]}... — not found")
                continue
            if not dst:
                print(f"  SKIP  dst {dst_guid[:12]}... — not found")
                continue
            team_count = db.query(Team).filter(Team.manager_id == src.id).count()
            print(f"  {'APPLY' if apply else 'WOULD'} merge '{src.display_name}' ({src_guid[:12]}..., {team_count} teams) -> '{dst.display_name}' ({dst_guid[:12]}...)")
            if apply:
                db.query(Team).filter(Team.manager_id == src.id).update({"manager_id": dst.id})
                db.delete(src)

        if apply:
            db.commit()
            print("\nDone. Changes applied.")
        else:
            print("\nDry run — pass --apply to apply changes.")

        # --- Current state ---
        print("\n=== All managers ===")
        managers = db.query(Manager).order_by(Manager.display_name).all()
        for m in managers:
            tc = db.query(Team).filter(Team.manager_id == m.id).count()
            print(f"  {m.id:3} {m.yahoo_guid[:16]}... {m.display_name:<20} {tc} teams")

    finally:
        db.close()


if __name__ == "__main__":
    main()
