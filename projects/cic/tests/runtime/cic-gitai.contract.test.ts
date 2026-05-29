import { describe, it, expect } from "vitest";
import { generateGovernanceDelta } from "../../src/runtime/cic-gitai.js";

describe("CIC → git-ai Contract", () => {
  it("emits valid governance deltas", () => {
    const delta = generateGovernanceDelta({
      system: "1.2.1",
      state: "1.3.1",
      roadmap: "2.6.1",
      changes: ["Added Qdrant provider"]
    });

    expect(delta).toMatchObject({
      system_version: "1.2.1",
      state_version: "1.3.1",
      roadmap_version: "2.6.1"
    });
  });

  it("rejects deltas missing required fields", () => {
    expect(() =>
      generateGovernanceDelta({ system: "1.2.1" })
    ).toThrow();
  });
});
