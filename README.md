# propaknews.com

Pakistan-focused news site. Astro SSR + Sanity CMS, served by Nginx on Ubuntu 24.04.

- Writers publish through the Sanity Studio admin panel; articles appear on the
  site immediately (no rebuild needed).
- `docs/DEPLOY.md` — server setup from scratch.
- `docs/SANITY.md` — connecting the CMS.
- `scripts/deploy.sh` — routine deploys on the VPS.

## Local dev

    npm install
    npm run dev

Without `SANITY_PROJECT_ID` set, the site shows placeholder content.
