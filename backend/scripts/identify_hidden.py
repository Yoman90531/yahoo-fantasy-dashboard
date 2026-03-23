"""
Shows each hidden manager's team history so you can identify who they are.

Usage (from the backend/ directory):
    python scripts/identify_hidden.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models.manager import Manager
from app.models.team import Team
from app.models.season import Season

db = SessionLocal()
hidden = db.query(Manager).filter(Manager.display_name.like('%hidden%')).all()

for m in hidden:
    print(f"\nGUID: {m.yahoo_guid}  (id={m.id})")
    teams = db.query(Team).filter(Team.manager_id == m.id).all()
    for t in teams:
        s = db.query(Season).filter(Season.id == t.season_id).first()
        print(f"  {s.year}  rank={t.final_rank}  W={t.wins} L={t.losses}  PF={t.points_for:.1f}  team='{t.team_name}'")

db.close()
