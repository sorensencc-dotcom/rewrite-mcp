/**
 * projects/cic/ingestion/src/normalizer/model.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * Canonical Asset Model (Authoritative v1.0)
 * Wires the deterministic shape for all ingested objects in CIC.
 */

import crypto from 'node:crypto';

/**
 * @typedef {Object} CanonicalAssetSource
 * @property {"url"|"file"|"html"|"image"|"pdf"|"audio"|"video"} type
 * @property {string} origin
 * @property {string} mime
 * @property {number} sizeBytes
 * @property {string} checksum (sha256)
 */

/**
 * @typedef {Object} CanonicalAssetContent
 * @property {Buffer|string} raw
 * @property {string|null} text
 * @property {Array<Object>} media
 * @property {Object} metadata
 */

/**
 * @typedef {Object} CanonicalAsset
 * @property {string} id (ULID-compatible UUID)
 * @property {string} region
 * @property {string} receivedAt (ISO8601)
 * @property {CanonicalAssetSource} source
 * @property {CanonicalAssetContent} content
 * @property {string[]} tags
 * @property {string} version
 */

/**
 * Creates a new Canonical Asset Envelope with deterministic field ordering.
 * 
 * @param {Omit<CanonicalAsset, 'id'|'receivedAt'|'version'>} params
 * @returns {CanonicalAsset}
 */
export function createEnvelope({ region, source, content, tags = [] }) {
  // 1. id (ULID-compatible UUID for now)
  // 2. region
  // 3. receivedAt
  // 4. source
  // 5. content
  // 6. tags
  // 7. version

  const envelope = {
    id: crypto.randomUUID(), // TODO: Replace with ULID if dependency is approved
    region,
    receivedAt: new Date().toISOString(),
    source: {
      type: source.type,
      origin: source.origin,
      mime: source.mime,
      sizeBytes: source.sizeBytes,
      checksum: source.checksum,
    },
    content: {
      raw: content.raw,
      text: content.text || null,
      media: content.media || [],
      metadata: content.metadata || {},
    },
    tags,
    version: "1.0"
  };

  return envelope;
}

/**
 * Validates that an object conforms to the Canonical Asset Model.
 * 
 * @param {any} asset 
 * @returns {boolean}
 */
export function isCanonicalAsset(asset) {
  if (!asset || typeof asset !== 'object') return false;
  
  const requiredFields = ['id', 'region', 'receivedAt', 'source', 'content', 'tags', 'version'];
  if (!requiredFields.every(field => field in asset)) return false;

  if (asset.version !== "1.0") return false;

  return true;
}
