import type { APIRoute } from 'astro';
import { logout } from '../../../lib/auth';
export const POST: APIRoute = ({ cookies }) => {
  const t = cookies.get('ppn_session')?.value;
  if (t) logout(t);
  cookies.delete('ppn_session', { path: '/' });
  return new Response('{}', { headers: { 'content-type': 'application/json' } });
};
