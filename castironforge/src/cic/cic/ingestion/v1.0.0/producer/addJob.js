/**
 * CIC Ingestion v1.0.0 — Job Producer
 */

import { enqueue } from "../queue/queue.js";

/**
 * @param {import("../queue/types.js").IngestionJob} job
 */
export function addJob(job) {
  return enqueue(job);
}
