import type { APIRoute } from 'astro';
import { getSetting, setSetting } from '../../../lib/db';
import { clearCache } from '../../../lib/cache';
import { changePassword } from '../../../lib/auth';

const ALLOWED = ['seo', 'menu', 'ticker', 'featured_order'];

export const POST: APIRoute = async ({ request }) => {
  const b = await request.json();
  const json = (x: any, s = 200) => new Response(JSON.stringify(x), { status: s, headers: { 'content-type': 'application/json' } });
  if (b.action === 'clear-cache') { clearCache(); return json({ ok: true }); }
  if (b.action === 'password') {
    if (!b.password || String(b.password).length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400);
    changePassword('Dawood', String(b.password));
    return json({ ok: true, relogin: true });
  }
  if (!ALLOWED.includes(b.key)) return json({ error: 'unknown setting' }, 400);
  setSetting(b.key, b.value);
  clearCache();
  return json({ ok: true });
};

export const GET: APIRoute = ({ url }) => {
  const key = url.searchParams.get('key') || '';
  if (!ALLOWED.includes(key)) return new Response('{"error":"unknown"}', { status: 400 });
  return new Response(JSON.stringify(getSetting(key, null)), { headers: { 'content-type': 'application/json' } });
};
