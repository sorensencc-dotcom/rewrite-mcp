// File: projects/cic/evolution/src/amb/ambRunner.ts | Date: 2026-06-05 | v1.0.0

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { CkgStore } from "../../../src/ckg/ckg-store.js";
import { AmbPriorityEngine, AmbSignals } from "./ambPriorityEngine.js";
import { AmbIntentSynthesizer } from "./ambIntentSynthesizer.js";
import { AmbGovernanceGate } from "./ambGovernanceGate.js";
import { LoopRunner } from "../loopRunner.js";

export class AmbRunner {
  private runId: string;
  private timestamp: string;
  private ckgStore: CkgStore;
  private priorityEngine = new AmbPriorityEngine();
  private intentSynthesizer = new AmbIntentSynthesizer();
  private governanceGate = new AmbGovernanceGate();

  constructor() {
    this.runId = crypto.randomUUID();
    this.timestamp = new Date().toISOString();
    const graphPath = path.resolve(process.cwd(), "projects/cic/ckg/graph.json");
    this.ckgStore = new CkgStore(graphPath);
  }

  public async run(options: { triggerLoop?: boolean } = {}): Promise<boolean> {
    console.log(`\n=== Starting AMB Orchestrator Run: ${this.runId} ===`);

    // 1. Gather Signals
    const signals = this.collectSignals();
    console.log("[AMB] Signals gathered successfully.");

    // 2. Compute Priorities
    const priorities = this.priorityEngine.computePriorities(signals);
    console.log("[AMB] Computed evolution priorities:", priorities);

    // 3. Synthesize and Align Intents
    const rawIntents = this.intentSynthesizer.synthesizeIntents(this.runId, priorities, signals);
    console.log(`[AMB] Synthesized ${rawIntents.length} raw evolution intents.`);

    // 4. Governance Filtering
    const { approvedIntents, report: govReport } = this.governanceGate.evaluateIntents(rawIntents);
    console.log(`[AMB] Governance check completed. Approved: ${approvedIntents.length}, Rejected: ${govReport.rejectedCount}`);

    // Filter approved intents (non-operator required for auto-trigger)
    const approvedNonOperatorIntents = approvedIntents.filter(i => i.policy_alignment.operator_required === false);

    // Trigger Evolution Loop if approved intents exist
    let triggeredRunId: string | undefined;
    if (options.triggerLoop && approvedNonOperatorIntents.length > 0) {
      console.log(`[AMB] Triggering Evolution Loop with ${approvedNonOperatorIntents.length} approved intents...`);
      const loop = new LoopRunner({ autoApprove: true, ambIntents: approvedNonOperatorIntents });
      await loop.runLifecycle();
      triggeredRunId = loop.getRunId();
    } else {
      console.log("[AMB] Evolution Loop trigger skipped or no approved intents available.");
    }

    // 5. Persist output artifacts
    this.persistArtifacts(approvedIntents, govReport, signals, triggeredRunId, approvedNonOperatorIntents.map(i => i.intent_id));

    console.log(`=== AMB Orchestrator Run Completed: ${this.runId} ===\n`);
    return true;
  }

