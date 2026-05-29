import { describe, it, expect, vi } from "vitest";
import { submitIngestionJob } from "../../src/runtime/rtk-cic.js";
import { advanceSection } from "../../src/lib/section-tracking.js";

vi.mock("../../src/lib/section-tracking.js");

describe("RTK → CIC Contract", () => {
  it("accepts a valid ingestion job", async () => {
    const job = {
      job_id: "123",
      type: "image",
      source: "file://A.jpg",
      metadata: {}
    };

    const result = await submitIngestionJob(job);
    expect(result.ok).toBe(true);
  });

  it("rejects malformed ingestion jobs", async () => {
    const job = { type: "image" }; // missing fields
    const result = await submitIngestionJob(job);
    expect(result.ok).toBe(false);
  });

  it("advances section tracking only after validation", async () => {
    const job = {
      job_id: "123",
      type: "image",
      source: "file://A.jpg"
    };

    await submitIngestionJob(job);
    expect(advanceSection).toHaveBeenCalled();
  });
});
