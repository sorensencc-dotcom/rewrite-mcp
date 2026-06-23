"use strict";
// File: projects/cic/src/mee/auto-evolution-engine.ts | Date: 2026-06-03 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoEvolutionEngine = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
class AutoEvolutionEngine {
    constructor(trigger, generator, synth, validator, store) {
        this.trigger = trigger;
        this.generator = generator;
        this.synth = synth;
        this.validator = validator;
        this.store = store;
        this.enabled = false;
        this.lastRun = null;
        this.intervalId = null;
        this.requireApproval = true;
    }
    enable(intervalMs = 60000) {
        if (this.enabled)
            return;
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
    setRequireApproval(req) {
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
        if (!this.enabled)
            return;
        this.lastRun = Date.now();
        const events = this.trigger.detectTriggers();
        const event = events[0];
        if (!event)
            return;
        const plan = this.generator.generate(event);
        const propId = `prop-${node_crypto_1.default.randomUUID()}`;
        const proposal = {
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
        const created = [];
        for (const patch of patchSet.patches) {
            const full = node_path_1.default.join(process.cwd(), patch.path);
            node_fs_1.default.mkdirSync(node_path_1.default.dirname(full), { recursive: true });
            node_fs_1.default.writeFileSync(full, patch.content, "utf8");
            created.push(patch.path);
        }
        this.store.update(proposal.id, {
            status: "applied",
            filesCreated: created,
        });
    }
}
exports.AutoEvolutionEngine = AutoEvolutionEngine;
//# sourceMappingURL=auto-evolution-engine.js.map