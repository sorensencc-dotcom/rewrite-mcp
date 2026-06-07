/**
 * projects/cic/ingestion/src/normalizer/metadata/byType/image.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * Image Metadata Harmonization
 */

export async function harmonizeImageMetadata(envelope) {
  const { content } = envelope;
  const metadata = content.metadata || {};

  // TODO: Use a library like 'sharp' or 'image-size'
  // For now, we stub it.

  content.metadata = metadata;
  return envelope;
}
