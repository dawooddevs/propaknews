import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { UPLOADS_DIR, getSetting } from '../lib/db';

// Browsers and crawlers request /favicon.ico regardless of <link> tags.
// Serve the uploaded 32px PNG (all browsers accept PNG bytes here).
export const GET: APIRoute = () => {
  const fav = getSetting('branding', {}).favicon;
  if (fav) {
    try {
      const buf = fs.readFileSync(path.join(UPLOADS_DIR, path.basename(fav)));
      return new Response(buf, { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' } });
    } catch {}
  }
  return new Response(null, { status: 404 });
};
