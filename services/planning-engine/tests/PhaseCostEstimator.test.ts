/**
 * PhaseCostEstimator Test Suite
 *
 * Tests the phase cost classification logic, scoring determinism, and edge cases.
 * Covers low/medium/high classification, scoring determinism, and boundary conditions.
 */

describe("PhaseCostEstimator", () => {
  interface EstimationInput {
    name: string;
    baseLOC: number;
    complexity: "low" | "medium" | "high";
    dependencies: number;
    riskFactors: string[];
  }

  interface CostEstimate {
    classification: "low" | "medium" | "high";
    estimatedHours: number;
    confidenceScore: number;
    breakdown: {
      baseHours: number;
      complexityMultiplier: number;
      dependencyOverhead: number;
      riskMultiplier: number;
    };
  }

  class PhaseCostEstimator {
    private readonly baseHoursPerKLOC = 8;
    private readonly complexityMultipliers = {
      low: 1.0,
      medium: 1.5,
      high: 2.5,
    };
    private readonly riskMultipliers: Record<string, number> = {
      "new-domain": 1.3,
      "breaking-change": 1.5,
      "distributed-system": 1.8,
      "performance-critical": 1.4,
      "security-sensitive": 1.6,
      "high-uncertainty": 2.0,
    };

    estimate(input: EstimationInput): CostEstimate {
      const baseHours = (input.baseLOC / 1000) * this.baseHoursPerKLOC;
      const complexityMultiplier =
        this.complexityMultipliers[input.complexity];
      const dependencyOverhead = input.dependencies * 0.5;

      const applicableRisks = input.riskFactors.filter(
        (rf) => this.riskMultipliers[rf]
      );
      const riskMultiplier =
        applicableRisks.length > 0
          ? applicableRisks.reduce((acc, rf) => acc * this.riskMultipliers[rf], 1.0)
          : 1.0;

      const estimatedHours =
        baseHours * complexityMultiplier + dependencyOverhead * riskMultiplier;

      const confidenceScore = this.calculateConfidence(input);

      return {
        classification: this.classifyByCost(estimatedHours),
        estimatedHours: Math.round(estimatedHours * 10) / 10,
        confidenceScore,
        breakdown: {
          baseHours: Math.round(baseHours * 10) / 10,
          complexityMultiplier,
          dependencyOverhead: Math.round(dependencyOverhead * 10) / 10,
          riskMultiplier: Math.round(riskMultiplier * 100) / 100,
        },
      };
    }

    private calculateConfidence(input: EstimationInput): number {
      let confidence = 1.0;

      if (input.baseLOC < 500) confidence -= 0.1;
      if (input.complexity === "high") confidence -= 0.1;
      if (input.dependencies > 5) confidence -= 0.15;
      if (input.riskFactors.length > 2) confidence -= 0.2;

      return Math.max(0, Math.min(1, confidence));
    }

    private classifyByCost(hours: number): "low" | "medium" | "high" {
      if (hours <= 40) return "low";
      if (hours <= 120) return "medium";
      return "high";
    }
  }

  let estimator: PhaseCostEstimator;

  beforeEach(() => {
    estimator = new PhaseCostEstimator();
  });

  describe("classification logic", () => {
    test("classifies simple task as low cost", () => {
      const result = estimator.estimate({
        name: "simple-feature",
        baseLOC: 200,
        complexity: "low",
        dependencies: 0,
        riskFactors: [],
      });

      expect(result.classification).toBe("low");
      expect(result.estimatedHours).toBeLessThanOrEqual(40);
    });

    test("classifies moderate task as medium cost", () => {
      const result = estimator.estimate({
        name: "moderate-feature",
        baseLOC: 1500,
        complexity: "medium",
        dependencies: 2,
        riskFactors: [],
      });

      expect(result.classification).toBe("medium");
      expect(result.estimatedHours).toBeGreaterThan(40);
      expect(result.estimatedHours).toBeLessThanOrEqual(120);
    });

    test("classifies complex task as high cost", () => {
      const result = estimator.estimate({
        name: "complex-feature",
        baseLOC: 3000,
        complexity: "high",
        dependencies: 4,
        riskFactors: ["distributed-system"],
      });

      expect(result.classification).toBe("high");
      expect(result.estimatedHours).toBeGreaterThan(120);
    });

    test("classifies boundary case at 40 hours as low", () => {
      const result = estimator.estimate({
        name: "boundary-40",
        baseLOC: 500,
        complexity: "low",
        dependencies: 0,
        riskFactors: [],
      });

      expect(result.classification).toBe("low");
      expect(result.estimatedHours).toBeLessThanOrEqual(40);
    });

    test("classifies boundary case at 120 hours as medium", () => {
      const result = estimator.estimate({
        name: "boundary-120",
        baseLOC: 2250,
        complexity: "medium",
        dependencies: 0,
        riskFactors: [],
      });

      expect(result.classification).toBe("medium");
      expect(result.estimatedHours).toBeGreaterThanOrEqual(40);
      expect(result.estimatedHours).toBeLessThanOrEqual(120);
    });
  });

  describe("complexity multipliers", () => {
    const baselineInput: EstimationInput = {
      name: "baseline",
      baseLOC: 1000,
      complexity: "low",
      dependencies: 0,
      riskFactors: [],
    };

    test("applies 1.0x multiplier for low complexity", () => {
      const result = estimator.estimate(baselineInput);
      expect(result.breakdown.complexityMultiplier).toBe(1.0);
    });

    test("applies 1.5x multiplier for medium complexity", () => {
      const result = estimator.estimate({
        ...baselineInput,
        complexity: "medium",
      });
      expect(result.breakdown.complexityMultiplier).toBe(1.5);
    });

    test("applies 2.5x multiplier for high complexity", () => {
      const result = estimator.estimate({
        ...baselineInput,
        complexity: "high",
      });
      expect(result.breakdown.complexityMultiplier).toBe(2.5);
    });

    test("multipliers scale base hours correctly", () => {
      const low = estimator.estimate({
        ...baselineInput,
        complexity: "low",
      });
      const medium = estimator.estimate({
        ...baselineInput,
        complexity: "medium",
      });
      const high = estimator.estimate({
        ...baselineInput,
        complexity: "high",
      });

      expect(medium.estimatedHours / low.estimatedHours).toBeCloseTo(1.5, 1);
      expect(high.estimatedHours / low.estimatedHours).toBeCloseTo(2.5, 1);
    });
  });

  describe("dependency overhead", () => {
    const baselineInput: EstimationInput = {
      name: "baseline",
      baseLOC: 1000,
      complexity: "low",
      dependencies: 0,
      riskFactors: [],
    };

    test("adds 0.5 hours per dependency", () => {
      const noDeps = estimator.estimate(baselineInput);
      const oneDep = estimator.estimate({
        ...baselineInput,
        dependencies: 1,
      });
      const fiveDeps = estimator.estimate({
        ...baselineInput,
        dependencies: 5,
      });

      expect(oneDep.estimatedHours - noDeps.estimatedHours).toBeCloseTo(0.5, 1);
      expect(fiveDeps.estimatedHours - noDeps.estimatedHours).toBeCloseTo(2.5, 1);
    });

    test("dependency overhead breakdown is accurate", () => {
      const result = estimator.estimate({
        ...baselineInput,
        dependencies: 3,
      });

      expect(result.breakdown.dependencyOverhead).toBe(1.5);
    });
  });

  describe("risk factor multiplication", () => {
    const baselineInput: EstimationInput = {
      name: "baseline",
      baseLOC: 1000,
      complexity: "low",
      dependencies: 0,
      riskFactors: [],
    };

    test("applies new-domain risk multiplier (1.3x)", () => {
      const result = estimator.estimate({
        ...baselineInput,
        riskFactors: ["new-domain"],
      });

      expect(result.breakdown.riskMultiplier).toBe(1.3);
    });

    test("applies breaking-change risk multiplier (1.5x)", () => {
      const result = estimator.estimate({
        ...baselineInput,
        riskFactors: ["breaking-change"],
      });

      expect(result.breakdown.riskMultiplier).toBe(1.5);
    });

    test("applies distributed-system risk multiplier (1.8x)", () => {
      const result = estimator.estimate({
        ...baselineInput,
        riskFactors: ["distributed-system"],
      });

      expect(result.breakdown.riskMultiplier).toBe(1.8);
    });

    test("multiplies multiple risk factors together", () => {
      const result = estimator.estimate({
        ...baselineInput,
        riskFactors: ["breaking-change", "distributed-system"],
      });

      const expectedMultiplier = 1.5 * 1.8;
      expect(result.breakdown.riskMultiplier).toBeCloseTo(expectedMultiplier, 2);
    });

    test("ignores unknown risk factors", () => {
      const result = estimator.estimate({
        ...baselineInput,
        riskFactors: ["unknown-risk", "new-domain"],
      });

      expect(result.breakdown.riskMultiplier).toBe(1.3);
    });

    test("accumulates multiple risk factors (3-factor case)", () => {
      const result = estimator.estimate({
        ...baselineInput,
        riskFactors: [
          "performance-critical",
          "security-sensitive",
          "high-uncertainty",
        ],
      });

      const expectedMultiplier = 1.4 * 1.6 * 2.0;
      expect(result.breakdown.riskMultiplier).toBeCloseTo(expectedMultiplier, 2);
    });
  });

  describe("scoring determinism", () => {
    const input: EstimationInput = {
      name: "determinism-test",
      baseLOC: 2500,
      complexity: "high",
      dependencies: 3,
      riskFactors: ["distributed-system", "breaking-change"],
    };

    test("produces identical estimates across multiple calls", () => {
      const result1 = estimator.estimate(input);
      const result2 = estimator.estimate(input);
      const result3 = estimator.estimate(input);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    test("breakdown values are deterministic", () => {
      const result1 = estimator.estimate(input);
      const result2 = estimator.estimate(input);

      expect(result1.breakdown).toEqual(result2.breakdown);
    });

    test("confidence score is deterministic", () => {
      const result1 = estimator.estimate(input);
      const result2 = estimator.estimate(input);
      const result3 = estimator.estimate(input);

      expect(result1.confidenceScore).toBe(result2.confidenceScore);
      expect(result2.confidenceScore).toBe(result3.confidenceScore);
    });
  });

  describe("confidence scoring", () => {
    test("high confidence for well-defined, simple tasks", () => {
      const result = estimator.estimate({
        name: "high-confidence",
        baseLOC: 2000,
        complexity: "low",
        dependencies: 1,
        riskFactors: [],
      });

      expect(result.confidenceScore).toBeGreaterThan(0.7);
    });

    test("medium confidence for moderate tasks with some risk", () => {
      const result = estimator.estimate({
        name: "medium-confidence",
        baseLOC: 1000,
        complexity: "medium",
        dependencies: 3,
        riskFactors: ["new-domain"],
      });

      expect(result.confidenceScore).toBeLessThan(0.8);
      expect(result.confidenceScore).toBeGreaterThan(0.4);
    });

    test("low confidence for very high-risk tasks", () => {
      const result = estimator.estimate({
        name: "low-confidence",
        baseLOC: 300,
        complexity: "high",
        dependencies: 6,
        riskFactors: [
          "distributed-system",
          "performance-critical",
          "high-uncertainty",
        ],
      });

      expect(result.confidenceScore).toBeLessThan(0.5);
    });

    test("never produces negative confidence", () => {
      const result = estimator.estimate({
        name: "extreme-risk",
        baseLOC: 100,
        complexity: "high",
        dependencies: 10,
        riskFactors: [
          "high-uncertainty",
          "high-uncertainty",
          "high-uncertainty",
        ],
      });

      expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);
    });

    test("confidence decreases with small baseLOC", () => {
      const small = estimator.estimate({
        name: "small",
        baseLOC: 200,
        complexity: "low",
        dependencies: 0,
        riskFactors: [],
      });

      const large = estimator.estimate({
        name: "large",
        baseLOC: 5000,
        complexity: "low",
        dependencies: 0,
        riskFactors: [],
      });

      expect(small.confidenceScore).toBeLessThan(large.confidenceScore);
    });
  });

  describe("edge cases", () => {
    test("handles zero LOC gracefully", () => {
      const result = estimator.estimate({
        name: "zero-loc",
        baseLOC: 0,
        complexity: "low",
        dependencies: 0,
        riskFactors: [],
      });

      expect(result.estimatedHours).toBe(0);
      expect(result.classification).toBe("low");
    });

    test("handles very large LOC", () => {
      const result = estimator.estimate({
        name: "huge",
        baseLOC: 100000,
        complexity: "high",
        dependencies: 10,
        riskFactors: ["distributed-system", "performance-critical"],
      });

      expect(result.estimatedHours).toBeGreaterThan(1000);
      expect(result.classification).toBe("high");
    });

    test("handles many dependencies", () => {
      const result = estimator.estimate({
        name: "many-deps",
        baseLOC: 1000,
        complexity: "low",
        dependencies: 20,
        riskFactors: [],
      });

      expect(result.breakdown.dependencyOverhead).toBe(10);
      expect(result.estimatedHours).toBeGreaterThan(20);
    });

    test("handles empty risk factors array", () => {
      const result = estimator.estimate({
        name: "no-risks",
        baseLOC: 1000,
        complexity: "medium",
        dependencies: 1,
        riskFactors: [],
      });

      expect(result.breakdown.riskMultiplier).toBe(1.0);
    });

    test("handles only unknown risk factors", () => {
      const result = estimator.estimate({
        name: "unknown-risks",
        baseLOC: 1000,
        complexity: "medium",
        dependencies: 1,
        riskFactors: ["unknown1", "unknown2", "unknown3"],
      });

      expect(result.breakdown.riskMultiplier).toBe(1.0);
    });

    test("rounding produces consistent 1 decimal place", () => {
      const result = estimator.estimate({
        name: "rounding-test",
        baseLOC: 1337,
        complexity: "medium",
        dependencies: 3,
        riskFactors: ["new-domain"],
      });

      const hoursParts = result.estimatedHours.toString().split(".");
      if (hoursParts[1]) {
        expect(hoursParts[1].length).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("realistic phase scenarios", () => {
    test("estimates simple UI component phase", () => {
      const result = estimator.estimate({
        name: "ui-component",
        baseLOC: 800,
        complexity: "low",
        dependencies: 2,
        riskFactors: [],
      });

      expect(result.classification).toBe("low");
      expect(result.estimatedHours).toBeLessThan(30);
    });

    test("estimates data migration phase", () => {
      const result = estimator.estimate({
        name: "data-migration",
        baseLOC: 2000,
        complexity: "high",
        dependencies: 5,
        riskFactors: [
          "breaking-change",
          "distributed-system",
          "performance-critical",
        ],
      });

      expect(result.classification).toBe("high");
      expect(result.estimatedHours).toBeGreaterThan(100);
      expect(result.confidenceScore).toBeLessThan(0.7);
    });

    test("estimates new infrastructure service phase", () => {
      const result = estimator.estimate({
        name: "new-service",
        baseLOC: 3500,
        complexity: "high",
        dependencies: 3,
        riskFactors: ["new-domain", "distributed-system"],
      });

      expect(result.classification).toBe("high");
      expect(result.confidenceScore).toBeLessThan(0.6);
    });

    test("estimates refactoring phase", () => {
      const result = estimator.estimate({
        name: "refactoring",
        baseLOC: 1500,
        complexity: "medium",
        dependencies: 1,
        riskFactors: [],
      });

      expect(result.classification).toBe("medium");
      expect(result.confidenceScore).toBeGreaterThan(0.7);
    });
  });
});
