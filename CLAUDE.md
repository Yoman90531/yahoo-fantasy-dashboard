# Yahoo Fantasy Dashboard

Full-stack historical analytics for a Yahoo Fantasy Football league.

## Development commands

Backend commands run from `backend/`:

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python scripts/migrate_database.py
python -m unittest discover -s tests -v
uvicorn app.main:app --reload
```

Frontend commands run from `frontend/`:

```bash
npm ci
npm run dev
npm run build
```

## Operational commands

Run these from `backend/`:

```bash
python scripts/auth_init.py
python scripts/find_league_ids.py
python sync_runner.py --years 2025
python sync_runner.py
python scripts/backup_database.py
```

Historical sync is intentionally CLI-only. It validates credentials, migrates
the schema, creates a consistent SQLite backup, and acquires a single-flight
lock before contacting Yahoo.

## Architecture

- FastAPI and SQLAlchemy live in `backend/app/`.
- Alembic owns database schema changes in `backend/alembic/`.
- Pydantic response models are required for public data routes.
- Canonical manager names live only in
  `backend/app/resources/manager_overrides.json`.
- Statistical thresholds live in `shared/stat_rules.json`; backend matchup
  scopes and predicates live in `backend/app/services/stats/rules.py`.
- React server state is managed by TanStack Query through
  `frontend/src/hooks/useApi.ts`.
- Pages are lazy-loaded in `frontend/src/App.tsx`.
- Caddy is the production reverse proxy.

## Safety rules

- Create an Alembic revision for every model/schema change.
- Never restore a database by copying an active SQLite file; use the backup
  script or SQLite backup API.
- Do not re-add a public sync mutation endpoint.
- Do not run `docker compose down -v` unless deleting all persisted app and
  certificate data is intentional.
- Run backend tests and the frontend production build before merging.
