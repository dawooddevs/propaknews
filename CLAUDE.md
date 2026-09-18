# propaknews.com — project conventions

WordPress news site. Audience is primarily in Pakistan.

## Environment
- Ubuntu 24.04, Nginx, PHP-FPM 8.3, MySQL/MariaDB
- Web root: `/var/www/propaknews`
- Repo: `git@github.com:dawooddevs/propaknews.git`

## Two Claudes work on this repo
One runs on the VPS (has shell access to the live server); one runs in a
sandboxed session (no network access to the VPS, but can read screenshots).

**Always `git pull` before starting work, and push when finished.**
Uncommitted work on the VPS is invisible to the other side and causes conflicts.

## Never commit
`wp-config.php`, `.env`, database dumps, `wp-content/uploads/`, any key or
password. These stay on the server. Check `.gitignore` before adding files.

## Server-side notes
- The Claude Code install on this VPS starts with an empty `$PATH`. If a command
  is "not found", export PATH first — the binary is almost certainly present.
- Nginx config is tracked in `deploy/nginx/` and symlinked into
  `/etc/nginx/sites-enabled/`. Edit the repo copy, not the live file.
- Always `nginx -t` before `systemctl reload nginx`.

## Backups are NOT covered by git
Articles live in MySQL; media in `wp-content/uploads/`. Both need a separate
backup routine. Do not assume the repo protects content.
