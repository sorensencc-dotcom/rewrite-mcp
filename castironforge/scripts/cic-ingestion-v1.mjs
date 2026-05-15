// scripts/manifests/cic-ingestion-v1.mjs

/**
 * CIC Ingestion Subsystem
 * Version: v1.0.0
 * Subsystem: ingestion
 * Layer: queue + pipeline + telemetry
 */

export const cicIngestionV1 = {
  // ─────────────────────────────
  // ROOT INDEX + README
  // ─────────────────────────────

  "cic/ingestion/v1.0.0/index.js": `\
/**
 * CIC Ingestion v1.0.0
 * Entry point for the ingestion subsystem.
 *
 * Exposes:
 *  - queue API
 *  - producer API
 *  - ingest pipeline
 *  - telemetry hooks
 */

import * as queue from "./queue/index.js";
import * as producer from "./producer/index.js";
import * as ingest from "./ingest/ingest.js";
import * as telemetry from "./telemetry/telemetry.js";

export const version = "1.0.0";

export {
  queue,
  producer,
  ingest,
  telemetry
};
`,

  "cic/ingestion/v1.0.0/README.md": `\
# CIC Ingestion v1.0.0

Semantic versioned ingestion subsystem for Castironforge CIC.

## Layout

- \`queue/\` — core queue, DLQ, drift, schemas, types
- \`producer/\` — job production API
- \`ingest/\` — multi-stage ingestion pipeline
  - \`sources/\` — file, URL, drive sources
  - \`stages/\` — validate, normalize, enqueue
- \`telemetry/\` — telemetry, metrics, events
- \`tests/\` — queue and schema tests

## Invariants

- All public APIs are pure or idempotent where possible.
- All queue operations are explicit and typed.
- All telemetry calls are non-blocking and best-effort.
`,

  // ─────────────────────────────
  // QUEUE LAYER
  // ─────────────────────────────

  "cic/ingestion/v1.0.0/queue/index.js": `\
/**
 * CIC Ingestion v1.0.0 — Queue Index
 */

export * from "./queue.js";
export * from "./dlq.js";
export * from "./drift.js";
export * from "./schemas.js";
export * from "./types.js";
`,

  "cic/ingestion/v1.0.0/queue/types.js": `\
/**
 * CIC Ingestion v1.0.0 — Queue Types
 */

/**
 * @typedef {Object} IngestionJob
 * @property {string} id
 * @property {string} sourceType
 * @property {string} payloadType
 * @property {Object} payload
 * @property {Object} [metadata]
 */

/**
 * @typedef {Object} QueueConfig
 * @property {number} maxRetries
 * @property {number} visibilityTimeoutMs
 * @property {number} retentionMs
 */
`,

  "cic/ingestion/v1.0.0/queue/schemas.js": `\
/**
 * CIC Ingestion v1.0.0 — Queue Schemas
 */

export const ingestionJobSchema = {
  type: "object",
  required: ["id", "sourceType", "payloadType", "payload"],
  properties: {
    id: { type: "string" },
    sourceType: { type: "string" },
    payloadType: { type: "string" },
    payload: { type: "object" },
    metadata: { type: "object" }
  },
  additionalProperties: false
};
`,

  "cic/ingestion/v1.0.0/queue/queue.js": `\
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
`,

  "cic/ingestion/v1.0.0/queue/dlq.js": `\
/**
 * CIC Ingestion v1.0.0 — Dead Letter Queue
 */

const _dlq = [];

/**
 * @param {Object} job
 * @param {Error} error
 */
export function sendToDlq(job, error) {
  _dlq.push({
    job,
    errorMessage: error?.message || "Unknown error",
    failedAt: Date.now()
  });
}

export function listDlq() {
  return [..._dlq];
}
`,

  "cic/ingestion/v1.0.0/queue/drift.js": `\
/**
 * CIC Ingestion v1.0.0 — Drift Tracking
 */

const _driftEvents = [];

/**
 * @param {Object} job
 * @param {string} reason
 */
export function recordDrift(job, reason) {
  _driftEvents.push({
    jobId: job?.id || null,
    reason,
    recordedAt: Date.now()
  });
}

export function listDrift() {
  return [..._driftEvents];
}
`,

  // ─────────────────────────────
  // PRODUCER
  // ─────────────────────────────

  "cic/ingestion/v1.0.0/producer/index.js": `\
/**
 * CIC Ingestion v1.0.0 — Producer Index
 */

export * from "./addJob.js";
`,

  "cic/ingestion/v1.0.0/producer/addJob.js": `\
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
`,

  // ─────────────────────────────
  // INGESTION PIPELINE
  // ─────────────────────────────

  "cic/ingestion/v1.0.0/ingest/ingest.js": `\
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
`,

  "cic/ingestion/v1.0.0/ingest/sources/index.js": `\
/**
 * CIC Ingestion v1.0.0 — Sources Index
 */

import { readFileSource } from "./file.js";
import { readUrlSource } from "./url.js";
import { readDriveSource } from "./drive.js";

export async function readFromSource(sourceType, sourceConfig) {
  switch (sourceType) {
    case "file":
      return readFileSource(sourceConfig);
    case "url":
      return readUrlSource(sourceConfig);
    case "drive":
      return readDriveSource(sourceConfig);
    default:
      throw new Error(\`INGESTION_UNKNOWN_SOURCE_TYPE: \${sourceType}\`);
  }
}
`,

  "cic/ingestion/v1.0.0/ingest/sources/file.js": `\
/**
 * CIC Ingestion v1.0.0 — File Source
 */

export async function readFileSource(config) {
  // Placeholder: integrate real filesystem or blob storage.
  return {
    sourceType: "file",
    path: config?.path || null,
    payload: config?.payload || null
  };
}
`,

  "cic/ingestion/v1.0.0/ingest/sources/url.js": `\
/**
 * CIC Ingestion v1.0.0 — URL Source
 */

export async function readUrlSource(config) {
  // Placeholder: integrate real HTTP client.
  return {
    sourceType: "url",
    url: config?.url || null,
    payload: config?.payload || null
  };
}
`,

  "cic/ingestion/v1.0.0/ingest/sources/drive.js": `\
/**
 * CIC Ingestion v1.0.0 — Drive Source
 */

export async function readDriveSource(config) {
  // Placeholder: integrate Google Drive / OneDrive / S3, etc.
  return {
    sourceType: "drive",
    location: config?.location || null,
    payload: config?.payload || null
  };
}
`,

  "cic/ingestion/v1.0.0/ingest/stages/index.js": `\
/**
 * CIC Ingestion v1.0.0 — Stages Index
 */

export { validate } from "./validate.js";
export { normalize } from "./normalize.js";
export { enqueue } from "./enqueue.js";
`,

  "cic/ingestion/v1.0.0/ingest/stages/validate.js": `\
/**
 * CIC Ingestion v1.0.0 — Validate Stage
 */

export async function validate(raw) {
  if (!raw) {
    throw new Error("INGESTION_VALIDATE_EMPTY_PAYLOAD");
  }
  return raw;
}
`,

  "cic/ingestion/v1.0.0/ingest/stages/normalize.js": `\
/**
 * CIC Ingestion v1.0.0 — Normalize Stage
 */

export async function normalize(validated) {
  return {
    id: validated.id || \`job-\${Date.now()}\`,
    sourceType: validated.sourceType || "unknown",
    payloadType: "generic",
    payload: validated.payload || {},
    metadata: {
      normalizedAt: Date.now()
    }
  };
}
`,

  "cic/ingestion/v1.0.0/ingest/stages/enqueue.js": `\
/**
 * CIC Ingestion v1.0.0 — Enqueue Stage
 */

import { enqueue as enqueueJob } from "../../queue/queue.js";

export async function enqueue(normalizedJob) {
  return enqueueJob(normalizedJob);
}
`,

  // ─────────────────────────────
  // TELEMETRY
  // ─────────────────────────────

  "cic/ingestion/v1.0.0/telemetry/telemetry.js": `\
/**
 * CIC Ingestion v1.0.0 — Telemetry Facade
 */

import { emitEvent } from "./events.js";
import { recordMetric } from "./metrics.js";

export function trackIngestionStart(context) {
  emitEvent("ingestion.start", context);
  recordMetric("ingestion.start.count", 1);
}

export function trackIngestionSuccess(context) {
  emitEvent("ingestion.success", context);
  recordMetric("ingestion.success.count", 1);
}

export function trackIngestionFailure(context) {
  emitEvent("ingestion.failure", context);
  recordMetric("ingestion.failure.count", 1);
}
`,

  "cic/ingestion/v1.0.0/telemetry/events.js": `\
/**
 * CIC Ingestion v1.0.0 — Events
 */

export function emitEvent(name, payload) {
  // Placeholder: integrate with real event bus / logger.
  void name;
  void payload;
}
`,

  "cic/ingestion/v1.0.0/telemetry/metrics.js": `\
/**
 * CIC Ingestion v1.0.0 — Metrics
 */

export function recordMetric(name, value, tags) {
  // Placeholder: integrate with metrics backend.
  void name;
  void value;
  void tags;
}
`,

  // ─────────────────────────────
  // TESTS (STUBS)
  // ─────────────────────────────

  "cic/ingestion/v1.0.0/tests/queue.basic.test.js": `\
/**
 * CIC Ingestion v1.0.0 — Queue Basic Tests (stub)
 */

import { enqueue, dequeue, size } from "../queue/queue.js";

export function testBasicEnqueueDequeue() {
  const id = enqueue({ id: "test-1", sourceType: "file", payloadType: "generic", payload: {} });
  if (!id) throw new Error("Expected job id");
  const job = dequeue();
  if (!job) throw new Error("Expected job");
  if (size() !== 0) throw new Error("Expected empty queue");
}
`,

  "cic/ingestion/v1.0.0/tests/queue.dlq.test.js": `\
/**
 * CIC Ingestion v1.0.0 — DLQ Tests (stub)
 */

import { sendToDlq, listDlq } from "../queue/dlq.js";

export function testDlq() {
  sendToDlq({ id: "bad-job" }, new Error("boom"));
  const items = listDlq();
  if (!items.length) throw new Error("Expected DLQ item");
}
`,

  "cic/ingestion/v1.0.0/tests/queue.drift.test.js": `\
/**
 * CIC Ingestion v1.0.0 — Drift Tests (stub)
 */

import { recordDrift, listDrift } from "../queue/drift.js";

export function testDrift() {
  recordDrift({ id: "job-1" }, "schema-mismatch");
  const items = listDrift();
  if (!items.length) throw new Error("Expected drift item");
}
`,

  "cic/ingestion/v1.0.0/tests/queue.schema.test.js": `\
/**
 * CIC Ingestion v1.0.0 — Schema Tests (stub)
 */

import { ingestionJobSchema } from "../queue/schemas.js";

export function testSchemaShape() {
  if (!ingestionJobSchema || ingestionJobSchema.type !== "object") {
    throw new Error("Expected ingestionJobSchema to be an object schema");
  }
}
`
};
