import { describe, it, expect } from "vitest";
import { validateIngestionJob, validateVectorPayload } from "../../src/runtime/data-contracts.js";

describe("Data Contract Validation", () => {
  it("validates ingestion job schema", () => {
    const job = {
      job_id: "123",
      type: "image",
      source: "file://A.jpg"
    };

    expect(validateIngestionJob(job).ok).toBe(true);
  });

  it("rejects invalid ingestion job schema", () => {
    const job = { type: "image" };
    expect(validateIngestionJob(job).ok).toBe(false);
  });

  it("validates vector payload schema", () => {
    const payload = {
      id: "file1",
      vector: [0.1, 0.2, 0.3],
      payload: { extractor: "ImageAnalyzerV2" }
    };

    expect(validateVectorPayload(payload).ok).toBe(true);
  });

  it("rejects invalid vector payload schema", () => {
    const payload = { id: "file1", vector: [] };
    expect(validateVectorPayload(payload).ok).toBe(false);
  });
});
