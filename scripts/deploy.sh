#!/usr/bin/env bash
# Pull latest code, rebuild and restart. Run on the VPS as root.
#
# Safe to re-run. The build goes to dist.new and is swapped into place only
# after it succeeds, and the previous build is kept as dist.old so a failed
# health check can roll straight back to it.
set -euo pipefail

export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
SITE_DIR=/var/www/propaknews
HEALTH_URL=http://127.0.0.1:4321/
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

# Build into dist.new so a failure leaves the live dist/ untouched. Both the
# nginx alias and the systemd unit hardcode dist/, so the finished build has
# to end up back at that path.
echo "==> Building"
rm -rf dist.new
npm run build -- --outDir dist.new

echo "==> Swapping in the new build"
rm -rf dist.old
[[ -d dist ]] && mv dist dist.old
mv dist.new dist

# www-data only needs to WRITE the database and uploads. Code and dist/ stay
# root-owned and are readable by everyone; .env is read by systemd as root
# before it drops privileges, so it never needs to be readable by www-data.
echo "==> Fixing ownership of runtime data"
mkdir -p data uploads
chown -R www-data:www-data data uploads

echo "==> Restarting service"
systemctl restart propaknews

# systemd reports "active" the moment the process starts, which is before the
# server is listening — so poll the app itself rather than trusting the unit.
echo "==> Health check"
for i in $(seq 1 15); do
    if curl -fsS --max-time 3 "$HEALTH_URL" >/dev/null 2>&1; then
        echo "    OK after ${i}s"
        echo "==> Done. Live at https://propaknews.com"
        exit 0
    fi
    sleep 1
done

echo "ERROR: site did not respond on $HEALTH_URL after 15s — rolling back." >&2
systemctl --no-pager --lines=20 status propaknews >&2 || true
if [[ -d dist.old ]]; then
    rm -rf dist.failed && mv dist dist.failed
    mv dist.old dist
    systemctl restart propaknews
    echo "Rolled back to the previous build (failed build kept in dist.failed)." >&2
else
    echo "No previous build to roll back to." >&2
fi
exit 1
