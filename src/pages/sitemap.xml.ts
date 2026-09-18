import type { APIRoute } from 'astro';
import { db } from '../lib/db';

export const GET: APIRoute = ({ site }) => {
  const rows = db.prepare("SELECT slug, type, updated_at FROM posts WHERE status='published'").all() as any[];
  const urls = rows.map((r) => {
    const loc = new URL(r.type === 'post' ? `/news/${r.slug}/` : `/${r.slug}/`, site).href;
    return `<url><loc>${loc}</loc><lastmod>${new Date(r.updated_at.replace(' ', 'T') + 'Z').toISOString()}</lastmod></url>`;
  }).join('');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${site}</loc></url>${urls}</urlset>`,
    { headers: { 'content-type': 'application/xml' } });
};
