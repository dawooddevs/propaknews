# Connecting Sanity (the writers' admin panel)

## 1. Create the project (one time, in a browser)

1. Sign up at https://www.sanity.io (free plan is fine to start).
2. Create a new project named "ProPak News", dataset `production`.
3. Note the **Project ID** (shown in the project dashboard).

## 2. Point the site at it

On the VPS, edit /var/www/propaknews/.env:

    SANITY_PROJECT_ID=<your project id>
    SANITY_DATASET=production

Then `systemctl restart propaknews`.

## 3. Content model

The site expects documents of type `article` with fields:

| Field | Type |
|---|---|
| title | string |
| slug | slug (from title) |
| excerpt | text |
| body | array (block content) |
| category | reference → `category` (which has a `title` string) |
| mainImage | image |
| publishedAt | datetime |

The Studio (the admin UI where writers work) is a separate small app that
defines these schemas — scaffold it with `npm create sanity@latest`, add the
schemas above, and `sanity deploy` gives writers a hosted URL like
`propaknews.sanity.studio`. Ask Claude to generate the Studio when ready.

## 4. CORS

In the Sanity project dashboard, API → CORS origins, the site reads via the
public CDN with no token, so published content needs no CORS entry. Keep the
dataset **public** (default) — only published articles are readable.
