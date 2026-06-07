/**
 * projects/cic/ingestion/src/normalizer/content/file.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * Generic File Content Normalization
 */

import { normalizeHtml } from './html.js';
import { normalizePdf } from './pdf.js';
import { normalizeImage } from './image.js';
import { normalizeAudio } from './audio.js';
import { normalizeVideo } from './video.js';

export async function normalizeFile(envelope) {
  const { source, content } = envelope;
  const mime = source.mime || '';

  if (mime.includes('text/html')) {
    return normalizeHtml(envelope);
  } else if (mime.includes('application/pdf')) {
    return normalizePdf(envelope);
  } else if (mime.startsWith('image/')) {
    return normalizeImage(envelope);
  } else if (mime.startsWith('audio/')) {
    return normalizeAudio(envelope);
  } else if (mime.startsWith('video/')) {
    return normalizeVideo(envelope);
  } else if (mime.startsWith('text/')) {
    content.text = typeof content.raw === 'string' ? content.raw : content.raw.toString('utf8');
    content.media = content.media || [];
  } else {
    const warnings = content.metadata.metadataWarnings || [];
    warnings.push(`content-normalization: file: Unrecognized MIME: ${mime}`);
    content.metadata.metadataWarnings = warnings;
  }

  return envelope;
}
