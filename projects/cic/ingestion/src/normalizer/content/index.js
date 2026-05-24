/**
 * projects/cic/ingestion/src/normalizer/content/index.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * Content Normalization Subsystem Entrypoint
 */

import { normalizeUrl } from './url.js';
import { normalizeHtml } from './html.js';
import { normalizePdf } from './pdf.js';
import { normalizeImage } from './image.js';
import { normalizeAudio } from './audio.js';
import { normalizeVideo } from './video.js';
import { normalizeFile } from './file.js';

/**
 * Normalizes content for a Canonical Asset Envelope.
 * 
 * @param {Object} envelope - Canonical Asset Envelope
 * @param {Object} [deps] - Dependencies (e.g. fetcher)
 * @returns {Promise<Object>} - Updated envelope
 */
export async function normalizeContent(envelope, deps = {}) {
  const { fetcher } = deps;

  switch (envelope.source.type) {
    case 'url':
      return normalizeUrl(envelope, fetcher);
    case 'html':
      return normalizeHtml(envelope);
    case 'pdf':
      return normalizePdf(envelope);
    case 'image':
      return normalizeImage(envelope);
    case 'audio':
      return normalizeAudio(envelope);
    case 'video':
      return normalizeVideo(envelope);
    case 'file':
      return normalizeFile(envelope);
    default:
      const warnings = envelope.content.metadata.metadataWarnings || [];
      warnings.push(`content-normalization: Unknown source type: ${envelope.source.type}`);
      envelope.content.metadata.metadataWarnings = warnings;
      return envelope;
  }
}
