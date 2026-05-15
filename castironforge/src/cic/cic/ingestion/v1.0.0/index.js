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
