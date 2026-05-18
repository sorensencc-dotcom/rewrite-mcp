// filename: pipelines/sidecar.js
// date: 2026-05-16
// version: 1.0.0

/**
 * CIC v3.0 — Pipeline: sidecar
 *
 * Resolves and runs an extractor for a single asset job.
 * Dispatches by mimeType → extractor key → getExtractor() → extract().
 *
 * Supported dispatch map:
 *   image/jpeg, image/png, image/webp, image/gif  →  "image:v2"
 *
 * Failure contract:
 *   - Unknown mimeType: returns { status: 'unsupported', payload: null }
 *   - Extractor error: throws — caller (orchestrator or pipeline runner) is
 *     responsible for catching and routing to DLQ.
 *   - Zero silent failures: all branches are logged.
 */

import { getExtractor } from '../extractors/registry.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('pipeline.sidecar');

// ---------------------------------------------------------------------------
// MIME → extractor key dispatch map
// ---------------------------------------------------------------------------

const MIME_EXTRACTOR_MAP = {
  'image/jpeg': 'image:v2',
  'image/png':  'image:v2',
  'image/webp': 'image:v2',
  'image/gif':  'image:v2',
};

// ---------------------------------------------------------------------------
// resolveExtractorKey
// ---------------------------------------------------------------------------

/**
 * Maps a MIME type to the registered extractor key.
 *
 * @param {string} mimeType
 * @returns {string|null} - extractor key or null if unsupported
 */
function resolveExtractorKey(mimeType) {
  return MIME_EXTRACTOR_MAP[mimeType] ?? null;
}

// ---------------------------------------------------------------------------
// runSidecar
// ---------------------------------------------------------------------------

/**
 * Runs the sidecar extraction pipeline for a single asset job.
 *
 * @param {import('../analyzers/iExtractor.js').ExtractorJob} job
 * @returns {Promise<{
 *   status: 'ok' | 'unsupported',
 *   extractorKey: string | null,
 *   result: object | null
 * }>}
 * @throws {Error} if the resolved extractor throws (propagated to caller)
 */
export async function runSidecar(job) {
  const start = Date.now();

  log.info('start', {
    jobId: job.jobId,
    assetId: job.assetId,
    mimeType: job.mimeType,
  });

  const extractorKey = resolveExtractorKey(job.mimeType);

  if (!extractorKey) {
    log.warn('unsupported_mime', {
      jobId: job.jobId,
      mimeType: job.mimeType,
    });
    return { status: 'unsupported', extractorKey: null, result: null };
  }

  const extractor = getExtractor(extractorKey);

  if (!extractor) {
    // Registry gap — this is a hard system error, not a per-job error.
    throw new Error(
      `[sidecar] No extractor registered for key "${extractorKey}" (mimeType: ${job.mimeType})`
    );
  }

  log.info('dispatching', { jobId: job.jobId, extractorKey });

  const result = await extractor.extract(job);

  log.info('complete', {
    jobId: job.jobId,
    extractorKey,
    type: result.type,
    durationMs: Date.now() - start,
  });

  return { status: 'ok', extractorKey, result };
}
