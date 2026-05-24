/**
 * projects/cic/ingestion/src/normalizer/content/url.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * URL Content Normalization
 */

import { normalizeHtml } from './html.js';

export async function normalizeUrl(envelope, fetcher) {
  const { source, content } = envelope;
  const url = content.metadata.url || source.origin;

  if (!fetcher) {
    const warnings = content.metadata.metadataWarnings || [];
    warnings.push('content-normalization: url: No fetcher provided');
    content.metadata.metadataWarnings = warnings;
    return envelope;
  }

  try {
    const { body, mime } = await fetcher.fetchUrl(url);
    
    content.raw = body;
    // Update MIME if it changed after fetch
    if (mime && mime !== source.mime) {
      source.mime = mime;
      // We could re-harmonize metadata here if needed
    }

    if (source.mime.includes('text/html') || source.mime.includes('application/xhtml+xml')) {
      return normalizeHtml(envelope);
    }
  } catch (err) {
    const warnings = content.metadata.metadataWarnings || [];
    warnings.push(`content-normalization: url: fetch failed: ${err.message}`);
    content.metadata.metadataWarnings = warnings;
  }

  return envelope;
}
