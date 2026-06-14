/**
 * Phase 1 Integration Test Suite
 *
 * Integration tests showing all three Phase 1 modules working together.
 * Tests the complete pipeline: cost estimation → scheduling → roadmap synthesis.
 */

describe("Phase 1 Planning Engine Integration", () => {
  // ======================
  // Module Implementations
  // ======================

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

      return {
        classification: this.classifyByCost(estimatedHours),
        estimatedHours: Math.round(estimatedHours * 10) / 10,
        confidenceScore: this.calculateConfidence(input),
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
    private readonly maxTeamSize = 5;

    schedule(
      phases: Phase[],
      totalWeeksAvailable: number,
      startWeek: number = 1
    ): ScheduleResult {
      const totalHours = phases.reduce((sum, p) => sum + p.estimatedHours, 0);
      const feasible = totalHours <= totalWeeksAvailable * this.hoursPerWeek * this.maxTeamSize;

      const dependencyGraph = this.buildDependencyGraph(phases);
      const sortedPhases = this.topologicalSort(phases, dependencyGraph);
      const scheduled = this.schedulePhases(
        sortedPhases,
        dependencyGraph,
        startWeek,
        totalWeeksAvailable
      );
      const criticalPath = this.identifyCriticalPath(scheduled);
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
        const scoreA = a.priority * 1000 - a.riskScore * 100 + a.confidenceScore * 50;
        const scoreB = b.priority * 1000 - b.riskScore * 100 + b.confidenceScore * 50;
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
      const endWeek = Math.max(...scheduled.map((s) => s.endWeek), 0);
      const findPath = (current: ScheduledPhase, path: string[]): string[] => {
        const newPath = [...path, current.id];
        if (current.endWeek === endWeek) return newPath;
        const dependents = scheduled.filter((s) =>
          s.dependencies.includes(current.id)
        );
        if (dependents.length === 0) return path;
        const paths = dependents.map((d) => findPath(d, newPath));
        return paths.reduce((a, b) => (a.length > b.length ? a : b));
      };

      const startPhases = scheduled.filter((s) => s.dependencies.length === 0);
      const paths = startPhases.map((p) => findPath(p, []));
      return paths.reduce(
        (a, b) => (a.length > b.length ? a : b),
        []
      );
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

  interface Roadmap {
    version: string;
    name: string;
    phases: Array<{
      id: string;
      name: string;
      description: string;
      priority: number;
      status: "pending" | "in-progress" | "completed";
      estimatedHours: number;
    }>;
    lastUpdated: string;
  }

  interface Delta {
    type: "create" | "update" | "delete" | "reorder";
    phaseId: string;
    oldPhase?: any;
    newPhase?: any;
    changes?: string[];
  }

  class RoadmapDeltaSynthesizer {
    synthesize(oldRoadmap: Roadmap, newRoadmap: Roadmap) {
      const deltas = this.computeDeltas(oldRoadmap.phases, newRoadmap.phases);
      const actionSummary = this.generateActionSummary(deltas);
      const rationale = this.generateRationale(deltas, oldRoadmap, newRoadmap);
      const impactAssessment = this.assessImpact(
        oldRoadmap.phases,
        newRoadmap.phases,
        deltas
      );

      return {
        deltas,
        actionSummary,
        rationale,
        impactAssessment,
      };
    }

    private computeDeltas(oldPhases: any[], newPhases: any[]): Delta[] {
      const deltas: Delta[] = [];
      const oldMap = new Map(oldPhases.map((p) => [p.id, p]));
      const newMap = new Map(newPhases.map((p) => [p.id, p]));

      oldPhases.forEach((oldPhase) => {
        const newPhase = newMap.get(oldPhase.id);
        if (!newPhase) {
          deltas.push({
            type: "delete",
            phaseId: oldPhase.id,
            oldPhase,
          });
        } else if (JSON.stringify(oldPhase) !== JSON.stringify(newPhase)) {
          const changes = this.detectChanges(oldPhase, newPhase);
          deltas.push({
            type: "update",
            phaseId: oldPhase.id,
            oldPhase,
            newPhase,
            changes,
          });
        }
      });

      newPhases.forEach((newPhase) => {
        if (!oldMap.has(newPhase.id)) {
          deltas.push({
            type: "create",
            phaseId: newPhase.id,
            newPhase,
          });
        }
      });

      return deltas;
    }

    private detectChanges(oldPhase: any, newPhase: any): string[] {
      const changes: string[] = [];
      if (oldPhase.name !== newPhase.name) {
        changes.push(`name: "${oldPhase.name}" -> "${newPhase.name}"`);
      }
      if (oldPhase.priority !== newPhase.priority) {
        changes.push(`priority: ${oldPhase.priority} -> ${newPhase.priority}`);
      }
      if (oldPhase.estimatedHours !== newPhase.estimatedHours) {
        changes.push(
          `estimatedHours: ${oldPhase.estimatedHours} -> ${newPhase.estimatedHours}`
        );
      }
      return changes;
    }

    private generateActionSummary(deltas: Delta[]): string[] {
      const byType = this.groupDeltasByType(deltas);
      const summary: string[] = [];
      if (byType.create.length > 0) {
        summary.push(
          `Add ${byType.create.length} new phase${byType.create.length !== 1 ? "s" : ""}`
        );
      }
      if (byType.delete.length > 0) {
        summary.push(
          `Remove ${byType.delete.length} phase${byType.delete.length !== 1 ? "s" : ""}`
        );
      }
      if (byType.update.length > 0) {
        summary.push(
          `Update ${byType.update.length} phase${byType.update.length !== 1 ? "s" : ""}`
        );
      }
      return summary;
    }

    private groupDeltasByType(deltas: Delta[]): Record<string, Delta[]> {
      return {
        create: deltas.filter((d) => d.type === "create"),
        delete: deltas.filter((d) => d.type === "delete"),
        update: deltas.filter((d) => d.type === "update"),
        reorder: deltas.filter((d) => d.type === "reorder"),
      };
    }

    private generateRationale(deltas: Delta[], oldRoadmap: Roadmap, newRoadmap: Roadmap): string {
      const byType = this.groupDeltasByType(deltas);
      const rationales: string[] = [];

      if (byType.create.length > 0) {
        const newNames = byType.create
          .map((d) => d.newPhase?.name)
          .filter(Boolean);
        rationales.push(`Added new phases: ${newNames.join(", ")}`);
      }

      if (byType.delete.length > 0) {
        const deletedNames = byType.delete
          .map((d) => d.oldPhase?.name)
          .filter(Boolean);
        rationales.push(`Removed phases: ${deletedNames.join(", ")}`);
      }

      if (byType.update.length > 0) {
        const updateCount = byType.update.length;
        const impactedNames = byType.update
          .slice(0, 3)
          .map((d) => d.oldPhase?.name)
          .filter(Boolean);
        const suffix = updateCount > 3 ? `, and ${updateCount - 3} more` : "";
        rationales.push(
          `Modified phases: ${impactedNames.join(", ")}${suffix}`
        );
      }

      return rationales.join(". ");
    }

    private assessImpact(oldPhases: any[], newPhases: any[], deltas: Delta[]) {
      const byType = this.groupDeltasByType(deltas);

      const oldTotalHours = oldPhases.reduce(
        (sum, p) => sum + p.estimatedHours,
        0
      );
      const newTotalHours = newPhases.reduce(
        (sum, p) => sum + p.estimatedHours,
        0
      );
      const deltaHours = newTotalHours - oldTotalHours;

      const riskLevel = this.calculateRiskLevel(deltas, deltaHours);

      return {
        phasesAdded: byType.create.length,
        phasesRemoved: byType.delete.length,
        phasesModified: byType.update.length,
        estimatedDeltaHours: deltaHours,
        riskLevel,
      };
    }

    private calculateRiskLevel(deltas: Delta[], deltaHours: number): "low" | "medium" | "high" {
      const byType = this.groupDeltasByType(deltas);
      const totalChanges =
        byType.create.length +
        byType.delete.length +
        byType.update.length;

      if (totalChanges === 0) return "low";
      if (byType.delete.length > 0) return "high";
      if (deltaHours > 200 || totalChanges > 10) return "high";
      if (deltaHours > 50 || totalChanges > 5) return "medium";
      return "low";
    }
  }

  // ======================
  // Integration Tests
  // ======================

  let estimator: PhaseCostEstimator;
  let scheduler: AutoschedulerV2;
  let synthesizer: RoadmapDeltaSynthesizer;

  beforeEach(() => {
    estimator = new PhaseCostEstimator();
    scheduler = new AutoschedulerV2();
    synthesizer = new RoadmapDeltaSynthesizer();
  });

  describe("end-to-end planning pipeline", () => {
    test("estimates costs for raw features, schedules them, synthesizes roadmap", () => {
      // Step 1: Estimate costs from feature specifications
      const features = [
        {
          name: "Authentication System",
          baseLOC: 2000,
          complexity: "high" as const,
          dependencies: 0,
          riskFactors: ["security-sensitive", "new-domain"],
        },
        {
          name: "API Gateway",
          baseLOC: 1500,
          complexity: "high" as const,
          dependencies: 0,
          riskFactors: ["performance-critical", "distributed-system"],
        },
        {
          name: "User Dashboard",
          baseLOC: 1000,
          complexity: "medium" as const,
          dependencies: 1,
          riskFactors: [],
        },
        {
          name: "Reporting Engine",
          baseLOC: 2500,
          complexity: "high" as const,
          dependencies: 2,
          riskFactors: ["performance-critical"],
        },
      ];

      const estimates = features.map((f) => ({
        ...estimator.estimate(f),
        featureName: f.name,
      }));

      // Verify cost estimates are reasonable
      expect(estimates).toHaveLength(4);
      estimates.forEach((est) => {
        expect(est.estimatedHours).toBeGreaterThan(0);
        expect(est.classification).toMatch(/low|medium|high/);
        expect(est.confidenceScore).toBeGreaterThanOrEqual(0);
        expect(est.confidenceScore).toBeLessThanOrEqual(1);
      });

      // Step 2: Create phases from cost estimates
      const phases: Phase[] = estimates.map((est, idx) => ({
        id: `phase-${idx + 1}`,
        name: est.featureName,
        estimatedHours: est.estimatedHours,
        dependencies: idx === 2 ? ["phase-1"] : idx === 3 ? ["phase-1", "phase-2"] : [],
        priority: 5 - idx,
        riskScore: 1 - est.confidenceScore,
        confidenceScore: est.confidenceScore,
      }));

      // Step 3: Schedule the phases
      const schedule = scheduler.schedule(phases, 30);

      expect(schedule.feasible).toBe(true);
      expect(schedule.schedule).toHaveLength(4);
      expect(schedule.totalWeeks).toBeGreaterThan(0);
      expect(schedule.totalWeeks).toBeLessThanOrEqual(30);

      // Verify scheduling respects dependencies
      const phaseMap = new Map(schedule.schedule.map((p) => [p.id, p]));
      schedule.schedule.forEach((p) => {
        p.dependencies.forEach((depId) => {
          const depPhase = phaseMap.get(depId);
          expect(depPhase!.endWeek).toBeLessThanOrEqual(p.startWeek);
        });
      });

      // Step 4: Generate roadmap from schedule
      const oldRoadmap: Roadmap = {
        version: "1.0",
        name: "Initial Roadmap",
        phases: [],
        lastUpdated: "2024-01-01",
      };

      const newRoadmap: Roadmap = {
        version: "2.0",
        name: "Updated Roadmap",
        phases: schedule.schedule.map((sp) => ({
          id: sp.id,
          name: sp.name,
          description: `${sp.name} phase - ${sp.estimatedHours} hours`,
          priority: sp.priority,
          status: "pending" as const,
          estimatedHours: sp.estimatedHours,
        })),
        lastUpdated: "2024-01-02",
      };

      // Step 5: Synthesize roadmap deltas
      const synthesis = synthesizer.synthesize(oldRoadmap, newRoadmap);

      expect(synthesis.deltas.length).toBeGreaterThan(0);
      expect(synthesis.actionSummary.length).toBeGreaterThan(0);
      expect(synthesis.impactAssessment.phasesAdded).toBe(4);
      expect(synthesis.impactAssessment.phasesRemoved).toBe(0);
    });

    test("refines roadmap iteratively with constraint changes", () => {
      // Initial planning round
      const initialEstimates = [
        estimator.estimate({
          name: "Feature A",
          baseLOC: 1000,
          complexity: "medium",
          dependencies: 0,
          riskFactors: [],
        }),
        estimator.estimate({
          name: "Feature B",
          baseLOC: 1500,
          complexity: "high",
          dependencies: 1,
          riskFactors: ["new-domain"],
        }),
      ];

      const initialPhases: Phase[] = initialEstimates.map((est, idx) => ({
        id: `p${idx + 1}`,
        name: `Feature ${String.fromCharCode(65 + idx)}`,
        estimatedHours: est.estimatedHours,
        dependencies: idx === 0 ? [] : ["p1"],
        priority: idx === 0 ? 2 : 1,
        riskScore: 1 - est.confidenceScore,
        confidenceScore: est.confidenceScore,
      }));

      const initialSchedule = scheduler.schedule(initialPhases, 20);

      // Create first roadmap
      const roadmap1: Roadmap = {
        version: "1.0",
        name: "Q1 Roadmap",
        phases: initialSchedule.schedule.map((p) => ({
          id: p.id,
          name: p.name,
          description: `${p.name} - Week ${p.startWeek}-${p.endWeek}`,
          priority: p.priority,
          status: "pending",
          estimatedHours: p.estimatedHours,
        })),
        lastUpdated: "2024-01-01",
      };

      // Simulate constraint change (faster execution)
      const refinedPhases: Phase[] = initialPhases.map((p) => ({
        ...p,
        estimatedHours: Math.ceil(p.estimatedHours * 0.8),
      }));

      const refinedSchedule = scheduler.schedule(refinedPhases, 15);

      // Create refined roadmap
      const roadmap2: Roadmap = {
        version: "1.1",
        name: "Q1 Roadmap",
        phases: refinedSchedule.schedule.map((p) => ({
          id: p.id,
          name: p.name,
          description: `${p.name} - Week ${p.startWeek}-${p.endWeek} (optimized)`,
          priority: p.priority,
          status: "pending",
          estimatedHours: p.estimatedHours,
        })),
        lastUpdated: "2024-01-02",
      };

      // Synthesize the refinement
      const synthesis = synthesizer.synthesize(roadmap1, roadmap2);

      expect(synthesis.impactAssessment.estimatedDeltaHours).toBeLessThan(0);
      expect(synthesis.impactAssessment.riskLevel).toBe("low");
      expect(synthesis.actionSummary.length).toBeGreaterThan(0);
    });

    test("handles complex multi-phase dependencies with integrated workflow", () => {
      // Estimate phases with complex dependencies
      const estimations = [
        {
          name: "Database Layer",
          baseLOC: 3000,
          complexity: "high" as const,
          dependencies: 0,
          riskFactors: ["distributed-system"],
        },
        {
          name: "API Layer",
          baseLOC: 2500,
          complexity: "high" as const,
          dependencies: 1,
          riskFactors: ["performance-critical"],
        },
        {
          name: "Frontend Layer",
          baseLOC: 2000,
          complexity: "medium" as const,
          dependencies: 1,
          riskFactors: [],
        },
        {
          name: "Integration Tests",
          baseLOC: 1500,
          complexity: "medium" as const,
          dependencies: 2,
          riskFactors: [],
        },
        {
          name: "Documentation",
          baseLOC: 800,
          complexity: "low" as const,
          dependencies: 2,
          riskFactors: [],
        },
      ];

      const estimates = estimations.map((e) => estimator.estimate(e));

      // Create dependency graph
      const phases: Phase[] = estimates.map((est, idx) => {
        const depMap: Record<number, number[]> = {
          0: [],
          1: [0],
          2: [0],
          3: [1, 2],
          4: [1, 2],
        };

        return {
          id: `phase-${idx}`,
          name: estimations[idx].name,
          estimatedHours: est.estimatedHours,
          dependencies: depMap[idx].map((i) => `phase-${i}`),
          priority: 5 - idx,
          riskScore: 1 - est.confidenceScore,
          confidenceScore: est.confidenceScore,
        };
      });

      // Schedule with resource constraints
      const schedule = scheduler.schedule(phases, 50);

      expect(schedule.feasible).toBe(true);
      expect(schedule.schedule).toHaveLength(5);
      expect(schedule.criticalPath.length).toBeGreaterThan(0);

      // Verify critical path integrity
      const critical = new Set(schedule.criticalPath);
      const nonCritical = schedule.schedule.filter((p) => !critical.has(p.id));

      // All critical path phases should be longer than non-critical
      expect(schedule.criticalPath.length).toBeGreaterThanOrEqual(2);

      // Create and synthesize roadmap
      const baseRoadmap: Roadmap = {
        version: "1.0",
        name: "Architecture Build",
        phases: [],
        lastUpdated: "2024-01-01",
      };

      const plannedRoadmap: Roadmap = {
        version: "2.0",
        name: "Architecture Build",
        phases: schedule.schedule.map((p) => ({
          id: p.id,
          name: p.name,
          description: `Critical: ${schedule.criticalPath.includes(p.id) ? "yes" : "no"}`,
          priority: p.priority,
          status: "pending",
          estimatedHours: p.estimatedHours,
        })),
        lastUpdated: "2024-01-02",
      };

      const synthesis = synthesizer.synthesize(baseRoadmap, plannedRoadmap);

      expect(synthesis.impactAssessment.phasesAdded).toBe(5);
      expect(synthesis.impactAssessment.estimatedDeltaHours).toBeGreaterThan(0);
    });
  });

  describe("determinism across pipeline", () => {
    test("identical inputs produce identical outputs at each stage", () => {
      const input: EstimationInput = {
        name: "Test Feature",
        baseLOC: 2000,
        complexity: "high",
        dependencies: 2,
        riskFactors: ["distributed-system", "performance-critical"],
      };

      // Estimate multiple times
      const est1 = estimator.estimate(input);
      const est2 = estimator.estimate(input);
      const est3 = estimator.estimate(input);

      expect(est1).toEqual(est2);
      expect(est2).toEqual(est3);

      // Create phases and schedule multiple times
      const phase: Phase = {
        id: "p1",
        name: input.name,
        estimatedHours: est1.estimatedHours,
        dependencies: [],
        priority: 1,
        riskScore: 1 - est1.confidenceScore,
        confidenceScore: est1.confidenceScore,
      };

      const sched1 = scheduler.schedule([phase], 20);
      const sched2 = scheduler.schedule([phase], 20);
      const sched3 = scheduler.schedule([phase], 20);

      expect(sched1.schedule).toEqual(sched2.schedule);
      expect(sched2.schedule).toEqual(sched3.schedule);

      // Synthesize roadmaps multiple times
      const roadmap1: Roadmap = {
        version: "1.0",
        name: "Test",
        phases: [],
        lastUpdated: "2024-01-01",
      };

      const roadmap2: Roadmap = {
        version: "2.0",
        name: "Test",
        phases: [
          {
            id: "p1",
            name: input.name,
            description: "Test",
            priority: 1,
            status: "pending",
            estimatedHours: est1.estimatedHours,
          },
        ],
        lastUpdated: "2024-01-02",
      };

      const synth1 = synthesizer.synthesize(roadmap1, roadmap2);
      const synth2 = synthesizer.synthesize(roadmap1, roadmap2);
      const synth3 = synthesizer.synthesize(roadmap1, roadmap2);

      expect(synth1).toEqual(synth2);
      expect(synth2).toEqual(synth3);
    });
  });

  describe("error handling and edge cases", () => {
    test("handles empty phase lists gracefully", () => {
      const schedule = scheduler.schedule([], 10);
      expect(schedule.feasible).toBe(true);
      expect(schedule.schedule).toHaveLength(0);
      expect(schedule.totalWeeks).toBe(0);

      const roadmap1: Roadmap = {
        version: "1.0",
        name: "Empty",
        phases: [],
        lastUpdated: "2024-01-01",
      };

      const synthesis = synthesizer.synthesize(roadmap1, roadmap1);
      expect(synthesis.deltas).toHaveLength(0);
    });

    test("handles infeasible scheduling constraints", () => {
      const phases: Phase[] = [
        {
          id: "p1",
          name: "Huge Task",
          estimatedHours: 5000,
          dependencies: [],
          priority: 1,
          riskScore: 0.5,
          confidenceScore: 0.5,
        },
      ];

      const schedule = scheduler.schedule(phases, 2);
      expect(schedule.feasible).toBe(false);
      expect(schedule.schedule).toHaveLength(1);
    });

    test("recovers from estimation edge cases", () => {
      const inputs = [
        {
          name: "Zero Code",
          baseLOC: 0,
          complexity: "low" as const,
          dependencies: 0,
          riskFactors: [],
        },
        {
          name: "Huge Code",
          baseLOC: 100000,
          complexity: "high" as const,
          dependencies: 10,
          riskFactors: ["high-uncertainty"],
        },
      ];

      inputs.forEach((input) => {
        const est = estimator.estimate(input);
        expect(est.estimatedHours).toBeGreaterThanOrEqual(0);
        expect(est.classification).toMatch(/low|medium|high/);
      });
    });
  });

  describe("integration output quality", () => {
    test("produces coherent roadmap from planning pipeline", () => {
      // Full workflow
      const features = [
        {
          name: "Core Service",
          baseLOC: 3000,
          complexity: "high" as const,
          dependencies: 0,
          riskFactors: ["new-domain"],
        },
        {
          name: "API Gateway",
          baseLOC: 2000,
          complexity: "high" as const,
          dependencies: 1,
          riskFactors: ["distributed-system"],
        },
        {
          name: "Admin UI",
          baseLOC: 1500,
          complexity: "medium" as const,
          dependencies: 2,
          riskFactors: [],
        },
      ];

      const estimates = features.map((f) => estimator.estimate(f));
      const phases = estimates.map((est, idx) => ({
        id: `p${idx}`,
        name: features[idx].name,
        estimatedHours: est.estimatedHours,
        dependencies: idx === 0 ? [] : [`p${idx - 1}`],
        priority: 3 - idx,
        riskScore: 1 - est.confidenceScore,
        confidenceScore: est.confidenceScore,
      }));

      const schedule = scheduler.schedule(phases, 40);

      const finalRoadmap: Roadmap = {
        version: "1.0",
        name: "Q2 Release",
        phases: schedule.schedule.map((p) => ({
          id: p.id,
          name: p.name,
          description: `${p.name} - ${p.estimatedHours} hours`,
          priority: p.priority,
          status: "pending",
          estimatedHours: p.estimatedHours,
        })),
        lastUpdated: new Date().toISOString(),
      };

      // Validate output structure
      expect(finalRoadmap.phases).toHaveLength(3);
      expect(finalRoadmap.version).toBe("1.0");

      // All phases should have valid data
      finalRoadmap.phases.forEach((p) => {
        expect(p.id).toBeDefined();
        expect(p.name).toBeDefined();
        expect(p.estimatedHours).toBeGreaterThan(0);
        expect(p.priority).toBeGreaterThan(0);
      });

      // Schedule should be feasible
      expect(schedule.feasible).toBe(true);
      expect(schedule.totalWeeks).toBeGreaterThan(0);
      expect(schedule.resourceUtilization).toBeGreaterThan(0);
    });
  });
});
