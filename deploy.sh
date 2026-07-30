#!/bin/bash
set -euo pipefail

# Run on the VibeDan VPS after cloning the repo and editing .env.production.
echo "==> Deploying Fantasy Dashboard"

# Check env file exists
if [ ! -f .env.production ]; then
    cp .env.production.example .env.production
    echo "==> Created .env.production — edit it with your Yahoo credentials, then re-run."
    exit 1
fi

echo "==> Building the dashboard..."
docker compose build app

echo "==> Backing up the current database..."
docker compose run --rm --no-deps app python scripts/backup_database.py

echo "==> Migrating the database..."
docker compose run --rm --no-deps app python scripts/migrate_database.py

echo "==> Starting the dashboard and site router..."
if ! docker compose up -d --remove-orphans; then
    docker compose logs --tail=200 app caddy
    exit 1
fi
docker compose up -d --force-recreate --no-deps caddy

echo "==> Waiting for the dashboard health check..."
for attempt in $(seq 1 30); do
    if curl -fsS https://vibedan.duckdns.org/fantasy/api/health; then
        echo ""
        break
    fi

    if [ "$attempt" -eq 30 ]; then
        docker compose logs --tail=100 app
        exit 1
    fi

    sleep 2
done

echo ""
echo "==> Dashboard and HTTPS router are healthy"
echo "==> Public URL: https://vibedan.duckdns.org/fantasy/"
echo ""
echo "To authenticate: docker compose exec app python scripts/auth_init.py"
echo "To find leagues: docker compose exec app python scripts/find_league_ids.py"
echo "To sync data:  docker compose exec app python sync_runner.py"
echo "To view logs:  docker compose logs -f app"
