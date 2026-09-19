import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { UPLOADS_DIR, getSetting, setSetting } from '../../../lib/db';
import { clearCache } from '../../../lib/cache';

// Logo and favicon uploads. The logo is webp like every other image.
// Favicons are the one exception and are written as PNG: apple-touch-icon,
// /favicon.ico fallbacks and Google's search-result favicon crawler all
// expect PNG/ICO, and a webp favicon silently fails there.
const json = (x: any, s = 200) => new Response(JSON.stringify(x), { status: s, headers: { 'content-type': 'application/json' } });
const stamp = () => Date.now().toString(36);

function removeFiles(urls: (string | undefined)[]) {
  for (const u of urls) {
    if (!u || !u.startsWith('/uploads/branding-')) continue;
    try { fs.unlinkSync(path.join(UPLOADS_DIR, path.basename(u))); } catch {}
  }
}

export const POST: APIRoute = async ({ request }) => {
  const ct = request.headers.get('content-type') || '';
  const brand = getSetting('branding', {});

  // JSON: display options or removal
  if (ct.includes('application/json')) {
    const b = await request.json();
    if (b.action === 'remove' && (b.kind === 'logo' || b.kind === 'favicon')) {
      if (b.kind === 'logo') { removeFiles([brand.logo]); delete brand.logo; delete brand.logoW; delete brand.logoH; }
      else { removeFiles([brand.favicon, brand.favicon180, brand.favicon512]); delete brand.favicon; delete brand.favicon180; delete brand.favicon512; }
    } else if (b.action === 'options') {
      const h = Number(b.logoHeight);
      brand.logoHeight = Number.isFinite(h) ? Math.min(120, Math.max(20, Math.round(h))) : 40;
      brand.showTitleWithLogo = !!b.showTitleWithLogo;
    } else return json({ error: 'unknown action' }, 400);
    setSetting('branding', brand); clearCache();
    return json({ ok: true, branding: brand });
  }

  const form = await request.formData();
  const kind = String(form.get('kind') || '');
  const file = form.get('file');
  if (!(file instanceof File) || !file.size) return json({ error: 'No file received.' }, 400);
  if (file.size > 8 * 1024 * 1024) return json({ error: 'File is larger than 8 MB.' }, 400);
  const buf = Buffer.from(await file.arrayBuffer());
  const v = stamp();

  try {
    if (kind === 'logo') {
      const name = `branding-logo-${v}.webp`;
      // SVG logos are rasterised at high density so they stay crisp at 2x.
      const info = await sharp(buf, { density: 300 }).rotate()
        .resize({ height: 240, width: 1200, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(UPLOADS_DIR, name));
      removeFiles([brand.logo]);
      Object.assign(brand, { logo: `/uploads/${name}`, logoW: info.width, logoH: info.height });
      brand.logoHeight ??= 40;
    } else if (kind === 'favicon') {
      const meta = await sharp(buf).metadata();
      if (!meta.width || !meta.height) throw new Error('not an image');
      const make = async (size: number) => {
        const name = `branding-favicon-${size}-${v}.png`;
        await sharp(buf, { density: 300 })
          .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png({ compressionLevel: 9 }).toFile(path.join(UPLOADS_DIR, name));
        return `/uploads/${name}`;
      };
      const [f32, f180, f512] = await Promise.all([make(32), make(180), make(512)]);
      removeFiles([brand.favicon, brand.favicon180, brand.favicon512]);
      Object.assign(brand, { favicon: f32, favicon180: f180, favicon512: f512 });
    } else return json({ error: 'kind must be logo or favicon' }, 400);
  } catch {
    return json({ error: `Could not process ${file.name} — upload a PNG, JPG, WebP or SVG image.` }, 400);
  }

  setSetting('branding', brand); clearCache();
  return json({ ok: true, branding: brand });
};
