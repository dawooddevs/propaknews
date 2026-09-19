// Shared text helpers for article headers.

const stripTags = (html: string) =>
  html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'")
      .replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

/**
 * The standfirst shown under the headline. Uses the post's own excerpt when
 * set; otherwise falls back to the opening of the body, trimmed to ~20 words
 * so every post has one even if the writer left the field blank.
 */
export function excerptFor(post: { excerpt?: string; body?: string }, maxWords = 20): string {
  const own = (post.excerpt || '').trim();
  const text = own || stripTags(post.body || '');
  if (!text) return '';
  const words = text.split(' ');
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ').replace(/[,;:.]$/, '') + '…';
}

/** "N min read", at an average 200 words per minute. */
export function readingTime(body: string): string {
  const words = stripTags(body || '').split(' ').filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}
