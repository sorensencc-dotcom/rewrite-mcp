/**
 * projects/cic/ingestion/src/normalizer/content/audio.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * Audio Content Normalization
 */

export async function normalizeAudio(envelope) {
  const { content } = envelope;

  content.text = null;
  content.media = content.media || [];
  content.media.push({
    type: 'audio-segment',
    data: content.raw,
    metadata: {
      startSeconds: 0,
      endSeconds: content.metadata?.durationSeconds ?? null
    }
  });

  return envelope;
}
