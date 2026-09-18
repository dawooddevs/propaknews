import type { APIRoute } from 'astro';
export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nDisallow: /admin\nDisallow: /api\n\nSitemap: ${new URL('/sitemap.xml', site).href}\n`,
    { headers: { 'content-type': 'text/plain' } });
