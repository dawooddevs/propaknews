import type { APIRoute } from 'astro';
import { publishedPosts, getSetting } from '../lib/db';

export const GET: APIRoute = ({ site }) => {
  const seo = getSetting('seo', {});
  const items = publishedPosts(30).map((p) => `<item>
<title><![CDATA[${p.title}]]></title>
<link>${new URL(`/news/${p.slug}/`, site).href}</link>
<guid>${new URL(`/news/${p.slug}/`, site).href}</guid>
<pubDate>${new Date(p.published_at.replace(' ', 'T') + 'Z').toUTCString()}</pubDate>
<description><![CDATA[${p.excerpt}]]></description>
</item>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>
<title>${seo.siteTitle || 'ProPak News'}</title><link>${site}</link><description>${seo.metaDescription || ''}</description>${items}
</channel></rss>`, { headers: { 'content-type': 'application/rss+xml' } });
};
