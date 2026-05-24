/**
 * projects/cic/ingestion/src/normalizer/content/image.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * Image Content Normalization
 */

export async function normalizeImage(envelope) {
  const { content } = envelope;

  content.text = null;
  content.media = content.media || [];
  content.media.push({
    type: 'image',
    data: content.raw,
    metadata: {
      width: content.metadata?.width,
      height: content.metadata?.height,
    }
  });

  return envelope;
}
