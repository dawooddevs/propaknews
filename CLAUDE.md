# propaknews.com — project conventions

News site for a Pakistan-focused audience, with its own custom CMS.
Stack: Astro 5 (SSR, Node adapter) + SQLite (better-sqlite3) + sharp + Nginx on Ubuntu 24.04.

## Environment
- Web root: /var/www/propaknews · Node service on 127.0.0.1:4321 (systemd unit: propaknews)
- Repo: git@github.com:dawooddevs/propaknews.git
- Live content is NOT in git: data/ (SQLite DB) and uploads/ (webp images) exist only on the VPS. Never delete them; they are the site.
- .env holds ADMIN_INITIAL_PASSWORD (used only on first run). Never commit .env.

## Two Claudes work on this repo
One runs on the VPS (shell access to the live server); one runs in a sandboxed
session (no access to the VPS). **Always `git pull` before starting work and
push when finished.**

## Architecture
- src/lib/db.ts — all DB access, schema, seed. src/lib/auth.ts — sessions. src/lib/cache.ts — in-memory cache.
- src/middleware.ts guards /admin and /api/admin (session cookie ppn_session).
- Admin UI: src/pages/admin/* + client scripts in public/admin-*.js. APIs: src/pages/api/admin/*.
- Every uploaded image is converted to webp by src/pages/api/admin/upload.ts. Never serve non-webp images.
- Homepage hero + 2×2 grid order = settings key `featured_order` (drag-drop in /admin/homepage). Latest News is ordered by published_at.
- astro.config.mjs security.allowedDomains must list every domain the site serves — a missing host breaks POST/upload requests with 403.
- Nginx config + systemd unit tracked in deploy/, symlinked into /etc. `nginx -t` before reload.
- Deploys: scripts/deploy.sh (pull → npm ci → build → restart). Content changes need no deploy.

## Server-side notes
- The Claude Code install on this VPS starts with an empty $PATH. Export PATH first if commands are "not found".
