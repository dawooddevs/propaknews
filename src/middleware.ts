import { defineMiddleware } from 'astro:middleware';
import { checkSession } from './lib/auth';

export const onRequest = defineMiddleware((ctx, next) => {
  const p = ctx.url.pathname;
  const isAdmin = p.startsWith('/admin') || p.startsWith('/api/admin');
  const isPublicAdmin = p === '/admin/login' || p === '/admin/login/' || p === '/api/admin/login';
  if (isAdmin && !isPublicAdmin && !checkSession(ctx.cookies.get('ppn_session')?.value)) {
    if (p.startsWith('/api/')) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    return ctx.redirect('/admin/login');
  }
  return next();
});
