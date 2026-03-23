# Setup Guide

## Prerequisites
- Python 3.11+ — install from https://python.org (check "Add to PATH" during install)
- Node.js 20+ — install from https://nodejs.org

---

## Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate       # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env and fill in:
#   YAHOO_CLIENT_ID=...
#   YAHOO_CLIENT_SECRET=...
#   LEAGUE_ID=...  (the number in your Yahoo league URL)
#   LEAGUE_START_YEAR=2014  (first year your league ran)
```

### Get Yahoo Developer Credentials
1. Go to https://developer.yahoo.com/apps/create/
2. Create a new app
3. Set Application Domain to `localhost`
4. Under Permissions, enable **Fantasy Sports** (Read)
5. Copy the Client ID and Client Secret into `.env`

### Authenticate (one-time)
```bash
python scripts/auth_init.py
# A browser window will open — log in with your Yahoo account and authorize
# Token is saved to data/tokens.json
```

### Sync historical data
```bash
# First test with one recent season
python sync_runner.py --years 2023

# Then sync everything
python sync_runner.py
```

The initial sync of 10+ seasons takes 5–15 minutes.

### Start the API server
```bash
uvicorn app.main:app --reload
# API running at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Site running at http://localhost:5173
```

---

## Running both together

Open two terminals:

**Terminal 1 (backend):**
```bash
cd backend && venv\Scripts\activate && uvicorn app.main:app --reload
```

**Terminal 2 (frontend):**
```bash
cd frontend && npm run dev
```

Then open http://localhost:5173 in your browser.

---

## Re-syncing data

To pick up the current season mid-year:
```bash
python sync_runner.py --years 2025 --force
```

Or use the **Sync Data** page in the dashboard.
