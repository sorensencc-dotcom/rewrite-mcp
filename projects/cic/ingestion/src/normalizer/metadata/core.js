/**
 * projects/cic/ingestion/src/normalizer/metadata/core.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * Core Metadata Harmonization (Type-Agnostic)
 */

/**
 * Harmonizes core technical metadata in the asset envelope.
 * 
 * @param {Object} envelope - Canonical Asset Envelope
 * @returns {Object} - Updated envelope
 */
export function harmonizeCoreMetadata(envelope) {
  const { source, content } = envelope;
  const metadata = content.metadata || {};
  const warnings = metadata.metadataWarnings || [];

  // 1. MIME Normalization
  const canonicalMimes = {
    'image/jpg': 'image/jpeg',
    'text/x-html': 'text/html',
    'application/x-pdf': 'application/pdf',
    'audio/mp3': 'audio/mpeg',
  };

  if (source.mime && canonicalMimes[source.mime]) {
    source.mime = canonicalMimes[source.mime];
  }

  // 2. Size Normalization
  const actualSize = _getContentLength(content.raw);
  if (source.sizeBytes === undefined || source.sizeBytes === null) {
    source.sizeBytes = actualSize;
  } else if (Math.abs(source.sizeBytes - actualSize) > 2) {
    warnings.push(`Size mismatch: source reported ${source.sizeBytes}, actual is ${actualSize}`);
  }

  // 3. Origin Normalization
  if (source.type === 'url' || source.type === 'html') {
    source.origin = _canonicalizeUrl(source.origin);
  } else if (!source.origin || source.origin === '') {
    source.origin = 'inline';
  }

  // 4. Timestamps
  if (source.createdAt || source.modifiedAt) {
    metadata.sourceTimestamps = {
      ...(source.createdAt && { createdAt: new Date(source.createdAt).toISOString() }),
      ...(source.modifiedAt && { modifiedAt: new Date(source.modifiedAt).toISOString() }),
    };
  }

  // Update envelope
  content.metadata = {
    ...metadata,
    metadataWarnings: warnings.length > 0 ? warnings : undefined,
  };

  return envelope;
}

function _getContentLength(raw) {
  if (typeof raw === 'string') return Buffer.byteLength(raw, 'utf8');
  if (Buffer.isBuffer(raw)) return raw.length;
  return 0;
}

function _canonicalizeUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    // Strip tracking params (common ones)
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
    trackingParams.forEach(param => url.searchParams.delete(param));
    
    // Normalize scheme and host
    url.protocol = url.protocol.toLowerCase();
    url.host = url.host.toLowerCase();
    
    return url.toString();
  } catch (err) {
    return urlStr; // Return as-is if not a valid URL
  }
}
