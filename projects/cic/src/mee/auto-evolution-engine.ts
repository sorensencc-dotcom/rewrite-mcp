// File: projects/cic/src/mee/auto-evolution-engine.ts | Date: 2026-06-03 | v1.0.0

import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { MeeTriggerEngine } from "./mee-trigger.js";
import { MeePhaseGenerator } from "./mee-generator.js";
import { MeePatchSynthesizer } from "./mee-synthesizer.js";
import { MeeValidator } from "./mee-validator.js";
import { MeeProposalStore } from "./mee-proposal-store.js";
import { PhaseProposal } from "./mee-schema.js";

export class AutoEvolutionEngine {
  private enabled = false;
  private lastRun: number | null = null;
  private intervalId: any = null;
  private requireApproval = true;

  constructor(
    private readonly trigger: MeeTriggerEngine,
    private readonly generator: MeePhaseGenerator,
    private readonly synth: MeePatchSynthesizer,
    private readonly validator: MeeValidator,
    private readonly store: MeeProposalStore
  ) {}

  enable(intervalMs: number = 60000) {
    if (this.enabled) return;
    this.enabled = true;
    this.lastRun = Date.now();
    
    // Fire first tick asynchronously
    this.tick().catch((err) => console.error("AutoEvolution tick error:", err));

    this.intervalId = setInterval(() => {
      this.tick().catch((err) => console.error("AutoEvolution tick error:", err));
    }, intervalMs);
  }

  disable() {
    this.enabled = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  setRequireApproval(req: boolean) {
    this.requireApproval = req;
  }

  status() {
    return {
      enabled: this.enabled,
      lastRun: this.lastRun,
      requireApproval: this.requireApproval
    };
  }

  async tick() {
    if (!this.enabled) return;

    this.lastRun = Date.now();

    const events = this.trigger.detectTriggers();
    const event = events[0];
    if (!event) return;

    const plan = this.generator.generate(event);
    const propId = `prop-${crypto.randomUUID()}`;

    const proposal: PhaseProposal = {
      id: propId,
      title: plan.title,
      trigger: event,
      status: "pending",
      filesCreated: [],
      planSummary: plan.objectives.join("; "),
      timestamp: Date.now(),
    };

    this.store.add(proposal);

    const patchSet = this.synth.synthesize(proposal);
    const report = await this.validator.validateAll(patchSet);

    if (!report.passed) {
      this.store.update(proposal.id, { status: "rejected" });
      return;
    }

    if (this.requireApproval) {
      // Validation passes, but require manual operator click to apply
      this.store.update(proposal.id, {
        status: "validated",
        filesCreated: patchSet.patches.map((p) => p.path)
      });
      return;
    }

    // Auto-apply if configured to bypass manual approval
    const created: string[] = [];
    for (const patch of patchSet.patches) {
      const full = path.join(process.cwd(), patch.path);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, patch.content, "utf8");
      created.push(patch.path);
    }

    this.store.update(proposal.id, {
      status: "applied",
      filesCreated: created,
    });
  }
}
