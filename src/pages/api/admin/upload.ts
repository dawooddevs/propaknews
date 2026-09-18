import type { APIRoute } from 'astro';
import path from 'node:path';
import sharp from 'sharp';
import { db, UPLOADS_DIR, slugify } from '../../../lib/db';

// Any uploaded image is converted to webp — nothing else ever reaches the site.
export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const out: any[] = [];
  for (const file of form.getAll('files')) {
    if (!(file instanceof File)) continue;
    const buf = Buffer.from(await file.arrayBuffer());
    const base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'image';
    const name = `${base}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.webp`;
    try {
      const img = sharp(buf, { animated: true }).rotate().resize({ width: 1600, withoutEnlargement: true });
      const info = await img.webp({ quality: 80 }).toFile(path.join(UPLOADS_DIR, name));
      const r = db.prepare('INSERT INTO media (filename, original_name, width, height, size) VALUES (?, ?, ?, ?, ?)')
        .run(name, file.name, info.width, info.height, info.size);
      out.push({ id: r.lastInsertRowid, url: `/uploads/${name}`, filename: name });
    } catch {
      out.push({ error: `Could not process ${file.name} (not an image?)` });
    }
  }
  return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json' } });
};

export const GET: APIRoute = ({ url }) => {
  const offset = Number(url.searchParams.get('offset') || 0);
  const rows = db.prepare('SELECT * FROM media ORDER BY id DESC LIMIT 40 OFFSET ?').all(offset);
  return new Response(JSON.stringify(rows), { headers: { 'content-type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request }) => {
  const { id } = await request.json();
  const row = db.prepare('SELECT filename FROM media WHERE id = ?').get(id) as any;
  if (row) {
    const fs = await import('node:fs');
    try { fs.unlinkSync(path.join(UPLOADS_DIR, row.filename)); } catch {}
  }
  db.prepare('DELETE FROM media WHERE id = ?').run(id);
  return new Response('{"ok":true}', { headers: { 'content-type': 'application/json' } });
};
