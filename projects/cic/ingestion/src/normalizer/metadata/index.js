/**
 * projects/cic/ingestion/src/normalizer/metadata/index.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * Metadata Harmonization Subsystem Entrypoint
 */

import { harmonizeCoreMetadata } from './core.js';
import { harmonizeUrlMetadata } from './byType/url.js';
import { harmonizeHtmlMetadata } from './byType/html.js';
import { harmonizePdfMetadata } from './byType/pdf.js';
import { harmonizeImageMetadata } from './byType/image.js';
import { harmonizeAudioMetadata } from './byType/audio.js';
import { harmonizeVideoMetadata } from './byType/video.js';

/**
 * Harmonizes metadata for a Canonical Asset Envelope.
 * 
 * @param {Object} envelope - Canonical Asset Envelope
 * @returns {Promise<Object>} - Updated envelope
 */
export async function harmonizeMetadata(envelope) {
  // 1. Core harmonization (Type-agnostic)
  let updated = harmonizeCoreMetadata(envelope);

  // 2. Type-specific harmonization
  switch (updated.source.type) {
    case 'url':
      updated = harmonizeUrlMetadata(updated);
      break;
    case 'html':
      updated = harmonizeHtmlMetadata(updated);
      break;
    case 'pdf':
      updated = await harmonizePdfMetadata(updated);
      break;
    case 'image':
      updated = await harmonizeImageMetadata(updated);
      break;
    case 'audio':
      updated = await harmonizeAudioMetadata(updated);
      break;
    case 'video':
      updated = await harmonizeVideoMetadata(updated);
      break;
    case 'file':
      // Treat as generic, but could branch by MIME if needed
      break;
  }

  return updated;
}
