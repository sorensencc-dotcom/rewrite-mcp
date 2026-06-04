// File: projects/cic/src/mee/mee-kg.ts | Date: 2026-06-04 | v1.0.0

import { CkgStore, CkgGraph, CkgNode, CkgEdge } from "../ckg/ckg-store.js";
import { MeeAgentCritique } from "./mee-schema.js";

export class MeeKnowledgeGraph {
  constructor(private readonly store: CkgStore) {}

  public recordTaskNode(taskId: string, title: string, type: string, dependsOn: string[]) {
    this.store.appendNode({
      id: taskId,
      type: "task",
      name: title,
      meta: { taskType: type }
    });
    for (const dep of dependsOn) {
      this.store.appendEdge({
        from: taskId,
        to: dep,
        type: "depends_on"
      });
    }
  }

  public recordProposalNode(proposalId: string, title: string, planSummary: string, filesCreated: string[]) {
    this.store.appendNode({
      id: proposalId,
      type: "proposal",
      name: title,
      meta: { planSummary }
    });
    for (const file of filesCreated) {
      this.store.appendNode({
        id: file,
        type: "file",
        name: file
      });
      this.store.appendEdge({
        from: proposalId,
        to: file,
        type: "refines"
      });
    }
  }

  public recordCritiqueEdge(proposalId: string, critique: MeeAgentCritique) {
    this.store.appendNode({
      id: critique.agentId,
      type: "agent",
      name: critique.agentId
    });
    this.store.appendEdge({
      from: proposalId,
      to: critique.agentId,
      type: "critique_by",
      meta: { severity: critique.severity, issue: critique.issue }
    });
  }

  public recordFailureNode(failureId: string, proposalId: string, errorCode: string, message: string) {
    this.store.appendNode({
      id: failureId,
      type: "failure",
      name: errorCode,
      meta: { message }
    });
    this.store.appendEdge({
      from: proposalId,
      to: failureId,
      type: "caused_failure"
    });
  }

  public recordHealingEdge(healingProposalId: string, failureId: string) {
    this.store.appendEdge({
      from: healingProposalId,
      to: failureId,
      type: "fixed_by"
    });
  }

  public getFragileModules(): { path: string; failureCount: number }[] {
    const graph = this.store.load();
    const failures = graph.nodes.filter(n => n.type === "failure");
    const counts = new Map<string, number>();

    for (const fail of failures) {
      const edgeToFail = graph.edges.find(e => e.to === fail.id && e.type === "caused_failure");
      if (edgeToFail) {
        const proposalId = edgeToFail.from;
        const refinesEdges = graph.edges.filter(e => e.from === proposalId && e.type === "refines");
        for (const edge of refinesEdges) {
          const filePath = edge.to;
          counts.set(filePath, (counts.get(filePath) || 0) + 1);
        }
      }
    }

    return Array.from(counts.entries())
      .map(([path, failureCount]) => ({ path, failureCount }))
      .sort((a, b) => b.failureCount - a.failureCount);
  }

  public getSafetyRisks(): string[] {
    const graph = this.store.load();
    const critiques = graph.edges.filter(e => e.type === "critique_by" && e.meta?.severity === "error");
    return Array.from(new Set(critiques.map(c => c.meta?.issue || ""))).filter(Boolean);
  }

  public getGraph(): CkgGraph {
    return this.store.load();
  }
}
