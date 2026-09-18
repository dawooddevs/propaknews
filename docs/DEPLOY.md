# Server setup — propaknews.com

Ubuntu 24.04. Run as root on the VPS. If a command is "not found", export PATH
first (see CLAUDE.md).

## 1. Install the stack

    apt update
    apt install -y nginx mysql-server php8.3-fpm php8.3-mysql php8.3-curl \
        php8.3-gd php8.3-mbstring php8.3-xml php8.3-zip php8.3-intl \
        certbot python3-certbot-nginx

## 2. Create the database

    mysql -e "CREATE DATABASE propaknews CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    mysql -e "CREATE USER 'propak'@'localhost' IDENTIFIED BY 'USE-A-STRONG-PASSWORD';"
    mysql -e "GRANT ALL ON propaknews.* TO 'propak'@'localhost'; FLUSH PRIVILEGES;"

Store that password in `wp-config.php` only. Never commit it.

## 3. Install WordPress core

Core is not tracked in git — it is installed in place:

    cd /var/www/propaknews
    curl -O https://wordpress.org/latest.tar.gz
    tar -xzf latest.tar.gz --strip-components=1 wordpress/
    rm latest.tar.gz
    cp wp-config-sample.php wp-config.php

Edit `wp-config.php` with the DB name, user and password, then paste fresh salts
from https://api.wordpress.org/secret-key/1.1/salt/

    chown -R www-data:www-data /var/www/propaknews
    find /var/www/propaknews -type d -exec chmod 755 {} \;
    find /var/www/propaknews -type f -exec chmod 644 {} \;
    chmod 640 wp-config.php

## 4. Enable the nginx site

Symlink the repo copy so config stays version-controlled:

    ln -sf /var/www/propaknews/deploy/nginx/propaknews.com.conf \
           /etc/nginx/sites-available/propaknews.com
    ln -sf /etc/nginx/sites-available/propaknews.com \
           /etc/nginx/sites-enabled/propaknews.com
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx

## 5. DNS

Point both records at the VPS IP before requesting a certificate:

| Type | Host | Value |
|---|---|---|
| A | @ | VPS IP |
| A | www | VPS IP |

Verify before continuing — certbot fails if DNS has not propagated:

    dig propaknews.com +short
    dig www.propaknews.com +short

## 6. SSL

    certbot --nginx -d propaknews.com -d www.propaknews.com

Certbot edits the nginx config to add TLS and the HTTP->HTTPS redirect. Renewal
is automatic via systemd timer; confirm with `certbot renew --dry-run`.

## 7. Firewall

    ufw allow OpenSSH
    ufw allow 'Nginx Full'
    ufw enable

## Routine deploys

    /var/www/propaknews/scripts/deploy.sh

## Backups — not covered by git

Articles are in MySQL, media in `wp-content/uploads/`. Set up a cron job:

    mysqldump propaknews | gzip > /backups/propaknews-$(date +%F).sql.gz
    tar -czf /backups/uploads-$(date +%F).tar.gz wp-content/uploads

Copy them off the VPS — a backup on the same box is not a backup.
