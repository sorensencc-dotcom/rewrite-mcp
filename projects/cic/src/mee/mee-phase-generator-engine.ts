// File: projects/cic/src/mee/mee-phase-generator-engine.ts | Date: 2026-06-04 | v1.0.0

import crypto from "node:crypto";
import { MeePhaseSpec, ResearchFinding, MeeConsensusResult, MeeAgentTask, MeeAgentCritique } from "./mee-schema.js";
import { MeeAgentOrchestrator } from "./mee-agent-orchestrator.js";

export class MeePhaseGeneratorEngine {
  constructor(private readonly threshold: number = 70) {}

  generatePhaseSpec(findings: ResearchFinding[], nextPhaseNumber: number = 43): MeePhaseSpec {
    const primaryFinding = findings[0];
    const title = primaryFinding 
      ? `Autonomous Evolution: Refinement of ${primaryFinding.title}`
      : `Autonomous System-wide Optimization Phase`;
    
    const purpose = primaryFinding
      ? `Autonomously generated phase addressing the architectural gap: ${primaryFinding.description}`
      : `Autonomously generated phase for proactive optimization of memory and task processing pathways.`;

    const objectives = [
      "Mitigate primary research finding vulnerabilities",
      "Establish defensive coding envelopes",
      "Deploy regression test coverage"
    ];
    if (primaryFinding) {
      objectives.unshift(`Analyze and resolve: ${primaryFinding.title}`);
    }

    const tasks = [
      "Refactor target module interfaces to enforce strict schemas",
      "Extend vitest validation framework with regression suites",
      "Synchronize system architectural documentation",
      "Integrate outcome metrics into Knowledge Graph"
    ];

    const requiredCapabilities = ["ast-parsing", "consensus-validation"];
    if (primaryFinding?.category === "bug") {
      requiredCapabilities.push("runtime-debugging");
    }

    const estimatedImpact = primaryFinding?.severity === "critical" ? 95 : primaryFinding?.severity === "high" ? 85 : 70;
    const feasibility = 80; // Baseline feasibility
    const risk = primaryFinding?.severity === "critical" ? 45 : 20; // Critical bug resolution is riskier
    const alignment = 90; // Default aligned with roadmap

    const spec: MeePhaseSpec = {
      id: `phase-spec-${crypto.randomUUID()}`,
      phaseNumber: nextPhaseNumber,
      title,
      purpose,
      objectives,
      tasks,
      requiredCapabilities,
      estimatedImpact,
      feasibility,
      risk,
      alignment,
      score: 0,
      status: "draft",
      findings,
      timestamp: Date.now()
    };

    spec.score = this.scorePhaseSpec(spec);
    return spec;
  }

  scorePhaseSpec(spec: MeePhaseSpec): number {
    const rawScore = (spec.estimatedImpact * 0.4) + (spec.feasibility * 0.3) - (spec.risk * 0.2) + (spec.alignment * 0.3);
    return Math.max(0, Math.min(100, Math.round(rawScore)));
  }

  async runValidationRound(
    spec: MeePhaseSpec,
    orchestrator: MeeAgentOrchestrator,
    jobId: string
  ): Promise<MeeConsensusResult> {
    const agents = orchestrator.getAgents();
    const critiqueTasks: MeeAgentTask[] = [];
    const now = new Date().toISOString();

    for (const agent of agents) {
      if (agent.role === "planner" || agent.role === "safety" || agent.role === "research") {
        critiqueTasks.push({
          id: crypto.randomUUID(),
          agentId: agent.id,
          jobId,
          createdAt: now,
          type: "critique_phase_spec",
          payload: { spec },
          status: "pending"
        });
      }
    }

    const allTasks = orchestrator.loadTasks();
    allTasks.push(...critiqueTasks);
    orchestrator.saveTasks(allTasks);

    const exchanges = await orchestrator.runCritiqueRound(critiqueTasks);
    const critiques: MeeAgentCritique[] = [];

    for (const exchange of exchanges) {
      try {
        const data = JSON.parse(exchange.content);
        if (data.critiques) {
          critiques.push(...data.critiques);
        }
      } catch (e) {
        console.error("Failed to parse critiques from agent spec response:", e);
      }
    }

    const result = orchestrator.runConsensusRound(critiques, spec.id, 1);
    return result;
  }
}
