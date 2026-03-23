#!/bin/bash
set -euo pipefail

# --- Fantasy Dashboard Deploy Script ---
# Run this on your VPS after cloning the repo and editing .env.production.
# Usage: ./deploy.sh yourdomain.com your@email.com

DOMAIN="${1:?Usage: ./deploy.sh <domain> <email>}"
EMAIL="${2:?Usage: ./deploy.sh <domain> <email>}"

echo "==> Deploying Fantasy Dashboard to ${DOMAIN}"

# Check env file exists
if [ ! -f .env.production ]; then
    cp .env.production.example .env.production
    echo "==> Created .env.production — edit it with your Yahoo credentials, then re-run."
    exit 1
fi

# Step 1: Replace domain placeholder in nginx configs
sed -i "s/YOUR_DOMAIN/${DOMAIN}/g" nginx/default.conf
sed -i "s/YOUR_DOMAIN/${DOMAIN}/g" nginx/initial.conf

# Step 2: Start with HTTP-only nginx (initial.conf) to get SSL cert
echo "==> Starting services with HTTP-only config..."
cp nginx/default.conf nginx/default.conf.ssl   # save HTTPS config
cp nginx/initial.conf nginx/default.conf        # use HTTP-only for now
docker compose up -d --build

# Step 3: Obtain SSL certificate
echo "==> Requesting SSL certificate..."
docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    -d "${DOMAIN}"

# Step 4: Switch to HTTPS nginx config and restart
echo "==> Enabling HTTPS..."
cp nginx/default.conf.ssl nginx/default.conf
docker compose restart nginx

echo ""
echo "==> Live at https://${DOMAIN}"
echo ""
echo "To sync data:  docker compose exec app python sync_runner.py"
echo "To view logs:  docker compose logs -f app"
echo ""
echo "Add to crontab for auto SSL renewal:"
echo "  0 3 * * 1 cd $(pwd) && docker compose run --rm certbot renew && docker compose restart nginx"
