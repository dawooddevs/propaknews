# propaknews.com — project conventions

News site for a Pakistan-focused audience.
Stack: Astro (SSR, Node adapter) + Sanity headless CMS + Nginx on Ubuntu 24.04.

## Environment
- Web root: /var/www/propaknews  ·  Node service on 127.0.0.1:4321 (systemd unit: propaknews)
- Repo: git@github.com:dawooddevs/propaknews.git
- Secrets live in /var/www/propaknews/.env (see .env.example). Never commit .env.

## Two Claudes work on this repo
One runs on the VPS (shell access to the live server); one runs in a sandboxed
session (no access to the VPS). **Always `git pull` before starting work and
push when finished.** Uncommitted work on the VPS is invisible to the other side.

## Architecture rules
- All CMS access goes through src/lib/cms.ts — never call Sanity from pages
  directly. Swapping CMS later must only touch that file.
- Nginx config and the systemd unit are tracked in deploy/ and symlinked into
  /etc. Edit the repo copy, then `nginx -t` / `systemctl daemon-reload`.
- Deploys on the VPS: scripts/deploy.sh (pull → npm ci → build → restart).

## Server-side notes
- The Claude Code install on this VPS starts with an empty $PATH. If a command
  is "not found", export PATH first — the binary is almost certainly present.
