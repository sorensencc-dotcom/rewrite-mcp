import { describe, it, expect } from "vitest";
import { advanceSection, readSectionState } from "../../src/lib/section-tracking.js";

describe("Section Tracking Contract", () => {
  it("advances sections monotonically", () => {
    const state = { "0.1-A": "COMPLETE", "0.2": "PENDING" };
    const newState = advanceSection("0.2", state);

    expect(newState["0.2"]).toBe("COMPLETE");
  });

  it("rejects backward transitions", () => {
    const state = { "0.1-A": "COMPLETE", "0.2": "COMPLETE" };
    expect(() => advanceSection("0.1-A", state)).toThrow();
  });

  it("rejects unknown sections", () => {
    const state = { "0.1-A": "COMPLETE" };
    expect(() => advanceSection("0.9", state)).toThrow();
  });
});
