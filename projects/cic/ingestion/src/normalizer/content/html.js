/**
 * projects/cic/ingestion/src/normalizer/content/html.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * HTML Content Normalization
 */

export async function normalizeHtml(envelope) {
  const { content } = envelope;
  const rawHtml = typeof content.raw === 'string' ? content.raw : content.raw.toString('utf8');

  // Simple "readability" algorithm (regex-based)
  // 1. Remove non-content tags
  let cleanHtml = rawHtml
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, '')
    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, '')
    .replace(/<nav\b[^>]*>([\s\S]*?)<\/nav>/gmi, '')
    .replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/gmi, '')
    .replace(/<header\b[^>]*>([\s\S]*?)<\/header>/gmi, '')
    .replace(/<aside\b[^>]*>([\s\S]*?)<\/aside>/gmi, '')
    .replace(/<!--([\s\S]*?)-->/g, '');

  // 2. Convert common block elements to double newlines
  let text = cleanHtml
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<h[1-6][^>]*>/gi, '\n\n# ')
    .replace(/<\/h[1-6]>/gi, '\n\n');

  // 3. Strip remaining tags
  text = text.replace(/<[^>]+>/g, '');

  // 4. Decode common entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

  content.text = text;
  content.media = content.media || [];

  return envelope;
}
