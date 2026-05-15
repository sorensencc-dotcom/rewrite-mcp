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
