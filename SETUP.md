# Setup Guide

## Prerequisites

- Python 3.12+
- Node.js 20.19+ (or 22.12+)
- Yahoo Developer credentials with Fantasy Sports read access

## Local backend

From `backend/`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python scripts/migrate_database.py
python scripts/auth_init.py
python scripts/find_league_ids.py
python sync_runner.py
uvicorn app.main:app --reload
```

Edit `.env` before authentication. Runtime data is written to the repository's
ignored `data/` directory.

## Local frontend

From `frontend/`:

```powershell
npm ci
npm run dev
```

Open `http://localhost:5173/fantasy/`. Vite proxies API calls to the FastAPI
server on port 8000.

## Verification

```powershell
# backend/
python -m unittest discover -s tests -v

# frontend/
npm run generate:api
npm run build
npx playwright install chromium
npm run test:e2e
```

## Database changes and backups

The application no longer creates tables at API startup. Alembic is the schema
authority:

```powershell
python scripts/migrate_database.py
python scripts/backup_database.py
```

`migrate_database.py` recognizes databases created by older releases, verifies
that the complete legacy schema exists, stamps the initial revision, and then
upgrades normally. Backups are stored beside the SQLite database under
`backups/`; the newest 14 are retained by default.

Verify a backup before an incident, or restore it to a separate file:

```powershell
python scripts/restore_database.py ../data/backups/fantasy-<timestamp>.sqlite3
python scripts/restore_database.py ../data/backups/fantasy-<timestamp>.sqlite3 `
  --destination ../data/restored.db
```

For off-site copies, set `BACKUP_S3_BUCKET` plus standard AWS credentials in
the deployment environment. `BACKUP_S3_PREFIX` and
`BACKUP_S3_ENDPOINT_URL` support alternate prefixes and S3-compatible
providers. Uploads remain disabled unless a bucket is explicitly configured.

## Production

The Compose project runs the private FastAPI container behind Caddy. Configure
`.env.production`, then:

```bash
chmod +x deploy.sh
./deploy.sh
```

Deployment builds the image, backs up the mounted SQLite database, starts the
new application (which runs migrations), and waits for the public health check.
GitHub Actions accepts a `DROPLET_SSH_KEY` deploy secret and retains
`DROPLET_PASSWORD` as a migration fallback. After the key has been verified,
remove the password secret and its workflow input.

Useful commands:

```bash
docker compose exec app python scripts/auth_init.py
docker compose exec app python scripts/find_league_ids.py
docker compose exec app python sync_runner.py --years 2025 --force
docker compose logs -f app
```

Do not run `docker compose down -v` unless deletion of the database, Yahoo
tokens, league IDs, backups, and Caddy certificate state is intended.
