# Yahoo Fantasy Football Dashboard

A full-history analytics dashboard for a long-running Yahoo Fantasy Football
league. It turns season, matchup, playoff, projection, draft, and manager data
into an interactive record book with stat-backed insights.

## Highlights

- League and season history, all-time standings, rivalries, and weekly records
- Schedule luck, strength of schedule, scoring profiles, and league trends
- Playoff, consolation, streak, projection, and draft analysis
- Canonical manager identity across historical Yahoo GUIDs
- FastAPI/OpenAPI backend with validated response contracts
- React dashboard with cached server state and route-level code splitting
- Alembic migrations, online SQLite backups, sync locking, tests, and CI-gated
  deployment

## Stack

- Backend: Python, FastAPI, SQLAlchemy, Alembic, SQLite, YFPY
- Frontend: React, TypeScript, Vite, TanStack Query, Recharts, Tailwind CSS
- Production: Docker Compose, Caddy, GitHub Actions

Analytics are organized by domain under `backend/app/services/stats/`.
Shared query context plus draft, scoring-distribution, and margin analytics
live there now; `stats_engine.py` keeps the remaining domains and compatibility
exports. The frontend API boundary is generated from the checked-in OpenAPI
contract to catch backend/frontend drift in CI.

See [SETUP.md](SETUP.md) for local development and production instructions.
See [KEEPER_LAB.md](KEEPER_LAB.md) for Keeper Lab data imports and league configuration.
