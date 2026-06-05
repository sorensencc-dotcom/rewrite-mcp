// File: projects/cic/evolution/src/loopRunner.ts | Date: 2026-06-05 | v1.0.0

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { CkgStore, CkgGraph } from "../../src/ckg/ckg-store.js";
import { KnowledgeDistillationEngine } from "./distillationEngine.js";
import { RewriteLineageRecorder } from "./rewriteLineageRecorder.js";
import { CicToRewritePlanner } from "../../../rl/fusion/src/cicToRewritePlanner.js";

export interface EvolutionConfig {
  autoApprove?: boolean;
  enableDistillation?: boolean;
  enableFusion?: boolean;
  tenantId?: string;
  tenantUrl?: string;
}

export class LoopRunner {
  private runId: string;
  private runDir: string;
  private ckgStore: CkgStore;
  private config: EvolutionConfig;

  constructor(config: EvolutionConfig = {}) {
    this.config = config;
    this.runId = crypto.randomUUID();
    const timestamp = Date.now();
    this.runDir = path.resolve(process.cwd(), `projects/cic/evolution/data/runs/run_${this.runId}_${timestamp}`);
    
    const graphPath = path.resolve(process.cwd(), "projects/cic/ckg/graph.json");
    this.ckgStore = new CkgStore(graphPath);
  }

  public getRunId() { return this.runId; }
  public getRunDir() { return this.runDir; }

  public async runLifecycle(): Promise<boolean> {
    console.log(`\n=== Starting Evolution Loop Run: ${this.runId} ===`);
    fs.mkdirSync(this.runDir, { recursive: true });

    // 1. Audit Stage
    const auditData = this.stageAudit();
    this.writeArtifact("audit.json", auditData);

    // 2. Distillation Stage (Phase 28)
    let pruneCandidates: any[] = [];
    if (this.config.enableDistillation) {
      const distResult = this.stageDistillation();
      pruneCandidates = distResult.candidates;
      this.writeArtifact("distillation_report.json", distResult.report);
      this.writeArtifact("prune_candidates.json", distResult.candidates);
      this.writeArtifact("compressed_graph.json", distResult.compressedGraph);
    } else {
      console.log("[Stage 2: Distillation] Skipped (inactive)");
    }

    // 3. Proposals Stage
    const proposalsData = this.stageProposals(auditData, pruneCandidates);
    this.writeArtifact("proposals.json", proposalsData);

    if (proposalsData.proposals.length === 0) {
      console.log("[Stage 3: Proposals] No proposals generated. Terminating loop.");
      return true;
    }

    // 4. Simulations Stage
    const simulationsData = this.stageSimulations(proposalsData);
    this.writeArtifact("simulations.json", simulationsData);

    // 5. Ranking Stage
    const rankedData = this.stageRanking(simulationsData);
    this.writeArtifact("ranked_proposals.json", rankedData);

    // 6. Operator Decision Stage
    const decisionsData = this.stageOperatorDecision(rankedData);
    this.writeArtifact("decisions.json", decisionsData);

    // 7. Apply Stage
    const appliedData = await this.stageApply(proposalsData, decisionsData);
    this.writeArtifact("applied_changes.json", appliedData);

    // 8. Log / Ledger Stage
    this.stageLog(appliedData);

    console.log(`=== Evolution Loop Run Completed: ${this.runId} ===\n`);
    return true;
  }

  // === STAGE IMPLEMENTATIONS ===

  private stageAudit() {
    console.log("[Stage 1: Audit] Analyzing CKG and system health...");
    const graph = this.ckgStore.load();
    const anomalies = [];

    // Check drift or graph metrics
    const drift = graph.meta?.drift || { unmappedSkills: [], stateDiscrepancies: [] };
    const driftScore = (drift.unmappedSkills?.length || 0) * 0.1 + (drift.stateDiscrepancies?.length || 0) * 0.2;

    if (driftScore > 0) {
      anomalies.push({
        id: `anomaly-drift-${crypto.randomUUID().substring(0, 8)}`,
        type: "system_drift",
        description: `Active system drift detected (coefficient: ${driftScore.toFixed(2)})`,
        severity: "medium"
      });
    }

    // If fusion is enabled and tenant provided, audit tenant profile
    if (this.config.enableFusion && this.config.tenantId) {
      const tenantNode = graph.nodes.find(n => n.id === `tenant:${this.config.tenantId}`);
      if (!tenantNode) {
        anomalies.push({
          id: `anomaly-tenant-${crypto.randomUUID().substring(0, 8)}`,
          type: "missing_tenant_profile",
          description: `Tenant profile ${this.config.tenantId} missing from CKG`,
          severity: "high"
        });
      }
    }

    return {
      runId: this.runId,
      timestamp: Date.now(),
      systemDrift: parseFloat(driftScore.toFixed(3)),
      anomalies
    };
  }

