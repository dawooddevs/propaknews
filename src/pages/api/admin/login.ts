import type { APIRoute } from 'astro';
import { login } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  const { username, password } = await request.json().catch(() => ({}));
  const token = login(String(username || ''), String(password || ''));
  if (!token) return new Response('{"error":"Wrong username or password."}', { status: 401, headers: { 'content-type': 'application/json' } });
  cookies.set('ppn_session', token, { path: '/', httpOnly: true, sameSite: 'lax',
    secure: new URL(request.url).protocol === 'https:', maxAge: 604800 });
  return new Response('{"ok":true}', { headers: { 'content-type': 'application/json' } });
};
