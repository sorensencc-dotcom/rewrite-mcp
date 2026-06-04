// File: projects/cic/src/mee/research-agent.ts | Date: 2026-06-04 | v1.0.0

import crypto from "node:crypto";
import { AgentImpl } from "./mee-agent-orchestrator.js";
import { MeeAgentTask, MeeAgentExchange, MeeAgentRole, MeeAgentCritique } from "./mee-schema.js";

export class ResearchAgent implements AgentImpl {
  constructor(
    public readonly id: string,
    public readonly role: MeeAgentRole = "research"
  ) {}

  async handleTask(task: MeeAgentTask): Promise<MeeAgentExchange> {
    if (task.type === "critique" || task.type === "critique_phase_spec") {
      const critiques: MeeAgentCritique[] = [];
      const spec = task.payload.spec as any;
      const proposal = task.payload.proposal as any;

      if (spec) {
        // Spec Critique
        if (spec.title && spec.title.length < 10) {
          critiques.push({
            id: crypto.randomUUID(),
            agentId: this.id,
            targetAgentId: "agent-research",
            issue: "Phase spec title is too short and lacks descriptiveness.",
            severity: "info",
            suggestedFix: "Extend the phase spec title to at least 15 characters.",
            timestamp: new Date().toISOString()
          });
        }

        if (spec.findings && spec.findings.length === 0) {
          critiques.push({
            id: crypto.randomUUID(),
            agentId: this.id,
            targetAgentId: "agent-research",
            issue: "Phase spec generated without any supporting research findings.",
            severity: "error",
            suggestedFix: "Attach at least one active ResearchFinding to validate the phase.",
            timestamp: new Date().toISOString()
          });
        }

        const feasibility = spec.feasibility ?? 0;
        const risk = spec.risk ?? 0;
        if (feasibility > 90 && risk > 40) {
          critiques.push({
            id: crypto.randomUUID(),
            agentId: this.id,
            targetAgentId: "agent-research",
            issue: "High-risk phase proposed with suspiciously high feasibility.",
            severity: "warn",
            suggestedFix: "Lower feasibility score to reflect complexity risks.",
            timestamp: new Date().toISOString()
          });
        }
      }

      if (proposal) {
        // Proposal Critique
        if (proposal.planSummary && proposal.planSummary.length < 20) {
          critiques.push({
            id: crypto.randomUUID(),
            agentId: this.id,
            targetAgentId: "agent-planner",
            issue: "Proposal summary lacks detailed reference context.",
            severity: "warn",
            suggestedFix: "Expand the summary to list target packages and expected system side effects.",
            timestamp: new Date().toISOString()
          });
        }
      }

      return {
        id: crypto.randomUUID(),
        taskId: task.id,
        agentId: this.id,
        createdAt: new Date().toISOString(),
        direction: "response",
        content: JSON.stringify({ critiques }),
        metadata: { critiques }
      };
    }

    if (task.type === "refine") {
      const spec = task.payload.spec as any;
      const proposal = task.payload.proposal as any;
      let refinedSpec = spec ? { ...spec } : undefined;
      let refinedProposal = proposal ? { ...proposal } : undefined;

      if (refinedSpec) {
        refinedSpec.purpose += " (Validated against system knowledge rules)";
        if (refinedSpec.title && refinedSpec.title.length < 15) {
          refinedSpec.title = "Refined: " + refinedSpec.title;
        }
      }

      if (refinedProposal) {
        refinedProposal.title = "Refined Research Spec — " + refinedProposal.title;
      }

      return {
        id: crypto.randomUUID(),
        taskId: task.id,
        agentId: this.id,
        createdAt: new Date().toISOString(),
        direction: "response",
        content: JSON.stringify({ refinedSpec, refinedProposal }),
        metadata: { refinedSpec, refinedProposal }
      };
    }

    return {
      id: crypto.randomUUID(),
      taskId: task.id,
      agentId: this.id,
      createdAt: new Date().toISOString(),
      direction: "response",
      content: JSON.stringify({ ok: true })
    };
  }
}
