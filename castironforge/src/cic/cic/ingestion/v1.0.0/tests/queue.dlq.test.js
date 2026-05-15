/**
 * CIC Ingestion v1.0.0 — DLQ Tests (stub)
 */

import { sendToDlq, listDlq } from "../queue/dlq.js";

export function testDlq() {
  sendToDlq({ id: "bad-job" }, new Error("boom"));
  const items = listDlq();
  if (!items.length) throw new Error("Expected DLQ item");
}
