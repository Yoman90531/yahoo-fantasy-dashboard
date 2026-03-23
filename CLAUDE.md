# CLAUDE.md — Yahoo Fantasy Dashboard

## Project Overview

Full-stack app for analyzing multi-year Yahoo Fantasy Football league history. Python FastAPI backend syncs data from Yahoo Fantasy Sports API into SQLite; React/TypeScript frontend displays dashboards and analytics.

## Quick Start

Two terminals required:

```bash
# Terminal 1 — Backend (port 8000)
cd backend
venv/Scripts/activate        # Windows: venv\Scripts\activate
uvicorn app.main:app --reload

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

## Commands

### Frontend (`frontend/`)

| Command           | Description                        |
| ----------------- | ---------------------------------- |
| `npm install`     | Install dependencies               |
| `npm run dev`     | Dev server at http://localhost:5173 |
| `npm run build`   | Type-check (`tsc`) + Vite build    |
| `npm run preview` | Preview production build           |

### Backend (`backend/`)

| Command                                | Description                    |
| -------------------------------------- | ------------------------------ |
| `pip install -r requirements.txt`      | Install Python dependencies    |
| `python scripts/auth_init.py`          | One-time Yahoo OAuth setup     |
| `python sync_runner.py`                | Sync all seasons               |
| `python sync_runner.py --years 2023`   | Sync specific year(s)          |
| `uvicorn app.main:app --reload`        | Start API server               |

### Testing & Linting

No test framework or linter is currently configured. Type safety is enforced via `tsc` (run as part of `npm run build`).

## Project Structure

```
yahoo-fantasy-dashboard/
├── frontend/                    # React 18 + Vite + TypeScript
│   └── src/
│       ├── api/client.ts        # Axios API client (all backend calls)
│       ├── components/
│       │   ├── cards/           # StatCard, LoadingSpinner, ErrorMessage
│       │   ├── charts/          # Recharts wrappers (Line, Bar, Heatmap, Inflation)
│       │   ├── tables/          # AllTimeTable, StandingsTable
│       │   └── layout/          # Sidebar, PageWrapper
│       ├── hooks/useApi.ts      # Generic data-fetching hook (loading/error states)
│       ├── pages/               # Route components (Dashboard, AllTimeStats, etc.)
│       ├── store/index.ts       # Zustand store (seasons, managers, selectedYear)
│       ├── types/index.ts       # TypeScript interfaces (mirrors backend schemas)
│       ├── App.tsx              # React Router setup
│       └── main.tsx             # Entry point
├── backend/                     # FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, router mounting
│   │   ├── config.py            # Pydantic Settings (env vars)
│   │   ├── database.py          # SQLAlchemy engine + session
│   │   ├── models/              # ORM models (Season, Manager, Team, Matchup, SyncLog)
│   │   ├── schemas/             # Pydantic request/response models
│   │   ├── routers/             # API routes (/seasons, /managers, /stats, /sync)
│   │   ├── crud/                # DB query functions per entity
│   │   └── services/
│   │       ├── stats_engine.py  # Analytics computations (luck index, H2H, etc.)
│   │       └── yahoo_sync.py    # YFPY data sync with rate limiting
│   ├── scripts/auth_init.py     # OAuth credential setup
│   ├── sync_runner.py           # CLI sync entry point
│   └── requirements.txt
├── data/                        # Runtime data (not in git)
│   ├── fantasy.db               # SQLite database
│   ├── tokens.json              # Yahoo OAuth tokens
│   ├── league_ids.json          # League metadata
│   └── manager_overrides.json   # Custom manager settings
└── SETUP.md                     # Setup documentation
```

## Code Style Conventions

### Frontend (TypeScript/React)

- **TypeScript strict mode** enabled (`tsconfig.json`)
- Functional components with hooks only (no class components)
- Props interfaces for all exported components
- PascalCase file names matching component names
- `useApi` hook for all data fetching — returns `{ data, loading, error }`
- Zustand for global state; `useState` for local UI state
- Tailwind CSS utilities only (no CSS modules/files)
- Dark theme: gray-900/800/950 backgrounds, blue accent palette
- Responsive: mobile-first with Tailwind breakpoints (`md:`, `lg:`)

### Backend (Python/FastAPI)

- FastAPI routers organized by domain, all prefixed with `/api`
- SQLAlchemy 2.0 style with `Mapped[T]` type annotations
- Pydantic `BaseModel` for all API schemas
- CRUD layer separated from routers
- snake_case for all Python identifiers and DB columns
- Module-level logging via `logging.getLogger(__name__)`

## Architecture Notes

- **Manager identity**: Yahoo GUID is the stable identifier (team names change yearly)
- **Per-season API instances**: New YFPY query object per season (league_key is season-specific)
- **SQLite WAL mode**: Enables concurrent reads during sync + API operations
- **Vite proxy**: Frontend `/api` requests proxy to `localhost:8000` in dev
- **Rate limiting**: Yahoo API calls throttled at 0.5s intervals with 3-retry exponential backoff
- **No auth middleware**: App assumes local/trusted network access

## Environment Variables

Backend `.env` (in `backend/`):

```
YAHOO_CLIENT_ID=...
YAHOO_CLIENT_SECRET=...
LEAGUE_ID=112971
LEAGUE_START_YEAR=2012
DATABASE_URL=sqlite:///../data/fantasy.db
```

Frontend needs no env file — Vite proxies `/api` to the backend.
