import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR || path.resolve('data');
fs.mkdirSync(DATA_DIR, { recursive: true });
export const UPLOADS_DIR = process.env.UPLOADS_DIR || path.resolve('uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, 'propaknews.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  pass_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'post',          -- post | page
  title TEXT NOT NULL DEFAULT '',
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  status TEXT NOT NULL DEFAULT 'draft',       -- draft | published | trash
  featured_image TEXT NOT NULL DEFAULT '',
  published_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  seo TEXT NOT NULL DEFAULT '{}'              -- JSON: metaTitle, metaDesc, canonical, noindex, keywords[], ogTitle, ogDesc, ogImage, twitterCard
);
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY,
  filename TEXT NOT NULL,                     -- webp file in uploads/
  original_name TEXT NOT NULL DEFAULT '',
  width INTEGER, height INTEGER, size INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_posts_list ON posts (type, status, published_at DESC);
`);

export const getSetting = (key: string, fallback: any = null) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
  if (!row) return fallback;
  try { return JSON.parse(row.value); } catch { return fallback; }
};
export const setSetting = (key: string, value: any) =>
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, JSON.stringify(value));

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 96) || 'post';

export interface Post {
  id: number; type: string; title: string; slug: string; excerpt: string; body: string;
  category: string; status: string; featured_image: string;
  published_at: string; updated_at: string; seo: any;
}
const parse = (r: any): Post | null => r ? { ...r, seo: JSON.parse(r.seo || '{}') } : null;

export const getPost = (id: number) => parse(db.prepare('SELECT * FROM posts WHERE id = ?').get(id));
export const getPostBySlug = (slug: string, type = 'post') =>
  parse(db.prepare("SELECT * FROM posts WHERE slug = ? AND type = ? AND status = 'published'").get(slug, type));

export const publishedPosts = (limit: number, offset = 0, excludeIds: number[] = []): Post[] => {
  const notIn = excludeIds.length ? `AND id NOT IN (${excludeIds.map(() => '?').join(',')})` : '';
  return (db.prepare(
    `SELECT * FROM posts WHERE type = 'post' AND status = 'published' AND published_at <= datetime('now') ${notIn}
     ORDER BY published_at DESC LIMIT ? OFFSET ?`,
  ).all(...excludeIds, limit, offset) as any[]).map(parse) as Post[];
};

export const featuredPosts = (): Post[] => {
  const ids: number[] = getSetting('featured_order', []);
  const found = ids.map((id) => {
    const p = getPost(id);
    return p && p.status === 'published' ? p : null;
  }).filter(Boolean) as Post[];
  // Top up to 5 with latest posts if not enough are pinned
  if (found.length < 5) found.push(...publishedPosts(5 - found.length, 0, found.map((p) => p.id)));
  return found.slice(0, 5);
};

// ---------- seed ----------
function seed() {
  if ((db.prepare('SELECT COUNT(*) c FROM users').get() as any).c > 0) return;
  db.prepare('INSERT INTO users (username, email, pass_hash) VALUES (?, ?, ?)')
    .run('Dawood', 'dawood.dev@outlook.com', bcrypt.hashSync(process.env.ADMIN_INITIAL_PASSWORD || 'ChangeMe123!', 10));

  const cats = ['Business', 'Tech and Telecom', 'Education', 'Sports', 'General'];
  const seedPosts = [
    ['Govt Announces New Petrol Prices for the Fortnight', 'Fuel prices have been revised as global oil markets shift again, and here is what motorists now pay.'],
    ['State Bank Holds Policy Rate Steady', 'The central bank kept its benchmark rate unchanged for a third meeting, citing easing inflation and a steadier rupee.'],
    ['Pakistan Freelancers Cross New Export Milestone', 'IT remittances continued their steady climb this quarter as freelancing expands well beyond the major cities into smaller towns.'],
    ['New Motorway Section Opens to Traffic', 'The long-awaited section opened this week and cuts travel time between the two major cities by roughly two hours.'],
    ['Smartphone Assembly Hits Record Output', 'Local assembly plants have reported their highest quarterly output to date, easing import pressure and creating several thousand new jobs.'],
    ['HEC Announces Scholarship Programme for 2026', 'Applications open next month for undergraduate and graduate scholarships, with places reserved for students from underrepresented districts across the country.'],
    ['National Team Squad Announced for Upcoming Series', 'Selectors have named a squad mixing experienced campaigners with several uncapped young players ahead of next month tour.'],
    ['Solar Imports Surge as Households Go Off-Grid', 'Rooftop solar adoption is accelerating sharply as households respond to high electricity tariffs and increasingly unreliable grid supply.'],
    ['Karachi Green Line Adds New Routes', 'The bus rapid transit network is expanding again, with feeder routes now serving three additional districts across the city.'],
    ['Government Unveils Digital ID Upgrade', 'NADRA has rolled out an upgraded digital identity app that brings several government services onto phones for the first time.'],
  ];
  const ins = db.prepare(
    `INSERT INTO posts (type, title, slug, excerpt, body, category, status, featured_image, published_at, seo)
     VALUES ('post', ?, ?, ?, ?, ?, 'published', ?, datetime('now', ?), ?)`,
  );
  seedPosts.forEach(([title, excerpt], i) => {
    const body = `<p><strong>ISLAMABAD</strong> — Placeholder opening paragraph for this dummy article. The standfirst above is the post's excerpt, so the body deliberately does not repeat it.</p><p>This is placeholder article text so you can see the layout. Replace it from the admin panel at <code>/admin</code>. It demonstrates paragraphs, <a href="/">links</a> and general typography of the article page.</p><h2>Background</h2><p>More placeholder copy. Each dummy post has a different publish time so the Latest News ordering is visible, and enough words here to make the reading-time estimate meaningful.</p>`;
    ins.run(title, slugify(title), excerpt, body, cats[i % cats.length],
      `/uploads/seed-${(i % 5) + 1}.webp`, `-${i * 3 + 1} hours`,
      JSON.stringify({ keywords: ['pakistan news', 'propak news'] }));
  });

  const pages = [
    ['Privacy Policy', '<p>Draft privacy policy. Replace with your final policy before AdSense review.</p>'],
    ['Terms of Service', '<p>Draft terms of service.</p>'],
    ['About Us', '<p>ProPak News covers business, technology and national news from Pakistan.</p>'],
    ['Contact Us', '<p>Email: contact@propaknews.com</p>'],
  ];
  const insPage = db.prepare(
    "INSERT INTO posts (type, title, slug, excerpt, body, status) VALUES ('page', ?, ?, '', ?, 'published')");
  pages.forEach(([t, b]) => insPage.run(t, slugify(t), b));

  setSetting('featured_order', (db.prepare("SELECT id FROM posts WHERE type='post' ORDER BY published_at DESC LIMIT 5").all() as any[]).map((r) => r.id));
  setSetting('menu', [
    { label: 'Home', url: '/' },
    { label: 'Business', url: '/category/business/' },
    { label: 'Tech and Telecom', url: '/category/tech-and-telecom/' },
    { label: 'Education', url: '/category/education/' },
    { label: 'Sports', url: '/category/sports/' },
    { label: 'About', url: '/about-us/' },
    { label: 'Contact', url: '/contact-us/' },
  ]);
  setSetting('ticker', [
    { label: 'Petrol', value: 'Rs 268.50', change: '+1.2%', dir: 'up' },
    { label: 'Diesel', value: 'Rs 274.10', change: '-0.4%', dir: 'down' },
    { label: 'Gold (tola)', value: 'Rs 305,400', change: '+0.8%', dir: 'up' },
    { label: 'USD/PKR', value: '282.15', change: '-0.1%', dir: 'down' },
  ]);
  setSetting('seo', {
    siteTitle: 'ProPak News',
    tagline: 'Latest news from Pakistan',
    metaDescription: 'Business, technology and national news from Pakistan.',
    gaId: '', gscVerification: '', adsenseClient: '', adsenseAuto: false,
  });
}
seed();

// Generate placeholder featured images for seed posts if missing.
// Written to a temp file then renamed, so a concurrent import or an
// interrupted start can never leave a half-written (0-byte) image behind.
(async () => {
  try {
    const { default: sharp } = await import('sharp');
    const colors = ['#d64000', '#a00000', '#0a5c36', '#1d3557', '#6d3b00'];
    for (let i = 1; i <= 5; i++) {
      const f = path.join(UPLOADS_DIR, `seed-${i}.webp`);
      if (fs.existsSync(f) && fs.statSync(f).size > 0) continue;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675">
        <rect width="1200" height="675" fill="${colors[i - 1]}"/>
        <text x="600" y="360" font-family="Arial" font-size="72" font-weight="bold" fill="rgba(255,255,255,0.85)" text-anchor="middle">ProPak News</text>
      </svg>`;
      const tmp = `${f}.${process.pid}.tmp`;
      await sharp(Buffer.from(svg)).webp({ quality: 75 }).toFile(tmp);
      fs.renameSync(tmp, f);
    }
  } catch { /* placeholders are cosmetic */ }
})();
