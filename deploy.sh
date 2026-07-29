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

echo "==> Rebuilding the private dashboard service..."
docker compose down --remove-orphans
docker compose up -d --build

echo ""
echo "==> Dashboard is listening privately on 172.17.0.1:3001"
echo "==> Public URL: https://vibedan.duckdns.org/fantasy/"
echo ""
echo "To authenticate: docker compose exec app python scripts/auth_init.py"
echo "To find leagues: docker compose exec app python scripts/find_league_ids.py"
echo "To sync data:  docker compose exec app python sync_runner.py"
echo "To view logs:  docker compose logs -f app"
