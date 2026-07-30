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

See [SETUP.md](SETUP.md) for local development and production instructions.
