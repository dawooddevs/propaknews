#!/usr/bin/env bash
# Pull latest code, rebuild, restart. Run on the VPS as root.
set -euo pipefail

export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
SITE_DIR=/var/www/propaknews
cd "$SITE_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
    echo "ERROR: uncommitted changes on the server. Commit or stash first:" >&2
    git status --short >&2
    exit 1
fi

echo "==> Pulling latest"
git pull --ff-only origin main

echo "==> Installing dependencies"
npm ci

echo "==> Building"
npm run build

echo "==> Restarting service"
chown -R www-data:www-data "$SITE_DIR"
systemctl restart propaknews
systemctl --no-pager --lines=5 status propaknews

echo "==> Done. Live at https://propaknews.com"
