/**
 * CIC Ingestion v1.0.0 — Enqueue Stage
 */

import { enqueue as enqueueJob } from "../../queue/queue.js";

export async function enqueue(normalizedJob) {
  return enqueueJob(normalizedJob);
}
