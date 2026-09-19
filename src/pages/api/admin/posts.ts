import type { APIRoute } from 'astro';
import { db, getPost, slugify } from '../../../lib/db';
import { clearCache } from '../../../lib/cache';

// list (infinite scroll + tabs + search)
export const GET: APIRoute = ({ url }) => {
  const type = url.searchParams.get('type') === 'page' ? 'page' : 'post';
  const tab = url.searchParams.get('tab') || 'all';
  const q = (url.searchParams.get('q') || '').trim();
  const offset = Math.max(0, Number(url.searchParams.get('offset') || 0));
  const where: string[] = ['type = @type'];
  const args: any = { type, offset };
  if (tab === 'all') where.push("status != 'trash'");
  else where.push('status = @tab'), (args.tab = tab);
  if (q) {
    if (/^\d+$/.test(q)) where.push('(id = @qid OR title LIKE @q)'), (args.qid = Number(q));
    else where.push('title LIKE @q');
    args.q = `%${q}%`;
  }
  const rows = db.prepare(
    `SELECT id, title, slug, category, status, published_at, featured_image FROM posts
     WHERE ${where.join(' AND ')} ORDER BY published_at DESC LIMIT 30 OFFSET @offset`).all(args);
  return new Response(JSON.stringify(rows), { headers: { 'content-type': 'application/json' } });
};

// create/update/status changes
export const POST: APIRoute = async ({ request }) => {
  const b = await request.json();
  const json = (x: any) => new Response(JSON.stringify(x), { headers: { 'content-type': 'application/json' } });

  if (b.action === 'status') {
    db.prepare("UPDATE posts SET status = ?, updated_at = datetime('now') WHERE id = ?").run(b.status, b.id);
    clearCache();
    return json({ ok: true });
  }
  if (b.action === 'delete') { // permanent, from trash
    db.prepare("DELETE FROM posts WHERE id = ? AND status = 'trash'").run(b.id);
    clearCache();
    return json({ ok: true });
  }

  const type = b.type === 'page' ? 'page' : 'post';
  let slug = slugify(b.slug || b.title || '');
  const clash = db.prepare('SELECT id FROM posts WHERE slug = ? AND id != ?').get(slug, b.id || 0);
  if (clash) slug = `${slug}-${Date.now() % 10000}`;
  const seo = JSON.stringify(b.seo || {});
  const published_at = (b.published_at || '').replace('T', ' ').slice(0, 19) || null;

  if (b.id) {
    db.prepare(
      `UPDATE posts SET title=@title, slug=@slug, excerpt=@excerpt, body=@body, category=@category,
       status=@status, featured_image=@featured_image, seo=@seo,
       published_at=COALESCE(@published_at, published_at), updated_at=datetime('now') WHERE id=@id`,
    ).run({ ...b, slug, seo, published_at });
    clearCache();
    return json({ ok: true, id: b.id, post: getPost(b.id) });
  }
  const r = db.prepare(
    `INSERT INTO posts (type, title, slug, excerpt, body, category, status, featured_image, published_at, seo)
     VALUES (@type, @title, @slug, @excerpt, @body, @category, @status, @featured_image, COALESCE(@published_at, datetime('now')), @seo)`,
  ).run({ type, title: b.title || '', slug, excerpt: b.excerpt || '', body: b.body || '',
          category: b.category || 'General', status: b.status || 'draft',
          featured_image: b.featured_image || '', published_at, seo });
  clearCache();
  return json({ ok: true, id: r.lastInsertRowid });
};
