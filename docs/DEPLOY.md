# Server setup — propaknews.com

Ubuntu 24.04, run as root on the VPS. If a command is "not found", export PATH
first (see CLAUDE.md).

## 1. Install the stack

    apt update
    apt install -y nginx certbot python3-certbot-nginx build-essential python3
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt install -y nodejs
    node --version   # expect v22.x

(build-essential/python3 are needed to compile better-sqlite3 and sharp.)

## 2. Get the code and set the admin password

    cd /var/www/propaknews
    git pull origin main
    cp .env.example .env
    nano .env      # set ADMIN_INITIAL_PASSWORD=<the login password you want>

## 3. First build

    npm ci
    npm run build
    chown -R www-data:www-data /var/www/propaknews

## 4. Run as a service

    ln -sf /var/www/propaknews/deploy/propaknews.service /etc/systemd/system/propaknews.service
    systemctl daemon-reload
    systemctl enable --now propaknews
    systemctl status propaknews          # active (running)
    curl -s 127.0.0.1:4321 | head -5     # prints HTML

First start creates data/propaknews.db (posts, users, settings) and seeds
10 dummy posts + Privacy/Terms/About/Contact pages. data/ and uploads/ are
NOT in git — they are the live content. Back them up (see below).

## 5. Enable the nginx site

    ln -sf /var/www/propaknews/deploy/nginx-propaknews.com.conf /etc/nginx/sites-available/propaknews.com
    ln -sf /etc/nginx/sites-available/propaknews.com /etc/nginx/sites-enabled/propaknews.com
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx

## 6. DNS (in Spaceship)

| Type | Host | Value |
|---|---|---|
| A | @ | VPS IP |
| A | www | VPS IP |

    dig propaknews.com +short    # must return the VPS IP before certbot

## 7. SSL

    certbot --nginx -d propaknews.com -d www.propaknews.com
    certbot renew --dry-run

## 8. Firewall

    ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable

## Admin panel

https://propaknews.com/admin — username `Dawood`, password from .env.
Change the password right away in SEO & Settings.

## Routine deploys (code changes)

    /var/www/propaknews/scripts/deploy.sh

Content (posts, media) needs no deploy — it's live the moment you hit
Publish in /admin.

## Backups — REQUIRED

All articles live in data/propaknews.db; all images in uploads/. Cron this
and copy the results off the VPS:

    tar -czf /root/backup-$(date +%F).tar.gz -C /var/www/propaknews data uploads .env
