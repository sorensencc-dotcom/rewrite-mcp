/**
 * CIC Ingestion v1.0.0 — Drift Tests (stub)
 */

import { recordDrift, listDrift } from "../queue/drift.js";

export function testDrift() {
  recordDrift({ id: "job-1" }, "schema-mismatch");
  const items = listDrift();
  if (!items.length) throw new Error("Expected drift item");
}