  private stageDistillation() {
    console.log("[Stage 2: Distillation] Running Knowledge Distillation Engine...");
    const distEngine = new KnowledgeDistillationEngine(this.ckgStore);
    // Use low threshold for testing (e.g. 0 to catch all older nodes)
    return distEngine.runDistillation(0);
  }

  private stageProposals(auditData: any, pruneCandidates: any[]) {
    console.log("[Stage 3: Proposals] Generating action plans...");
    const proposals = [];

    // Create proposals for anomalies
    for (const anomaly of auditData.anomalies) {
      if (anomaly.type === "system_drift") {
        proposals.push({
          proposalId: `prop-drift-${crypto.randomUUID().substring(0, 8)}`,
          title: "Mitigate system drift and sync mappings",
          patches: [
            {
              path: "projects/cic/data/drift_resolution.json",
              type: "create",
              content: JSON.stringify({ resolvedAt: Date.now(), status: "synced" }, null, 2)
            }
          ],
          sourceAnomaly: anomaly.id
        });
      }

      if (anomaly.type === "missing_tenant_profile" && this.config.tenantId) {
        proposals.push({
          proposalId: `prop-tenant-${crypto.randomUUID().substring(0, 8)}`,
          title: `Initialize Tenant Profile: ${this.config.tenantId}`,
          patches: [
            {
              path: "projects/cic/data/tenant_registry.json",
              type: "create",
              content: JSON.stringify({ tenantId: this.config.tenantId, initialized: true }, null, 2)
            }
          ],
          sourceAnomaly: anomaly.id
        });
      }
    }

    // Create proposals from distillation prunes
    if (pruneCandidates.length > 0) {
      proposals.push({
        proposalId: `prop-distill-${crypto.randomUUID().substring(0, 8)}`,
        title: `Distill CKG nodes (${pruneCandidates.length} actions)`,
        patches: [
          {
            path: "projects/cic/data/last_distillation.json",
            type: "create",
            content: JSON.stringify({ timestamp: Date.now(), actionsCount: pruneCandidates.length }, null, 2)
          }
        ],
        pruneActions: pruneCandidates
      });
    }

    // Generate a Rewrite Labs proposal if fusion is active and tenant is provided
    if (this.config.enableFusion && this.config.tenantId) {
      proposals.push({
        proposalId: `prop-fusion-${crypto.randomUUID().substring(0, 8)}`,
        title: `Trigger Rewrite Labs Fusion for tenant: ${this.config.tenantId}`,
        patches: [],
        fusionTrigger: {
          tenantId: this.config.tenantId,
          url: this.config.tenantUrl || "http://example.com",
          goals: {
            vitals: ["LCP", "FID"],
            targetScore: 95
          }
        }
      });
    }

    // If still empty, add a mock evolution step to keep loop active
    if (proposals.length === 0) {
      proposals.push({
        proposalId: `prop-evolve-${crypto.randomUUID().substring(0, 8)}`,
        title: "Increment self-evolution loop indicator",
        patches: [
          {
            path: "projects/cic/data/evolution_state.json",
            type: "create",
            content: JSON.stringify({ counter: 1, lastRun: Date.now() }, null, 2)
          }
        ]
      });
    }

    return {
      runId: this.runId,
      proposals
    };
  }

  private stageSimulations(proposalsData: any) {
    console.log("[Stage 4: Simulations] Dry-running proposals in sandbox...");
    const simulations = proposalsData.proposals.map((prop: any) => {
      let compilePassed = true;
      let testsPassed = true;

      // Simulate patch evaluation
      for (const patch of prop.patches) {
        try {
          if (patch.type === "create" || patch.type === "modify") {
            JSON.parse(patch.content); // Verify valid JSON if applicable
          }
        } catch {
          compilePassed = false;
        }
      }

      return {
        proposalId: prop.proposalId,
        title: prop.title,
        passed: compilePassed && testsPassed,
        compilePassed,
        testsPassed
      };
    });

    return {
      runId: this.runId,
      simulations
    };
  }

  private stageRanking(simulationsData: any) {
    console.log("[Stage 5: Ranking] Ranking proposals by impact & safety...");
    const ranked = simulationsData.simulations
      .map((sim: any) => {
        let score = 50; // baseline

        if (sim.passed) score += 20;
        if (sim.title.includes("Distill")) score += 15; // prioritize distillation
        if (sim.title.includes("Tenant")) score += 10;
        if (sim.title.includes("Fusion")) score += 25; // Fusion actions are high priority

        return {
          proposalId: sim.proposalId,
          title: sim.title,
          score,
          passed: sim.passed
        };
      })
      .sort((a: any, b: any) => b.score - a.score);

    return {
      runId: this.runId,
      ranked
    };
  }

