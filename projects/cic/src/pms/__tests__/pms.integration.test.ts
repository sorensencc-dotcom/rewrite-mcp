import { describe, test, expect } from "vitest";
import { PMSExecutor } from "../pms.executor";

describe("PMS Integration Tests", () => {
  test("PMS integrates with extractors", () => {
    const pms = new PMSExecutor();
    pms.initialize();

    const result = pms.execute("image_analysis_v1", {
      filename: "test.jpg",
      mime: "image/jpeg",
    });

    expect(result.prompt.resolved.length).toBeGreaterThan(0);
    expect(result.prompt.resolved).toContain("test.jpg");
    expect(result.prompt.resolved).toContain("image/jpeg");
  });
});
