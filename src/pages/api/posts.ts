import type { APIRoute } from 'astro';
import { publishedPosts } from '../../lib/db';

export const GET: APIRoute = ({ url }) => {
  const offset = Math.max(0, Number(url.searchParams.get('offset') || 0));
  const exclude = (url.searchParams.get('exclude') || '').split(',').map(Number).filter(Boolean);
  const posts = publishedPosts(12, offset, exclude).map((p) => ({
    slug: p.slug, title: p.title, featured_image: p.featured_image,
    date: new Date(p.published_at.replace(' ', 'T') + 'Z')
      .toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' }),
  }));
  return new Response(JSON.stringify(posts), { headers: { 'content-type': 'application/json' } });
};
