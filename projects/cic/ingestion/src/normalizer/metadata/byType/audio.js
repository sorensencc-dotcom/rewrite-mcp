/**
 * projects/cic/ingestion/src/normalizer/metadata/byType/audio.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * Audio Metadata Harmonization
 */

export async function harmonizeAudioMetadata(envelope) {
  const { content } = envelope;
  const metadata = content.metadata || {};

  // TODO: Use a library like 'music-metadata' or 'ffprobe'
  // For now, we stub it.

  content.metadata = metadata;
  return envelope;
}
