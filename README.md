# propaknews.com

News site for a Pakistan-focused audience. WordPress on Ubuntu 24.04 + Nginx + PHP-FPM.

## What lives where

| Thing | Location | Tracked in git? |
|---|---|---|
| Custom theme / plugins | `wp-content/` | Yes |
| Nginx config | `deploy/nginx/` | Yes |
| Deploy script | `scripts/` | Yes |
| WordPress core | server only | No |
| `wp-config.php`, secrets | server only | **No** |
| Articles, media | MySQL + `wp-content/uploads/` | **No** — needs separate backup |

See `docs/DEPLOY.md` for server setup.
