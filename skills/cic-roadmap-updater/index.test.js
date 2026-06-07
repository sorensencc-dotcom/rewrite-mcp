import { describe, it, expect } from "vitest";
import { updateRoadmap } from "./index.js";

describe("cic-roadmap-updater", () => {
  it("requires roadmap and progress", () => {
    expect(() => updateRoadmap({})).toThrow("roadmap is required");
  });

  it("calculates completion percentage", () => {
    const result = updateRoadmap({
      roadmap: {
        version: "1.0.0",
        phases: [{}, {}, {}]
      },
      progress: {
        completedPhases: [{}, {}]
      }
    });
    expect(result.percentComplete).toBeGreaterThan(50);
    expect(result.completedPhases).toBe(2);
  });

  it("suggests major version bump on completion", () => {
    const result = updateRoadmap({
      roadmap: {
        version: "1.0.0",
        phases: [{}, {}]
      },
      progress: {
        completedPhases: [{}, {}]
      }
    });
    expect(result.suggestedVersion).toBe("2.0.0");
    expect(result.recommendation).toBe("major_bump");
  });

  it("generates new roadmap entries", () => {
    const result = updateRoadmap({
      roadmap: { version: "1.0.0", phases: [] },
      progress: {
        completedPhases: [],
        newItems: [{ name: "New Feature", effort: "2 weeks" }]
      }
    });
    expect(result.newEntries.length).toBeGreaterThan(0);
    expect(result.newEntries[0].name).toBe("New Feature");
  });
});
