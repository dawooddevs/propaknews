# propaknews.com

Pakistan-focused news site with a built-in CMS. Astro 5 SSR + SQLite + Nginx.

- Public site: Reuters-style layout, hero + 2×2 featured grid, Latest News, ticker bar, article pages with sidebar. Full SEO: meta/OG/Twitter/JSON-LD, sitemap, RSS, robots.
- Admin (`/admin`): posts & pages (drafts/trash, infinite scroll, search by title/ID), media library with automatic webp conversion, homepage drag-drop ordering, menu editor, ticker editor, GA/GSC/AdSense settings, cache clear.
- `docs/DEPLOY.md` — server setup. `scripts/deploy.sh` — routine code deploys.

## Local dev

    npm install
    ADMIN_INITIAL_PASSWORD=devpass123 npm run dev
