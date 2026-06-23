"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmbIntentSynthesizer = void 0;
const ambPolicyInterpreter_js_1 = require("./ambPolicyInterpreter.js");
const node_crypto_1 = __importDefault(require("node:crypto"));
class AmbIntentSynthesizer {
    constructor(charter) {
        this.interpreter = new ambPolicyInterpreter_js_1.AmbPolicyInterpreter(charter);
    }
    synthesizeIntents(runId, priorities, signals) {
        const intents = [];
        for (const p of priorities) {
            // Filter out low priority score signals
            if (p.priority_score < 0.3)
                continue;
            const intentId = `amb-intent-${node_crypto_1.default.randomUUID().substring(0, 8)}`;
            let summary = "";
            const references = [];
            const requiredTests = ["npm test"];
            const targetDomains = {
                cic_config: false,
                mas_topology: false,
                ckg_graph: false,
                rl_fusion: false
            };
            const outcomes = {
                description: "",
                metrics: {}
            };
            if (p.intent_type === "graph_distillation") {
                summary = "Reduce CKG entropy and stale nodes for high-drift tenants.";
                targetDomains.ckg_graph = true;
                outcomes.description = "Compress stale capability clusters and reduce graph entropy.";
                outcomes.metrics = { graph_entropy_reduction: 0.12 };
                const staleRatio = signals.distillation_stats?.stale_node_ratio ?? 0.0;
                if (staleRatio > 0) {
                    references.push(`stale_ratio:${staleRatio}`);
                }
            }
            else if (p.intent_type === "planner_tuning") {
                summary = "Refine Planner heuristics to optimize capability matching.";
                targetDomains.cic_config = true;
                outcomes.description = "Improve planning accuracy and resolve system-wide discrepancies.";
                outcomes.metrics = { planner_accuracy_gain: 0.15 };
                const drift = signals.drift_metrics?.tenant_drift_index ?? 0.0;
                if (drift > 0) {
                    references.push(`drift_index:${drift}`);
                }
            }
            else if (p.intent_type === "mas_stability") {
                summary = "Optimize agent roles and communication routes to resolve consensus bottlenecks.";
                targetDomains.mas_topology = true;
                outcomes.description = "Stabilize MAS coordination agreements and decrease critique cycles.";
                outcomes.metrics = { consensus_improvement: 0.08 };
                const consensus = signals.mas_health?.agent_consensus_rate ?? 0.0;
                references.push(`consensus_rate:${consensus}`);
            }
            else if (p.intent_type === "rl_fusion") {
                summary = "Dispatch design and outreach evolution cycle for active tenants.";
                targetDomains.rl_fusion = true;
                requiredTests.push("npm run test:rewrite-labs");
                outcomes.description = "Drive conversion optimizing redesign and trace execution lineage.";
                outcomes.metrics = { conversion_rate_lift: 0.05 };
                references.push("tenant:omega-corp");
            }
            const draftIntent = {
                intent_id: intentId,
                run_id: runId,
                timestamp: new Date().toISOString(),
                version: "v0.1.0",
                source: "AMB",
                intent_type: p.intent_type,
                priority_score: p.priority_score,
                risk_class: "low", // populated by interpreter
                policy_alignment: {
                    forbidden_domain: false,
                    operator_required: false,
                    lineage_required: false,
                    rl_dependent: false
                }, // populated by interpreter
                justification: {
                    summary,
                    signals: {
                        drift_metrics: signals.drift_metrics ? { tenant_drift_index: signals.drift_metrics.tenant_drift_index ?? 0 } : undefined,
                        distillation_stats: signals.distillation_stats ? { stale_node_ratio: signals.distillation_stats.stale_node_ratio ?? 0 } : undefined,
                        mas_health: signals.mas_health ? { agent_consensus_rate: signals.mas_health.agent_consensus_rate ?? 0 } : undefined,
                        rl_metrics: signals.rl_metrics ? { average_lighthouse_improvement: signals.rl_metrics.average_lighthouse_improvement ?? 0 } : undefined
                    },
                    references
                },
                constraints: {
                    required_tests: requiredTests,
                    required_challenge_runs: ["baseline"], // populated below
                    required_operator_actions: ["review_decisions_json"] // populated below
                },
                target_domains: targetDomains,
                desired_outcomes: outcomes
            };
            const policyEval = this.interpreter.applyPolicy(draftIntent);
            const requiredChallengeRuns = ["baseline"];
            if (p.intent_type === "graph_distillation")
                requiredChallengeRuns.push("distillation");
            if (p.intent_type === "rl_fusion")
                requiredChallengeRuns.push("fusion", "full_stack");
            const requiredOperatorActions = ["review_decisions_json"];
            if (policyEval.risk_class === "high" || policyEval.policy_alignment.operator_required) {
                requiredOperatorActions.push("approve_high_risk_changes");
            }
            policyEval.constraints.required_challenge_runs = requiredChallengeRuns;
            policyEval.constraints.required_operator_actions = requiredOperatorActions;
            intents.push(policyEval);
        }
        return intents;
    }
}
exports.AmbIntentSynthesizer = AmbIntentSynthesizer;
//# sourceMappingURL=ambIntentSynthesizer.js.map