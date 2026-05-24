/**
 * projects/cic/ingestion/src/normalizer/content/pdf.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * PDF Content Normalization
 */

export async function normalizePdf(envelope) {
  const { content } = envelope;
  
  // TODO: Implement PDF text/image extraction using a library
  // content.text = extractedText;
  // content.media.push({ type: 'image', data: buffer, metadata: { page, index } });

  return envelope;
}
