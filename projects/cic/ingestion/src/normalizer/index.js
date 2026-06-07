/**
 * projects/cic/ingestion/src/normalizer/index.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * Normalizer Core (Deterministic Normalization Pipeline)
 * Implements the 8 stages of asset normalization.
 */

import { createEnvelope } from './model.js';
import { harmonizeMetadata } from './metadata/index.js';
import { normalizeContent } from './content/index.js';
import { resolveRegion } from './metadata/region.js';
import crypto from 'node:crypto';

// Stage 3 Local Cache for Deduplication
const dedupeCache = new Set();

/**
 * Normalizes an arbitrary input into a Canonical Asset Envelope.
 * 
 * @param {Object} input - Raw ingestion input
 * @param {Object} options - Ingestion options (region, tags, deps)
 * @returns {Promise<Object>} - Canonical Asset Envelope
 */
export async function normalize(input, options = {}) {
  const { region: initialRegion = 'global', tags = [], deps = {} } = options;

  // STAGE 1: Boundary Validation
  _validateInput(input);

  // STAGE 2: Canonical ID Assignment (handled by createEnvelope)
  // STAGE 3: Checksum + Dedupe
  const checksum = _computeChecksum(input.raw);
  const isDuplicate = await checkDuplicate(checksum);
  if (isDuplicate) {
    // In a real system, we might return the existing asset or throw a specific error
    // For now, we'll mark it in the envelope or just log it
    console.log(`[Normalizer] Duplicate detected for checksum: ${checksum}`);
  }

  // Create initial envelope for harmonization
  let envelope = createEnvelope({
    region: initialRegion,
    source: {
      type: input.type,
      origin: input.origin,
      mime: input.mime || 'application/octet-stream',
      sizeBytes: _getContentLength(input.raw),
      checksum,
    },
    content: {
      raw: input.raw,
      text: null,
      media: [],
      metadata: {},
    },
    tags,
  });

  // STAGE 4: Metadata Harmonization
  envelope = await harmonizeMetadata(envelope);

  // STAGE 5: Content Normalization
  envelope = await normalizeContent(envelope, deps);

  // STAGE 6: Text Normalization
  envelope.content.text = _normalizeText(envelope.content.text);

  // STAGE 7: Region Tagging
  envelope.region = resolveRegion(initialRegion, envelope);

  // STAGE 8: Final Envelope Assembly
  return envelope;
}

/**
 * Stage 3 Placeholder for Qdrant/Vector DB duplicate check.
 * @param {string} checksum 
 * @returns {Promise<boolean>}
 */
export async function checkDuplicate(checksum) {
  if (dedupeCache.has(checksum)) return true;
  // Stub: simulate Qdrant check
  // if (process.env.QDRANT_ENABLED) { ... }
  
  // For now, just add to local cache to prevent duplicates in the same session
  dedupeCache.add(checksum);
  return false;
}

function _validateInput(input) {
  if (!input.raw) throw new Error("NORMALIZATION_ERROR: Missing raw content");
  if (!input.type) throw new Error("NORMALIZATION_ERROR: Missing input type");
  if (!input.origin) throw new Error("NORMALIZATION_ERROR: Missing input origin");
}

function _computeChecksum(raw) {
  const data = typeof raw === 'string' ? raw : Buffer.from(raw);
  return crypto.createHash('sha256').update(data).digest('hex');
}

function _getContentLength(raw) {
  if (typeof raw === 'string') return Buffer.byteLength(raw, 'utf8');
  if (Buffer.isBuffer(raw)) return raw.length;
  return 0;
}

function _normalizeText(text) {
  if (!text) return null;
  return text
    .normalize('NFKC') // Unicode normalization
    .replace(/\s+/g, ' ') // Whitespace normalization
    .trim();
}