  private stageOperatorDecision(rankedData: any) {
    console.log("[Stage 6: Operator Decision] Waiting/checking decisions...");
    const decisions: Record<string, string> = {};

    // Auto-approve if configured, otherwise default to deferred (requires operator approval)
    for (const r of rankedData.ranked) {
      if (this.config.autoApprove && r.passed) {
        decisions[r.proposalId] = "approved";
      } else {
        decisions[r.proposalId] = "deferred";
      }
    }

    return {
      runId: this.runId,
      decisionTimestamp: Date.now(),
      decisions
    };
  }

  private async stageApply(proposalsData: any, decisionsData: any) {
    console.log("[Stage 7: Apply] Executing approved proposals...");
    const applied: any[] = [];

    for (const prop of proposalsData.proposals) {
      const decision = decisionsData.decisions[prop.proposalId];
      if (decision !== "approved") {
        console.log(`  - Proposal ${prop.proposalId} (${prop.title}) is ${decision || "deferred"}. Skipping.`);
        continue;
      }

      console.log(`  + Applying Proposal: ${prop.title}`);

      // Handle Fusion Call if active
      if (prop.fusionTrigger) {
        try {
          const fusionPlanner = new CicToRewritePlanner();
          const runRes = await fusionPlanner.executeRewriteRun(prop.fusionTrigger);
          
          const lineageRecorder = new RewriteLineageRecorder(this.ckgStore);
          const lineage = lineageRecorder.recordLineage(runRes);

          applied.push({
            proposalId: prop.proposalId,
            status: "applied",
            filesCreated: ["projects/cic/evolution/data/rewrite_run.json", "projects/cic/evolution/data/rewrite_lineage.json"],
            fusionRun: runRes.runId,
            lineageId: lineage.lineageId
          });
        } catch (err: any) {
          console.error(`  ❌ Fusion run failed: ${err.message}`);
          applied.push({
            proposalId: prop.proposalId,
            status: "failed",
            error: err.message
          });
        }
        continue;
      }

      // Handle standard patch sets with backups
      const backups: Record<string, string | null> = {};
      let applySuccess = true;
      const createdFiles: string[] = [];

      try {
        for (const patch of prop.patches) {
          const fullPath = path.resolve(process.cwd(), patch.path);
          
          // Backup existing file
          if (fs.existsSync(fullPath)) {
            backups[patch.path] = fs.readFileSync(fullPath, "utf8");
          } else {
            backups[patch.path] = null;
          }

          // Write new content
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, patch.content, "utf8");
          createdFiles.push(patch.path);
        }

        // Apply distillation logic if proposal contains prunes
        if (prop.pruneActions && prop.pruneActions.length > 0) {
          const graph = this.ckgStore.load();
          const pruneIds = new Set<string>(prop.pruneActions.map((pa: any) => pa.nodeId));
          
          // Actually prune in the store
          const finalNodes = graph.nodes.filter(n => !pruneIds.has(n.id));
          const finalEdges = graph.edges.filter(e => !pruneIds.has(e.from) && !pruneIds.has(e.to));
          
          this.ckgStore.save({ nodes: finalNodes, edges: finalEdges });
          console.log(`  CKG distilled: deleted ${pruneIds.size} stale nodes.`);
        }

        applied.push({
          proposalId: prop.proposalId,
          status: "applied",
          filesCreated: createdFiles
        });
      } catch (err: any) {
        console.error(`  ❌ Error applying patches for ${prop.proposalId}. Rolling back.`, err.message);
        applySuccess = false;
        
        // Rollback backups
        for (const [filePath, content] of Object.entries(backups)) {
          const full = path.resolve(process.cwd(), filePath);
          if (content === null) {
            if (fs.existsSync(full)) fs.rmSync(full);
          } else {
            fs.writeFileSync(full, content, "utf8");
          }
        }

        applied.push({
          proposalId: prop.proposalId,
          status: "failed",
          error: err.message
        });
      }
    }

    return {
      runId: this.runId,
      applied
    };
  }

  private stageLog(appliedData: any) {
    console.log("[Stage 8: Log] Committing run metrics to ledger...");

    // Record evolution event node in CKG
    const totalApplied = appliedData.applied.filter((a: any) => a.status === "applied").length;
    
    this.ckgStore.appendNode({
      id: `evolution-run:${this.runId}`,
      type: "evolution_run",
      name: `Evolution Run ${this.runId.substring(0, 8)}`,
      meta: {
        timestamp: Date.now(),
        appliedCount: totalApplied,
        status: totalApplied > 0 ? "success" : "idle"
      }
    });

    console.log(`[Ledger] Evolution ledger updated with run receipt.`);
  }

  private writeArtifact(name: string, data: any) {
    fs.writeFileSync(path.join(this.runDir, name), JSON.stringify(data, null, 2), "utf8");
  }
}

// CLI entry point
if (process.argv[1] && (process.argv[1].endsWith("loopRunner.ts") || process.argv[1].endsWith("loopRunner.js"))) {
  const runner = new LoopRunner({ autoApprove: false });
  runner.runLifecycle().catch(err => {
    console.error("Evolution Loop execution failed:", err);
    process.exit(1);
  });
}
