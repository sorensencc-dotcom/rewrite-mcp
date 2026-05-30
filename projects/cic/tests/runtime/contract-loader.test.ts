import { describe, it, expect } from "vitest";
import { loadRuntimeContract, requireContractVersion } from "../../../../src/runtime/contract-loader";

describe("Root Contract Loader", () => {
  it("loads the contract and extracts version", () => {
    const contract = loadRuntimeContract();
    expect(contract.path).toContain("CIC_AI_RUNTIME_CONTRACT.md");
    expect(contract.version).toBe("1.0.0");
    expect(contract.sections).toContain("**1. Purpose**");
    expect(contract.sections).toContain("**2. System Roles**");
  });

  it("enforces version requirements", () => {
    expect(() => requireContractVersion("1.0.0")).not.toThrow();
    expect(() => requireContractVersion("9.9.9")).toThrow(/version mismatch/);
  });
});
