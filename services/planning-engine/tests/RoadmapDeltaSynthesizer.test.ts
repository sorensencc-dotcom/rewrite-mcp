/**
 * RoadmapDeltaSynthesizer Test Suite
 *
 * Tests the roadmap diff algorithm, action detection, and rationale generation.
 * Covers structural changes, phase modifications, and content synthesis.
 */

describe("RoadmapDeltaSynthesizer", () => {
  interface Phase {
    id: string;
    name: string;
    description: string;
    priority: number;
    status: "pending" | "in-progress" | "completed";
    estimatedHours: number;
  }

  interface Roadmap {
    version: string;
    name: string;
    phases: Phase[];
    lastUpdated: string;
  }

  interface Delta {
    type: "create" | "update" | "delete" | "reorder";
    phaseId: string;
    oldPhase?: Phase;
    newPhase?: Phase;
    changes?: string[];
  }

  interface SynthesisResult {
    deltas: Delta[];
    actionSummary: string[];
    rationale: string;
    impactAssessment: {
      phasesAdded: number;
      phasesRemoved: number;
      phasesModified: number;
      estimatedDeltaHours: number;
      riskLevel: "low" | "medium" | "high";
    };
  }

  class RoadmapDeltaSynthesizer {
    synthesize(oldRoadmap: Roadmap, newRoadmap: Roadmap): SynthesisResult {
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

    private computeDeltas(oldPhases: Phase[], newPhases: Phase[]): Delta[] {
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

      deltas.push(
        ...this.detectReordering(oldPhases, newPhases, oldMap, newMap)
      );

      return deltas;
    }

    private detectChanges(oldPhase: Phase, newPhase: Phase): string[] {
      const changes: string[] = [];

      if (oldPhase.name !== newPhase.name) {
        changes.push(`name: "${oldPhase.name}" -> "${newPhase.name}"`);
      }
      if (oldPhase.description !== newPhase.description) {
        changes.push("description updated");
      }
      if (oldPhase.priority !== newPhase.priority) {
        changes.push(`priority: ${oldPhase.priority} -> ${newPhase.priority}`);
      }
      if (oldPhase.status !== newPhase.status) {
        changes.push(`status: ${oldPhase.status} -> ${newPhase.status}`);
      }
      if (oldPhase.estimatedHours !== newPhase.estimatedHours) {
        changes.push(
          `estimatedHours: ${oldPhase.estimatedHours} -> ${newPhase.estimatedHours}`
        );
      }

      return changes;
    }

    private detectReordering(
      oldPhases: Phase[],
      newPhases: Phase[],
      oldMap: Map<string, Phase>,
      newMap: Map<string, Phase>
    ): Delta[] {
      const reorderings: Delta[] = [];

      const commonIds = oldPhases
        .map((p) => p.id)
        .filter((id) => newMap.has(id));

      const oldPositions = new Map(
        commonIds.map((id, idx) => [id, idx])
      );
      const newPositions = new Map(
        newPhases
          .map((p) => p.id)
          .filter((id) => oldMap.has(id))
          .map((id, idx) => [id, idx])
      );

      for (const id of commonIds) {
        const oldPos = oldPositions.get(id)!;
        const newPos = newPositions.get(id)!;
        if (oldPos !== newPos) {
          reorderings.push({
            type: "reorder",
            phaseId: id,
            changes: [`position: ${oldPos} -> ${newPos}`],
          });
        }
      }

      return reorderings;
    }

    private generateActionSummary(deltas: Delta[]): string[] {
      const summary: string[] = [];
      const byType = this.groupDeltasByType(deltas);

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
      if (byType.reorder.length > 0) {
        summary.push(
          `Reorder ${byType.reorder.length} phase${byType.reorder.length !== 1 ? "s" : ""}`
        );
      }

      return summary;
    }

    private groupDeltasByType(
      deltas: Delta[]
    ): Record<string, Delta[]> {
      return {
        create: deltas.filter((d) => d.type === "create"),
        delete: deltas.filter((d) => d.type === "delete"),
        update: deltas.filter((d) => d.type === "update"),
        reorder: deltas.filter((d) => d.type === "reorder"),
      };
    }

    private generateRationale(
      deltas: Delta[],
      oldRoadmap: Roadmap,
      newRoadmap: Roadmap
    ): string {
      const byType = this.groupDeltasByType(deltas);
      const rationales: string[] = [];

      if (byType.create.length > 0) {
        const newNames = byType.create
          .map((d) => d.newPhase?.name)
          .filter(Boolean);
        rationales.push(
          `Added new phases: ${newNames.join(", ")}`
        );
      }

      if (byType.delete.length > 0) {
        const deletedNames = byType.delete
          .map((d) => d.oldPhase?.name)
          .filter(Boolean);
        rationales.push(
          `Removed phases: ${deletedNames.join(", ")}`
        );
      }

      if (byType.update.length > 0) {
        const updateCount = byType.update.length;
        const impactedNames = byType.update
          .slice(0, 3)
          .map((d) => d.oldPhase?.name)
          .filter(Boolean);
        const suffix =
          updateCount > 3 ? `, and ${updateCount - 3} more` : "";
        rationales.push(
          `Modified phases: ${impactedNames.join(", ")}${suffix}`
        );
      }

      const versionChange =
        oldRoadmap.version !== newRoadmap.version
          ? `Version updated from ${oldRoadmap.version} to ${newRoadmap.version}`
          : null;
      if (versionChange) rationales.push(versionChange);

      return rationales.join(". ");
    }

    private assessImpact(
      oldPhases: Phase[],
      newPhases: Phase[],
      deltas: Delta[]
    ): SynthesisResult["impactAssessment"] {
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

    private calculateRiskLevel(
      deltas: Delta[],
      deltaHours: number
    ): "low" | "medium" | "high" {
      const byType = this.groupDeltasByType(deltas);
      const totalChanges =
        byType.create.length +
        byType.delete.length +
        byType.update.length +
        byType.reorder.length;

      if (totalChanges === 0) return "low";
      if (byType.delete.length > 0) return "high";
      if (deltaHours > 200 || totalChanges > 10) return "high";
      if (deltaHours > 50 || totalChanges > 5) return "medium";
      return "low";
    }
  }

  let synthesizer: RoadmapDeltaSynthesizer;

  beforeEach(() => {
    synthesizer = new RoadmapDeltaSynthesizer();
  });

  describe("delta computation", () => {
    test("detects phase creation", () => {
      const oldRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "Initial phase",
            priority: 1,
            status: "pending",
            estimatedHours: 40,
          },
        ],
        lastUpdated: "2024-01-01",
      };

      const newRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "Initial phase",
            priority: 1,
            status: "pending",
            estimatedHours: 40,
          },
          {
            id: "p2",
            name: "Phase 2",
            description: "New phase",
            priority: 2,
            status: "pending",
            estimatedHours: 60,
          },
        ],
        lastUpdated: "2024-01-02",
      };

      const result = synthesizer.synthesize(oldRoadmap, newRoadmap);

      expect(result.deltas).toHaveLength(1);
      expect(result.deltas[0].type).toBe("create");
      expect(result.deltas[0].phaseId).toBe("p2");
      expect(result.deltas[0].newPhase?.name).toBe("Phase 2");
    });

    test("detects phase deletion", () => {
      const oldRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "Initial phase",
            priority: 1,
            status: "pending",
            estimatedHours: 40,
          },
          {
            id: "p2",
            name: "Phase 2",
            description: "Removable phase",
            priority: 2,
            status: "pending",
            estimatedHours: 60,
          },
        ],
        lastUpdated: "2024-01-01",
      };

      const newRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "Initial phase",
            priority: 1,
            status: "pending",
            estimatedHours: 40,
          },
        ],
        lastUpdated: "2024-01-02",
      };

      const result = synthesizer.synthesize(oldRoadmap, newRoadmap);

      expect(result.deltas).toHaveLength(1);
      expect(result.deltas[0].type).toBe("delete");
      expect(result.deltas[0].phaseId).toBe("p2");
      expect(result.deltas[0].oldPhase?.name).toBe("Phase 2");
    });

    test("detects phase updates", () => {
      const oldRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "Original description",
            priority: 1,
            status: "pending",
            estimatedHours: 40,
          },
        ],
        lastUpdated: "2024-01-01",
      };

      const newRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1 Updated",
            description: "New description",
            priority: 2,
            status: "in-progress",
            estimatedHours: 80,
          },
        ],
        lastUpdated: "2024-01-02",
      };

      const result = synthesizer.synthesize(oldRoadmap, newRoadmap);

      expect(result.deltas).toHaveLength(1);
      expect(result.deltas[0].type).toBe("update");
      expect(result.deltas[0].changes).toBeDefined();
      expect(result.deltas[0].changes).toContain('name: "Phase 1" -> "Phase 1 Updated"');
      expect(result.deltas[0].changes).toContain("priority: 1 -> 2");
    });

    test("detects phase reordering", () => {
      const oldRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "First",
            priority: 1,
            status: "pending",
            estimatedHours: 40,
          },
          {
            id: "p2",
            name: "Phase 2",
            description: "Second",
            priority: 2,
            status: "pending",
            estimatedHours: 60,
          },
        ],
        lastUpdated: "2024-01-01",
      };

      const newRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p2",
            name: "Phase 2",
            description: "Second",
            priority: 2,
            status: "pending",
            estimatedHours: 60,
          },
          {
            id: "p1",
            name: "Phase 1",
            description: "First",
            priority: 1,
            status: "pending",
            estimatedHours: 40,
          },
        ],
        lastUpdated: "2024-01-02",
      };

      const result = synthesizer.synthesize(oldRoadmap, newRoadmap);

      const reorderDeltas = result.deltas.filter((d) => d.type === "reorder");
      expect(reorderDeltas.length).toBeGreaterThan(0);
    });

    test("handles complex mixed changes", () => {
      const oldRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "First",
            priority: 1,
            status: "pending",
            estimatedHours: 40,
          },
          {
            id: "p2",
            name: "Phase 2",
            description: "Second",
            priority: 2,
            status: "pending",
            estimatedHours: 60,
          },
        ],
        lastUpdated: "2024-01-01",
      };

      const newRoadmap: Roadmap = {
        version: "2.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1 Updated",
            description: "First",
            priority: 1,
            status: "in-progress",
            estimatedHours: 50,
          },
          {
            id: "p3",
            name: "Phase 3",
            description: "New",
            priority: 3,
            status: "pending",
            estimatedHours: 100,
          },
        ],
        lastUpdated: "2024-01-02",
      };

      const result = synthesizer.synthesize(oldRoadmap, newRoadmap);

      const byType = result.deltas.reduce(
        (acc, d) => {
          acc[d.type] = (acc[d.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      expect(byType.update).toBeGreaterThan(0);
      expect(byType.create).toBe(1);
      expect(byType.delete).toBe(1);
    });
  });

  describe("action summary generation", () => {
    test("generates summary for phase creation", () => {
      const oldRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [],
        lastUpdated: "2024-01-01",
      };

      const newRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "New",
            priority: 1,
            status: "pending",
            estimatedHours: 40,
          },
        ],
        lastUpdated: "2024-01-02",
      };

      const result = synthesizer.synthesize(oldRoadmap, newRoadmap);

      expect(result.actionSummary).toContain("Add 1 new phase");
    });

    test("pluralizes correctly in action summary", () => {
      const oldRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [],
        lastUpdated: "2024-01-01",
      };

      const newRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "New",
            priority: 1,
            status: "pending",
            estimatedHours: 40,
          },
          {
            id: "p2",
            name: "Phase 2",
            description: "New",
            priority: 2,
            status: "pending",
            estimatedHours: 60,
          },
        ],
        lastUpdated: "2024-01-02",
      };

      const result = synthesizer.synthesize(oldRoadmap, newRoadmap);

      expect(result.actionSummary).toContain("Add 2 new phases");
    });

    test("generates summary for all action types", () => {
      const oldRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "Update me",
            priority: 1,
            status: "pending",
            estimatedHours: 40,
          },
          {
            id: "p2",
            name: "Phase 2",
            description: "Delete me",
            priority: 2,
            status: "pending",
            estimatedHours: 60,
          },
        ],
        lastUpdated: "2024-01-01",
      };

      const newRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "Updated",
            priority: 1,
            status: "pending",
            estimatedHours: 40,
          },
          {
            id: "p3",
            name: "Phase 3",
            description: "New",
            priority: 3,
            status: "pending",
            estimatedHours: 80,
          },
        ],
        lastUpdated: "2024-01-02",
      };

      const result = synthesizer.synthesize(oldRoadmap, newRoadmap);

      expect(result.actionSummary.length).toBeGreaterThan(0);
      expect(result.actionSummary.join(" ")).toMatch(/(Add|Remove|Update|Reorder)/);
    });
  });

  describe("rationale generation", () => {
    test("includes created phases in rationale", () => {
      const oldRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [],
        lastUpdated: "2024-01-01",
      };

      const newRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "New Feature",
            description: "Feature desc",
            priority: 1,
            status: "pending",
            estimatedHours: 40,
          },
        ],
        lastUpdated: "2024-01-02",
      };

      const result = synthesizer.synthesize(oldRoadmap, newRoadmap);

      expect(result.rationale).toContain("New Feature");
    });

    test("includes deleted phases in rationale", () => {
      const oldRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Old Feature",
            description: "Feature desc",
            priority: 1,
            status: "pending",
            estimatedHours: 40,
          },
        ],
        lastUpdated: "2024-01-01",
      };

      const newRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [],
        lastUpdated: "2024-01-02",
      };

      const result = synthesizer.synthesize(oldRoadmap, newRoadmap);

      expect(result.rationale).toContain("Old Feature");
    });

    test("includes version change in rationale", () => {
      const oldRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "Feature",
            priority: 1,
            status: "pending",
            estimatedHours: 40,
          },
        ],
        lastUpdated: "2024-01-01",
      };

      const newRoadmap: Roadmap = {
        version: "2.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "Feature",
            priority: 1,
            status: "pending",
            estimatedHours: 40,
          },
        ],
        lastUpdated: "2024-01-02",
      };

      const result = synthesizer.synthesize(oldRoadmap, newRoadmap);

      expect(result.rationale).toContain("Version updated from 1.0 to 2.0");
    });

    test("limits phase names in rationale to first 3", () => {
      const oldRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: Array.from({ length: 5 }, (_, i) => ({
          id: `p${i + 1}`,
          name: `Phase ${i + 1}`,
          description: "Test",
          priority: 1,
          status: "pending",
          estimatedHours: 40,
        })),
        lastUpdated: "2024-01-01",
      };

      const newRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: Array.from({ length: 5 }, (_, i) => ({
          id: `p${i + 1}`,
          name: `Phase ${i + 1}`,
          description: "Updated",
          priority: 1,
          status: "pending",
          estimatedHours: 40,
        })),
        lastUpdated: "2024-01-02",
      };

      const result = synthesizer.synthesize(oldRoadmap, newRoadmap);

      expect(result.rationale).toContain("and 2 more");
    });
  });

  describe("impact assessment", () => {
    test("counts phase additions correctly", () => {
      const oldRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "Test",
            priority: 1,
            status: "pending",
            estimatedHours: 40,
          },
        ],
        lastUpdated: "2024-01-01",
      };

      const newRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "Test",
            priority: 1,
            status: "pending",
            estimatedHours: 40,
          },
          {
            id: "p2",
            name: "Phase 2",
            description: "New",
            priority: 2,
            status: "pending",
            estimatedHours: 60,
          },
          {
            id: "p3",
            name: "Phase 3",
            description: "New",
            priority: 3,
            status: "pending",
            estimatedHours: 80,
          },
        ],
        lastUpdated: "2024-01-02",
      };

      const result = synthesizer.synthesize(oldRoadmap, newRoadmap);

      expect(result.impactAssessment.phasesAdded).toBe(2);
    });

    test("counts phase removals correctly", () => {
      const oldRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "Test",
            priority: 1,
            status: "pending",
            estimatedHours: 40,
          },
          {
            id: "p2",
            name: "Phase 2",
            description: "Old",
            priority: 2,
            status: "pending",
            estimatedHours: 60,
          },
        ],
        lastUpdated: "2024-01-01",
      };

      const newRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "Test",
            priority: 1,
            status: "pending",
            estimatedHours: 40,
          },
        ],
        lastUpdated: "2024-01-02",
      };

      const result = synthesizer.synthesize(oldRoadmap, newRoadmap);

      expect(result.impactAssessment.phasesRemoved).toBe(1);
    });

    test("calculates estimated delta hours correctly", () => {
      const oldRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "Test",
            priority: 1,
            status: "pending",
            estimatedHours: 100,
          },
        ],
        lastUpdated: "2024-01-01",
      };

      const newRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "Test",
            priority: 1,
            status: "pending",
            estimatedHours: 150,
          },
        ],
        lastUpdated: "2024-01-02",
      };

      const result = synthesizer.synthesize(oldRoadmap, newRoadmap);

      expect(result.impactAssessment.estimatedDeltaHours).toBe(50);
    });

    test("assesses low risk for minor changes", () => {
      const oldRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "Test",
            priority: 1,
            status: "pending",
            estimatedHours: 40,
          },
        ],
        lastUpdated: "2024-01-01",
      };

      const newRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1 Updated",
            description: "Test",
            priority: 1,
            status: "pending",
            estimatedHours: 40,
          },
        ],
        lastUpdated: "2024-01-02",
      };

      const result = synthesizer.synthesize(oldRoadmap, newRoadmap);

      expect(result.impactAssessment.riskLevel).toBe("low");
    });

    test("assesses high risk for phase deletions", () => {
      const oldRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "Test",
            priority: 1,
            status: "pending",
            estimatedHours: 40,
          },
        ],
        lastUpdated: "2024-01-01",
      };

      const newRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [],
        lastUpdated: "2024-01-02",
      };

      const result = synthesizer.synthesize(oldRoadmap, newRoadmap);

      expect(result.impactAssessment.riskLevel).toBe("high");
    });

    test("assesses high risk for large hour increases", () => {
      const oldRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "Test",
            priority: 1,
            status: "pending",
            estimatedHours: 40,
          },
        ],
        lastUpdated: "2024-01-01",
      };

      const newRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "Test",
            priority: 1,
            status: "pending",
            estimatedHours: 300,
          },
        ],
        lastUpdated: "2024-01-02",
      };

      const result = synthesizer.synthesize(oldRoadmap, newRoadmap);

      expect(result.impactAssessment.riskLevel).toBe("high");
    });

    test("assesses medium risk for moderate changes", () => {
      const oldRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "Test",
            priority: 1,
            status: "pending",
            estimatedHours: 40,
          },
        ],
        lastUpdated: "2024-01-01",
      };

      const newRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "Test",
            priority: 1,
            status: "pending",
            estimatedHours: 100,
          },
        ],
        lastUpdated: "2024-01-02",
      };

      const result = synthesizer.synthesize(oldRoadmap, newRoadmap);

      expect(result.impactAssessment.riskLevel).toBe("medium");
    });
  });

  describe("edge cases", () => {
    test("handles empty roadmaps", () => {
      const oldRoadmap: Roadmap = {
        version: "1.0",
        name: "Empty Roadmap",
        phases: [],
        lastUpdated: "2024-01-01",
      };

      const newRoadmap: Roadmap = {
        version: "1.0",
        name: "Empty Roadmap",
        phases: [],
        lastUpdated: "2024-01-01",
      };

      const result = synthesizer.synthesize(oldRoadmap, newRoadmap);

      expect(result.deltas).toHaveLength(0);
      expect(result.impactAssessment.riskLevel).toBe("low");
    });

    test("handles large phase lists", () => {
      const oldRoadmap: Roadmap = {
        version: "1.0",
        name: "Large Roadmap",
        phases: Array.from({ length: 50 }, (_, i) => ({
          id: `p${i}`,
          name: `Phase ${i}`,
          description: "Test",
          priority: i % 3,
          status: "pending" as const,
          estimatedHours: 40 + i * 5,
        })),
        lastUpdated: "2024-01-01",
      };

      const newRoadmap: Roadmap = {
        version: "2.0",
        name: "Large Roadmap",
        phases: Array.from({ length: 50 }, (_, i) => ({
          id: `p${i}`,
          name: `Phase ${i} Updated`,
          description: "Test",
          priority: i % 3,
          status: "pending" as const,
          estimatedHours: 40 + i * 5,
        })),
        lastUpdated: "2024-01-02",
      };

      const result = synthesizer.synthesize(oldRoadmap, newRoadmap);

      expect(result.deltas.length).toBeGreaterThan(0);
      expect(result.impactAssessment.phasesModified).toBe(50);
    });

    test("handles phases with no hours estimate", () => {
      const oldRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "Test",
            priority: 1,
            status: "pending",
            estimatedHours: 0,
          },
        ],
        lastUpdated: "2024-01-01",
      };

      const newRoadmap: Roadmap = {
        version: "1.0",
        name: "Test Roadmap",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "Test",
            priority: 1,
            status: "pending",
            estimatedHours: 100,
          },
        ],
        lastUpdated: "2024-01-02",
      };

      const result = synthesizer.synthesize(oldRoadmap, newRoadmap);

      expect(result.impactAssessment.estimatedDeltaHours).toBe(100);
    });
  });
});
