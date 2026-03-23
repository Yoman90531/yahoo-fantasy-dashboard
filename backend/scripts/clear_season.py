"""
Clears all data for a given season year so it can be re-synced cleanly.

Usage (from the backend/ directory):
    python scripts/clear_season.py 2018
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

if len(sys.argv) < 2:
    print("Usage: python scripts/clear_season.py <year>")
    sys.exit(1)

year = int(sys.argv[1])

from app.database import SessionLocal
from app.models.team import Team
from app.models.season import Season
from app.models.matchup import Matchup
from app.models.sync_log import SyncLog

db = SessionLocal()
s = db.query(Season).filter(Season.year == year).first()
if not s:
    print(f"Season {year} not found in DB.")
    sys.exit(1)

m = db.query(Matchup).filter(Matchup.season_id == s.id).delete()
t = db.query(Team).filter(Team.season_id == s.id).delete()
l = db.query(SyncLog).filter(SyncLog.season_year == year).delete()
db.commit()
print(f"Cleared {year}: {t} teams, {m} matchups, {l} sync logs deleted.")
db.close()
