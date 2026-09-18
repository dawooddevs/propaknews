// Single boundary between the site and the CMS.
// Swapping Sanity for another CMS later means changing only this file.
import { createClient } from '@sanity/client';

export interface Article {
  title: string;
  slug: string;
  excerpt: string;
  body: string;          // portable text rendered to HTML upstream, or plain HTML
  category: string;
  publishedAt: string;   // ISO date
  imageUrl?: string;
}

const projectId = import.meta.env.SANITY_PROJECT_ID;
const dataset = import.meta.env.SANITY_DATASET ?? 'production';

const client = projectId
  ? createClient({ projectId, dataset, apiVersion: '2025-01-01', useCdn: true })
  : null;

// Placeholder content so the site runs before the CMS is connected.
const SAMPLE: Article[] = [
  {
    title: 'Welcome to ProPak News',
    slug: 'welcome-to-propak-news',
    excerpt: 'The site is running. Connect Sanity to start publishing real articles.',
    body: '<p>This is placeholder content shown because no CMS is configured yet. Set <code>SANITY_PROJECT_ID</code> in the server environment to go live.</p>',
    category: 'General',
    publishedAt: new Date().toISOString(),
  },
];

const ARTICLE_FIELDS = `{
  title,
  "slug": slug.current,
  excerpt,
  "body": pt::text(body),
  "category": category->title,
  publishedAt,
  "imageUrl": mainImage.asset->url
}`;

export async function getLatestArticles(limit = 20): Promise<Article[]> {
  if (!client) return SAMPLE;
  return client.fetch(
    `*[_type == "article" && defined(slug.current) && publishedAt <= now()]
      | order(publishedAt desc) [0...$limit] ${ARTICLE_FIELDS}`,
    { limit },
  );
}

export async function getArticle(slug: string): Promise<Article | null> {
  if (!client) return SAMPLE.find((a) => a.slug === slug) ?? null;
  return client.fetch(
    `*[_type == "article" && slug.current == $slug][0] ${ARTICLE_FIELDS}`,
    { slug },
  );
}
