/**
 * CIC Ingestion v1.0.0 — Primary Queue
 * File: cic/ingestion/v1.0.0/queue/queue.js | Version: 1.0.1 | Date: 2026-05-15
 * Patched: ingestionJobSchema now enforced in validateJob
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

  for (const field of ingestionJobSchema.required) {
    if (job[field] === undefined || job[field] === null) {
      throw new Error(`INGESTION_QUEUE_INVALID_JOB: missing required field "${field}"`);
    }
  }

  if (ingestionJobSchema.additionalProperties === false) {
    const allowed = new Set(Object.keys(ingestionJobSchema.properties));
    for (const key of Object.keys(job)) {
      if (!allowed.has(key)) {
        throw new Error(`INGESTION_QUEUE_INVALID_JOB: disallowed field "${key}"`);
      }
    }
  }
}
