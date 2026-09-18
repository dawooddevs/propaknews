# Server setup — propaknews.com

Ubuntu 24.04, run as root on the VPS. If a command is "not found", export PATH
first (see CLAUDE.md).

## 1. Install the stack

    apt update
    apt install -y nginx certbot python3-certbot-nginx
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt install -y nodejs
    node --version   # expect v22.x

## 2. Get the code

The repo should already be cloned at /var/www/propaknews (deploy key setup done).

    cd /var/www/propaknews
    git pull origin main
    cp .env.example .env    # fill in Sanity values later (docs/SANITY.md)

## 3. First build

    npm ci
    npm run build
    chown -R www-data:www-data /var/www/propaknews

## 4. Run as a service

    ln -sf /var/www/propaknews/deploy/propaknews.service /etc/systemd/system/propaknews.service
    systemctl daemon-reload
    systemctl enable --now propaknews
    systemctl status propaknews          # should be active (running)
    curl -s 127.0.0.1:4321 | head -5     # should print HTML

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

Verify before requesting a certificate:

    dig propaknews.com +short
    dig www.propaknews.com +short

## 7. SSL

    certbot --nginx -d propaknews.com -d www.propaknews.com

Renewal is automatic; confirm with `certbot renew --dry-run`.

## 8. Firewall

    ufw allow OpenSSH
    ufw allow 'Nginx Full'
    ufw enable

## Routine deploys

    /var/www/propaknews/scripts/deploy.sh

## Backups

Content lives in Sanity's cloud (backed up by them; `sanity dataset export`
for your own copies). The repo covers all code. The VPS holds nothing unique
except .env — keep a copy of it somewhere safe.
