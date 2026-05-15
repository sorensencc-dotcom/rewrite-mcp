/**
 * CIC Ingestion v1.0.0 — Primary Queue
 */

import { ingestionJobSchema } from "./schemas.js";

/**
 * In-memory queue implementation placeholder.
 * Replace with Redis/SQS/etc. in production.
 */

const _queue = [];

/**
 * @param {import("./types.js").IngestionJob} job
 */
export function enqueue(job) {
  validateJob(job);
  _queue.push({ ...job, enqueuedAt: Date.now() });
  return job.id;
}

export function dequeue() {
  return _queue.shift() || null;
}

export function size() {
  return _queue.length;
}

function validateJob(job) {
  if (!job || typeof job.id !== "string") {
    throw new Error("INGESTION_QUEUE_INVALID_JOB: job.id must be a string");
  }
  // Schema hook: integrate real validator here.
}
