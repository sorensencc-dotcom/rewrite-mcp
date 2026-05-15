/**
 * CIC Ingestion v1.0.0 — Ingestion Pipeline Entry
 */

import * as sources from "./sources/index.js";
import * as stages from "./stages/index.js";

/**
 * High-level ingestion entrypoint.
 *
 * @param {Object} options
 * @param {string} options.sourceType
 * @param {Object} options.sourceConfig
 */
export async function ingest(options) {
  const { sourceType, sourceConfig } = options;

  const raw = await sources.readFromSource(sourceType, sourceConfig);
  const validated = await stages.validate(raw);
  const normalized = await stages.normalize(validated);
  const jobId = await stages.enqueue(normalized);

  return { jobId };
}
