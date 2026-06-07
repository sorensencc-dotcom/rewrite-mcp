/**
 * projects/cic/ingestion/src/normalizer/metadata/byType/html.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * HTML Metadata Harmonization
 */

export function harmonizeHtmlMetadata(envelope) {
  const { content } = envelope;
  const metadata = content.metadata || {};
  const html = typeof content.raw === 'string' ? content.raw : content.raw.toString('utf8');

  // 1. Extract <title>
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  if (titleMatch) {
    metadata.title = titleMatch[1].trim();
  }

  // 2. Extract <html lang="...">
  const langMatch = html.match(/<html[^>]*lang=["']([^"']+)["']/i);
  if (langMatch) {
    metadata.language = langMatch[1].toLowerCase();
  }

  // 3. Set encoding
  metadata.encoding = 'utf-8';

  content.metadata = metadata;
  return envelope;
}
