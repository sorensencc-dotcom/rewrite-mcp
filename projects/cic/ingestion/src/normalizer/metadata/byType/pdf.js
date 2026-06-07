/**
 * projects/cic/ingestion/src/normalizer/metadata/byType/pdf.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * PDF Metadata Harmonization
 */

export async function harmonizePdfMetadata(envelope) {
  const { content } = envelope;
  const metadata = content.metadata || {};

  // TODO: Use a library like pdf-parse or pdfjs-dist
  // For now, we stub it as we want to avoid new dependencies in this step
  // unless explicitly requested or available in workspace.

  content.metadata = metadata;
  return envelope;
}
