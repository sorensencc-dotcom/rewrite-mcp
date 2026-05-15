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
