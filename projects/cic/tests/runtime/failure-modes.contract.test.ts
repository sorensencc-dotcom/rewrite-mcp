import { describe, it, expect } from "vitest";
import { handleFailure } from "../../src/runtime/failure-modes.js";

describe("Failure Modes Contract", () => {
  it("RRK failure halts RTK", () => {
    const result = handleFailure("RRK_FAILURE");
    expect(result.action).toBe("HALT_RTK");
  });

  it("RTK failure prevents CIC advancement", () => {
    const result = handleFailure("RTK_FAILURE");
    expect(result.action).toBe("BLOCK_SECTION_TRACKING");
  });

  it("CIC failure triggers git-ai drift detection", () => {
    const result = handleFailure("CIC_FAILURE");
    expect(result.action).toBe("RUN_GITAI_DRIFT_CHECK");
  });

  it("git-ai failure pauses RRK goal generation", () => {
    const result = handleFailure("GITAI_FAILURE");
    expect(result.action).toBe("PAUSE_RRK");
  });
});
