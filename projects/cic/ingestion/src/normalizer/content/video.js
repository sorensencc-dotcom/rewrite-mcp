/**
 * projects/cic/ingestion/src/normalizer/content/video.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * Video Content Normalization
 */

export async function normalizeVideo(envelope) {
  const { content } = envelope;

  // TODO: Extract keyframes using ffmpeg
  // content.media.push({ type: 'keyframe', data: buffer, metadata: { timestampSeconds } });

  content.text = null;
  return envelope;
}
