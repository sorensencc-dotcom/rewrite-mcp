/**
 * projects/cic/ingestion/src/normalizer/metadata/region.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * Region Tagging Subsystem
 * Resolves the authoritative region for an asset based on origin and metadata.
 */

const REGION_REGISTRY = {
  'origin:internal': 'core',
  'origin:partner-a': 'emea',
  'origin:partner-b': 'us-east',
  'origin:archive': 'core',
  'domain:nytimes.com': 'us-east',
  'domain:bbc.co.uk': 'emea',
};

/**
 * Resolves the region for an asset.
 * 
 * @param {string} initialRegion - The initial region hint
 * @param {Object} envelope - The Canonical Asset Envelope (partially populated)
 * @returns {string} - Resolved region
 */
export function resolveRegion(initialRegion, envelope) {
  const { source, content } = envelope;
  const metadata = content.metadata || {};

  // 1. Check for specific origin mapping
  if (REGION_REGISTRY[`origin:${source.origin}`]) {
    return REGION_REGISTRY[`origin:${source.origin}`];
  }

  // 2. Check for domain mapping (for URLs)
  if (metadata.domain && REGION_REGISTRY[`domain:${metadata.domain}`]) {
    return REGION_REGISTRY[`domain:${metadata.domain}`];
  }

  // 3. Fallback to initial hint or 'global'
  return initialRegion || 'global';
}
