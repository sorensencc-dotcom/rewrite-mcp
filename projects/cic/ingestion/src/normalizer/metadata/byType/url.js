/**
 * projects/cic/ingestion/src/normalizer/metadata/byType/url.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * URL Metadata Harmonization
 */

export function harmonizeUrlMetadata(envelope) {
  const { source, content } = envelope;
  const metadata = content.metadata || {};

  try {
    const url = new URL(source.origin);
    metadata.url = url.toString();
    metadata.domain = url.hostname.replace(/^www\./, '');
    metadata.scheme = url.protocol.replace(':', '');
  } catch (err) {
    const warnings = metadata.metadataWarnings || [];
    warnings.push(`Failed to parse URL: ${source.origin}`);
    metadata.metadataWarnings = warnings;
  }

  content.metadata = metadata;
  return envelope;
}
