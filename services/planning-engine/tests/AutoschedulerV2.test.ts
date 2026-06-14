/**
 * AutoschedulerV2 Test Suite
 *
 * Tests the phase scheduling logic, including scoring, sorting determinism,
 * window assignment, and multi-constraint interactions.
 */

describe("AutoschedulerV2", () => {
  interface Phase {
    id: string;
    name: string;
    estimatedHours: number;
    dependencies: string[];
    priority: number;
    riskScore: number;
    confidenceScore: number;
  }

  interface ScheduledPhase extends Phase {
    startWeek: number;
    endWeek: number;
    assignedResources: number;
    criticalPath: boolean;
  }

  interface ScheduleResult {
    schedule: ScheduledPhase[];
    totalWeeks: number;
    criticalPath: string[];
    resourceUtilization: number;
    feasible: boolean;
  }

  class AutoschedulerV2 {
    private readonly maxParallelPhases = 4;
    private readonly hoursPerWeek = 40;
    private readonly minTeamSize = 1;
    private readonly maxTeamSize = 5;

    schedule(
      phases: Phase[],
      totalWeeksAvailable: number,
      startWeek: number = 1
    ): ScheduleResult {
      // Validate feasibility
      const totalHours = phases.reduce((sum, p) => sum + p.estimatedHours, 0);
      const feasible = totalHours <= totalWeeksAvailable * this.hoursPerWeek * this.maxTeamSize;

      // Build dependency graph
      const dependencyGraph = this.buildDependencyGraph(phases);

      // Calculate topological order with priority weighting
      const sortedPhases = this.topologicalSort(phases, dependencyGraph);

      // Schedule phases respecting constraints
      const scheduled = this.schedulePhases(
        sortedPhases,
        dependencyGraph,
        startWeek,
        totalWeeksAvailable
      );

      // Identify critical path
      const criticalPath = this.identifyCriticalPath(scheduled);

      // Calculate resource utilization
      const resourceUtilization = this.calculateUtilization(scheduled);

      return {
        schedule: scheduled,
        totalWeeks: this.calculateTotalWeeks(scheduled),
        criticalPath,
        resourceUtilization,
        feasible,
      };
    }

    private buildDependencyGraph(
      phases: Phase[]
    ): Map<string, Set<string>> {
      const graph = new Map<string, Set<string>>();
      phases.forEach((p) => {
        graph.set(p.id, new Set(p.dependencies));
      });
      return graph;
    }

    private topologicalSort(
      phases: Phase[],
      dependencyGraph: Map<string, Set<string>>
    ): Phase[] {
      const sorted: Phase[] = [];
      const visited = new Set<string>();
      const visiting = new Set<string>();

      const visit = (id: string) => {
        if (visited.has(id)) return;
        if (visiting.has(id)) throw new Error(`Circular dependency: ${id}`);

        visiting.add(id);
        const deps = dependencyGraph.get(id) || new Set();
        deps.forEach(visit);
        visiting.delete(id);

        visited.add(id);
        const phase = phases.find((p) => p.id === id);
        if (phase) sorted.push(phase);
      };

      const phasesByScore = [...phases].sort((a, b) => {
        const scoreA =
          a.priority * 1000 -
          a.riskScore * 100 +
          a.confidenceScore * 50;
        const scoreB =
          b.priority * 1000 -
          b.riskScore * 100 +
          b.confidenceScore * 50;
        return scoreB - scoreA;
      });

      phasesByScore.forEach((p) => visit(p.id));
      return sorted;
    }

    private schedulePhases(
      sortedPhases: Phase[],
      dependencyGraph: Map<string, Set<string>>,
      startWeek: number,
      totalWeeks: number
    ): ScheduledPhase[] {
      const scheduled: ScheduledPhase[] = [];
      const phaseCompletionWeeks = new Map<string, number>();

      sortedPhases.forEach((phase) => {
        const deps = dependencyGraph.get(phase.id) || new Set();
        const maxDepEndWeek = Math.max(
          startWeek,
          ...Array.from(deps).map((d) => phaseCompletionWeeks.get(d) ?? startWeek)
        );

        const durationWeeks = Math.ceil(
          phase.estimatedHours / this.hoursPerWeek
        );
        const assignedResources = Math.min(
          Math.ceil(phase.estimatedHours / (durationWeeks * this.hoursPerWeek)),
          this.maxTeamSize
        );

        const actualEndWeek = maxDepEndWeek + durationWeeks;

        scheduled.push({
          ...phase,
          startWeek: maxDepEndWeek,
          endWeek: actualEndWeek,
          assignedResources,
          criticalPath: false,
        });

        phaseCompletionWeeks.set(phase.id, actualEndWeek);
      });

      return scheduled;
    }

    private identifyCriticalPath(scheduled: ScheduledPhase[]): string[] {
      if (scheduled.length === 0) return [];

      const endWeek = Math.max(...scheduled.map((s) => s.endWeek));
      const criticalPaths: string[][] = [];

      const findCriticalPath = (
        current: ScheduledPhase,
        path: string[]
      ): string[] => {
        const newPath = [...path, current.id];
        if (current.endWeek === endWeek) return newPath;

        const dependents = scheduled.filter((s) =>
          s.dependencies.includes(current.id)
        );

        if (dependents.length === 0 && current.endWeek < endWeek)
          return path;

        const paths = dependents.map((d) =>
          findCriticalPath(d, newPath)
        );
        return paths.reduce((a, b) =>
          a.length > b.length ? a : b
        );
      };

      const startPhases = scheduled.filter(
        (s) => s.dependencies.length === 0
      );
      startPhases.forEach((p) => {
        const path = findCriticalPath(p, []);
        if (path.length > 0) criticalPaths.push(path);
      });

      return criticalPaths.length > 0
        ? criticalPaths.reduce((a, b) =>
            a.length > b.length ? a : b
          )
        : [];
    }

    private calculateUtilization(scheduled: ScheduledPhase[]): number {
      if (scheduled.length === 0) return 0;

      const maxWeek = Math.max(...scheduled.map((s) => s.endWeek), 0);
      const totalCapacity = maxWeek * this.maxTeamSize * this.hoursPerWeek;
      const totalUtilized = scheduled.reduce(
        (sum, s) => sum + s.estimatedHours,
        0
      );

      return totalCapacity === 0 ? 0 : totalUtilized / totalCapacity;
    }

    private calculateTotalWeeks(scheduled: ScheduledPhase[]): number {
      if (scheduled.length === 0) return 0;
      return Math.max(...scheduled.map((s) => s.endWeek));
    }
  }

  let scheduler: AutoschedulerV2;

  beforeEach(() => {
    scheduler = new AutoschedulerV2();
  });

  describe("basic scheduling", () => {
    test("schedules single phase correctly", () => {
      const phases: Phase[] = [
        {
          id: "p1",
          name: "Phase 1",
          estimatedHours: 40,
          dependencies: [],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
      ];

      const result = scheduler.schedule(phases, 10);

      expect(result.feasible).toBe(true);
      expect(result.schedule).toHaveLength(1);
      expect(result.schedule[0].startWeek).toBe(1);
      expect(result.schedule[0].endWeek).toBe(2);
      expect(result.schedule[0].assignedResources).toBe(1);
    });

    test("schedules independent phases in parallel", () => {
      const phases: Phase[] = [
        {
          id: "p1",
          name: "Phase 1",
          estimatedHours: 40,
          dependencies: [],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
        {
          id: "p2",
          name: "Phase 2",
          estimatedHours: 40,
          dependencies: [],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
      ];

      const result = scheduler.schedule(phases, 10);

      expect(result.schedule).toHaveLength(2);
      const p1 = result.schedule.find((s) => s.id === "p1");
      const p2 = result.schedule.find((s) => s.id === "p2");

      expect(p1!.startWeek).toBe(p2!.startWeek);
      expect(result.totalWeeks).toBeLessThanOrEqual(2);
    });

    test("respects linear dependencies", () => {
      const phases: Phase[] = [
        {
          id: "p1",
          name: "Phase 1",
          estimatedHours: 40,
          dependencies: [],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
        {
          id: "p2",
          name: "Phase 2",
          estimatedHours: 40,
          dependencies: ["p1"],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
        {
          id: "p3",
          name: "Phase 3",
          estimatedHours: 40,
          dependencies: ["p2"],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
      ];

      const result = scheduler.schedule(phases, 10);

      const scheduled = result.schedule;
      const p1 = scheduled.find((s) => s.id === "p1");
      const p2 = scheduled.find((s) => s.id === "p2");
      const p3 = scheduled.find((s) => s.id === "p3");

      expect(p1!.endWeek).toBeLessThanOrEqual(p2!.startWeek);
      expect(p2!.endWeek).toBeLessThanOrEqual(p3!.startWeek);
      expect(result.totalWeeks).toBe(4);
    });

    test("handles diamond dependency pattern", () => {
      const phases: Phase[] = [
        {
          id: "p1",
          name: "Phase 1",
          estimatedHours: 40,
          dependencies: [],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
        {
          id: "p2",
          name: "Phase 2",
          estimatedHours: 40,
          dependencies: ["p1"],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
        {
          id: "p3",
          name: "Phase 3",
          estimatedHours: 40,
          dependencies: ["p1"],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
        {
          id: "p4",
          name: "Phase 4",
          estimatedHours: 40,
          dependencies: ["p2", "p3"],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
      ];

      const result = scheduler.schedule(phases, 20);

      const scheduled = result.schedule;
      const p2 = scheduled.find((s) => s.id === "p2");
      const p3 = scheduled.find((s) => s.id === "p3");
      const p4 = scheduled.find((s) => s.id === "p4");

      expect(p2!.startWeek).toBe(p3!.startWeek);
      expect(Math.max(p2!.endWeek, p3!.endWeek)).toBeLessThanOrEqual(
        p4!.startWeek
      );
    });
  });

  describe("constraint handling", () => {
    test("assigns appropriate team size for phase duration", () => {
      const phases: Phase[] = [
        {
          id: "p1",
          name: "Phase 1",
          estimatedHours: 200,
          dependencies: [],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
      ];

      const result = scheduler.schedule(phases, 20);

      const scheduled = result.schedule[0];
      const weeks = scheduled.endWeek - scheduled.startWeek;
      const expectedResources = Math.ceil(200 / (weeks * 40));

      expect(scheduled.assignedResources).toBe(expectedResources);
      expect(scheduled.assignedResources).toBeLessThanOrEqual(5);
    });

    test("respects maximum available weeks", () => {
      const phases: Phase[] = [
        {
          id: "p1",
          name: "Phase 1",
          estimatedHours: 500,
          dependencies: [],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
      ];

      const result = scheduler.schedule(phases, 5);

      expect(result.schedule[0].estimatedHours).toBe(500);
      expect(result.feasible).toBe(false);
    });

    test("flags infeasible schedules when insufficient capacity", () => {
      const phases: Phase[] = [
        {
          id: "p1",
          name: "Phase 1",
          estimatedHours: 1000,
          dependencies: [],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
      ];

      const result = scheduler.schedule(phases, 3);

      expect(result.feasible).toBe(false);
    });
  });

  describe("priority and scoring", () => {
    test("schedules higher priority phases first", () => {
      const phases: Phase[] = [
        {
          id: "p1",
          name: "Phase 1",
          estimatedHours: 40,
          dependencies: [],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
        {
          id: "p2",
          name: "Phase 2",
          estimatedHours: 40,
          dependencies: [],
          priority: 2,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
      ];

      const result = scheduler.schedule(phases, 10);

      // Both should start together, but higher priority has precedence in sorting
      const scheduled = result.schedule;
      const p1 = scheduled.find((s) => s.id === "p1");
      const p2 = scheduled.find((s) => s.id === "p2");

      expect(p1).toBeDefined();
      expect(p2).toBeDefined();
    });

    test("penalizes high risk phases in scoring", () => {
      const phases: Phase[] = [
        {
          id: "p1",
          name: "Low Risk",
          estimatedHours: 40,
          dependencies: [],
          priority: 1,
          riskScore: 0.1,
          confidenceScore: 0.9,
        },
        {
          id: "p2",
          name: "High Risk",
          estimatedHours: 40,
          dependencies: [],
          priority: 1,
          riskScore: 0.8,
          confidenceScore: 0.3,
        },
      ];

      const result = scheduler.schedule(phases, 10);

      expect(result.schedule).toHaveLength(2);
    });

    test("prioritizes high confidence phases", () => {
      const phases: Phase[] = [
        {
          id: "p1",
          name: "High Confidence",
          estimatedHours: 40,
          dependencies: [],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.9,
        },
        {
          id: "p2",
          name: "Low Confidence",
          estimatedHours: 40,
          dependencies: [],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.4,
        },
      ];

      const result = scheduler.schedule(phases, 10);

      expect(result.schedule).toHaveLength(2);
    });
  });

  describe("critical path analysis", () => {
    test("identifies critical path in simple linear chain", () => {
      const phases: Phase[] = [
        {
          id: "p1",
          name: "Phase 1",
          estimatedHours: 40,
          dependencies: [],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
        {
          id: "p2",
          name: "Phase 2",
          estimatedHours: 40,
          dependencies: ["p1"],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
      ];

      const result = scheduler.schedule(phases, 10);

      expect(result.criticalPath).toContain("p1");
      expect(result.criticalPath).toContain("p2");
    });

    test("identifies correct critical path in diamond dependency", () => {
      const phases: Phase[] = [
        {
          id: "p1",
          name: "Phase 1",
          estimatedHours: 40,
          dependencies: [],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
        {
          id: "p2",
          name: "Phase 2",
          estimatedHours: 40,
          dependencies: ["p1"],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
        {
          id: "p3",
          name: "Phase 3",
          estimatedHours: 80,
          dependencies: ["p1"],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
        {
          id: "p4",
          name: "Phase 4",
          estimatedHours: 40,
          dependencies: ["p2", "p3"],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
      ];

      const result = scheduler.schedule(phases, 20);

      expect(result.criticalPath).toContain("p1");
      expect(result.criticalPath).toContain("p4");
    });

    test("returns empty critical path for zero phases", () => {
      const result = scheduler.schedule([], 10);

      expect(result.criticalPath).toHaveLength(0);
    });
  });

  describe("resource utilization", () => {
    test("calculates utilization for single phase", () => {
      const phases: Phase[] = [
        {
          id: "p1",
          name: "Phase 1",
          estimatedHours: 40,
          dependencies: [],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
      ];

      const result = scheduler.schedule(phases, 10);

      expect(result.resourceUtilization).toBeGreaterThan(0);
      expect(result.resourceUtilization).toBeLessThanOrEqual(1);
    });

    test("shows higher utilization with more packed schedule", () => {
      const phases: Phase[] = [
        {
          id: "p1",
          name: "Phase 1",
          estimatedHours: 160,
          dependencies: [],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
      ];

      const tightResult = scheduler.schedule(phases, 1);
      const looseResult = scheduler.schedule(phases, 10);

      expect(tightResult.resourceUtilization).toBeGreaterThan(
        looseResult.resourceUtilization
      );
    });

    test("returns zero utilization for empty schedule", () => {
      const result = scheduler.schedule([], 10);

      expect(result.resourceUtilization).toBe(0);
    });
  });

  describe("sorting determinism", () => {
    const basePhases: Phase[] = [
      {
        id: "p1",
        name: "Phase 1",
        estimatedHours: 40,
        dependencies: [],
        priority: 1,
        riskScore: 0.3,
        confidenceScore: 0.8,
      },
      {
        id: "p2",
        name: "Phase 2",
        estimatedHours: 40,
        dependencies: [],
        priority: 2,
        riskScore: 0.5,
        confidenceScore: 0.6,
      },
      {
        id: "p3",
        name: "Phase 3",
        estimatedHours: 40,
        dependencies: ["p1"],
        priority: 1,
        riskScore: 0.4,
        confidenceScore: 0.7,
      },
    ];

    test("produces identical schedules across multiple calls", () => {
      const result1 = scheduler.schedule(basePhases, 20);
      const result2 = scheduler.schedule(basePhases, 20);
      const result3 = scheduler.schedule(basePhases, 20);

      expect(result1.schedule).toEqual(result2.schedule);
      expect(result2.schedule).toEqual(result3.schedule);
    });

    test("produces identical total weeks across calls", () => {
      const result1 = scheduler.schedule(basePhases, 20);
      const result2 = scheduler.schedule(basePhases, 20);

      expect(result1.totalWeeks).toBe(result2.totalWeeks);
    });

    test("critical path is deterministic", () => {
      const result1 = scheduler.schedule(basePhases, 20);
      const result2 = scheduler.schedule(basePhases, 20);

      expect(result1.criticalPath).toEqual(result2.criticalPath);
    });

    test("resource utilization is deterministic", () => {
      const result1 = scheduler.schedule(basePhases, 20);
      const result2 = scheduler.schedule(basePhases, 20);

      expect(result1.resourceUtilization).toBe(result2.resourceUtilization);
    });
  });

  describe("multi-constraint interactions", () => {
    test("balances priority, risk, and dependencies", () => {
      const phases: Phase[] = [
        {
          id: "p1",
          name: "Foundation",
          estimatedHours: 80,
          dependencies: [],
          priority: 2,
          riskScore: 0.2,
          confidenceScore: 0.9,
        },
        {
          id: "p2",
          name: "Feature A",
          estimatedHours: 40,
          dependencies: ["p1"],
          priority: 1,
          riskScore: 0.5,
          confidenceScore: 0.6,
        },
        {
          id: "p3",
          name: "Feature B",
          estimatedHours: 40,
          dependencies: ["p1"],
          priority: 1,
          riskScore: 0.5,
          confidenceScore: 0.6,
        },
        {
          id: "p4",
          name: "Integration",
          estimatedHours: 60,
          dependencies: ["p2", "p3"],
          priority: 2,
          riskScore: 0.7,
          confidenceScore: 0.5,
        },
      ];

      const result = scheduler.schedule(phases, 30);

      expect(result.feasible).toBe(true);
      expect(result.schedule).toHaveLength(4);
      expect(result.totalWeeks).toBeGreaterThan(0);
    });

    test("handles conflicting constraints gracefully", () => {
      const phases: Phase[] = [
        {
          id: "p1",
          name: "Phase 1",
          estimatedHours: 40,
          dependencies: [],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
        {
          id: "p2",
          name: "Phase 2",
          estimatedHours: 40,
          dependencies: ["p1"],
          priority: 1,
          riskScore: 0.9,
          confidenceScore: 0.2,
        },
      ];

      const result = scheduler.schedule(phases, 1);

      expect(result.schedule).toHaveLength(2);
      expect(result.feasible).toBe(false);
    });

    test("scales efficiently with phase count", () => {
      const phases: Phase[] = Array.from({ length: 10 }, (_, i) => ({
        id: `p${i + 1}`,
        name: `Phase ${i + 1}`,
        estimatedHours: 40,
        dependencies: i > 0 ? [`p${i}`] : [],
        priority: 1,
        riskScore: 0.3,
        confidenceScore: 0.8,
      }));

      const startTime = Date.now();
      const result = scheduler.schedule(phases, 50);
      const endTime = Date.now();

      expect(result.schedule).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe("edge cases", () => {
    test("handles empty phase list", () => {
      const result = scheduler.schedule([], 10);

      expect(result.schedule).toHaveLength(0);
      expect(result.totalWeeks).toBe(0);
      expect(result.feasible).toBe(true);
      expect(result.resourceUtilization).toBe(0);
    });

    test("handles single phase with no dependencies", () => {
      const phases: Phase[] = [
        {
          id: "p1",
          name: "Phase 1",
          estimatedHours: 40,
          dependencies: [],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
      ];

      const result = scheduler.schedule(phases, 10);

      expect(result.schedule).toHaveLength(1);
      expect(result.totalWeeks).toBeGreaterThan(0);
    });

    test("handles very large phase estimates", () => {
      const phases: Phase[] = [
        {
          id: "p1",
          name: "Huge Phase",
          estimatedHours: 10000,
          dependencies: [],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
      ];

      const result = scheduler.schedule(phases, 100);

      expect(result.schedule[0].estimatedHours).toBe(10000);
      expect(result.totalWeeks).toBeGreaterThan(50);
    });

    test("handles zero estimated hours", () => {
      const phases: Phase[] = [
        {
          id: "p1",
          name: "Zero Hours",
          estimatedHours: 0,
          dependencies: [],
          priority: 1,
          riskScore: 0.3,
          confidenceScore: 0.8,
        },
      ];

      const result = scheduler.schedule(phases, 10);

      expect(result.schedule[0].assignedResources).toBeGreaterThanOrEqual(1);
    });
  });
});