  private collectSignals(): AmbSignals {
    console.log("[AMB] Reading system metrics and CKG graphs...");

    const graph = this.ckgStore.load();
    
    // Read active drift
    const drift = graph.meta?.drift || { unmappedSkills: [], stateDiscrepancies: [] };
    const driftIndex = (drift.unmappedSkills?.length || 0) * 0.15 + (drift.stateDiscrepancies?.length || 0) * 0.25;

    // Read distillation stats if reports are present
    let staleNodeRatio = 0.15; 
    let redundantNodeRatio = 0.1;
    const evolutionDir = path.resolve(process.cwd(), "projects/cic/evolution/data");
    
    try {
      const distillationReportPath = path.join(evolutionDir, "distillation_report.json");
      if (fs.existsSync(distillationReportPath)) {
        const report = JSON.parse(fs.readFileSync(distillationReportPath, "utf8"));
        const total = report.metrics.originalNodesCount || 1;
        staleNodeRatio = (report.metrics.staleNodesFound || 0) / total;
        redundantNodeRatio = (report.metrics.redundantNodesFound || 0) / total;
      }
    } catch {
      // fallback metrics
    }

    // Introspect MAS coordination indicators (simulated)
    let consensusRate = 0.85;
    let critiqueCount = 2;

    // Introspect Rewrite Labs outputs (simulated)
    let lighthouseImprovement = 12.5;
    let conversionRate = 0.04;

    try {
      const lineagePath = path.join(evolutionDir, "rewrite_lineage.json");
      if (fs.existsSync(lineagePath)) {
        const lineage = JSON.parse(fs.readFileSync(lineagePath, "utf8"));
        lighthouseImprovement = Math.abs(lineage.redesign?.metrics?.accessibilityDelta || 10.0);
        conversionRate = 0.06;
      }
    } catch {
      // fallback metrics
    }

    return {
      drift_metrics: { tenant_drift_index: parseFloat(driftIndex.toFixed(2)) },
      distillation_stats: { 
        stale_node_ratio: parseFloat(staleNodeRatio.toFixed(2)), 
        redundant_node_ratio: parseFloat(redundantNodeRatio.toFixed(2)) 
      },
      mas_health: { 
        agent_consensus_rate: consensusRate, 
        critique_count: critiqueCount 
      },
      rl_metrics: { 
        average_lighthouse_improvement: lighthouseImprovement, 
        conversion_rate: conversionRate 
      }
    };
  }

  private persistArtifacts(approvedIntents: any[], govReport: any, signals: AmbSignals, triggeredRunId?: string, intentIds?: string[]) {
    const ambDir = path.resolve(process.cwd(), "projects/cic/evolution/data/evolution/amb");
    
    const intentsDir = path.join(ambDir, "intents");
    const logsDir = path.join(ambDir, "logs");
    const reportsDir = path.join(ambDir, "reports");

    fs.mkdirSync(intentsDir, { recursive: true });
    fs.mkdirSync(logsDir, { recursive: true });
    fs.mkdirSync(reportsDir, { recursive: true });

    // 1. Write approved intents
    fs.writeFileSync(
      path.join(intentsDir, `amb_intents_${this.runId}.json`),
      JSON.stringify({ runId: this.runId, timestamp: this.timestamp, intents: approvedIntents }, null, 2),
      "utf8"
    );

    // 2. Write log file containing governance trace logs
    fs.writeFileSync(
      path.join(logsDir, `amb_log_${this.runId}.json`),
      JSON.stringify(
        {
          runId: this.runId,
          timestamp: this.timestamp,
          governanceReport: govReport,
          signalsEvaluated: signals,
          triggered_evolution_run: triggeredRunId || null,
          intent_ids: intentIds || []
        },
        null,
        2
      ),
      "utf8"
    );

    // 3. Write summary report
    fs.writeFileSync(
      path.join(reportsDir, `amb_report_${this.runId}.json`),
      JSON.stringify(
        {
          runId: this.runId,
          timestamp: this.timestamp,
          status: govReport.approvedCount > 0 ? "intents_generated" : "idle",
          metrics: {
            highestPriorityScore: approvedIntents[0]?.priority_score || 0,
            approvedIntentsCount: govReport.approvedCount,
            rejectedIntentsCount: govReport.rejectedCount
          }
        },
        null,
        2
      ),
      "utf8"
    );

    console.log(`[AMB] Artifacts written successfully under ${ambDir}`);
  }
}

// CLI entry point
if (process.argv[1] && (process.argv[1].endsWith("ambRunner.ts") || process.argv[1].endsWith("ambRunner.js"))) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  let triggerLoop = !dryRun;
  if (args.includes("--trigger-loop=false") || args.includes("--no-trigger-loop")) {
    triggerLoop = false;
  }
  if (args.includes("--trigger-loop=true") || args.includes("--trigger-loop")) {
    triggerLoop = true;
  }

  const runner = new AmbRunner();
  runner.run({ triggerLoop }).catch(err => {
    console.error("AMB Runner execution failed:", err);
    process.exit(1);
  });
}
