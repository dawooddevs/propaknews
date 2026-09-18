#!/usr/bin/env bash
# Pull the latest code and reload services. Run on the VPS.
set -euo pipefail

export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
SITE_DIR=/var/www/propaknews

cd "$SITE_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
    echo "ERROR: uncommitted changes on the server. Commit or stash them first:" >&2
    git status --short >&2
    exit 1
fi

echo "==> Pulling latest"
git pull --ff-only origin main

echo "==> Fixing ownership"
chown -R www-data:www-data "$SITE_DIR/wp-content"

echo "==> Testing nginx config"
nginx -t

echo "==> Reloading"
systemctl reload nginx
systemctl reload php8.3-fpm

echo "==> Done. Live at https://propaknews.com"
