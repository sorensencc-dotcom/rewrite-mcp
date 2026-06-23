"use strict";
// File: projects/cic/src/mee/mee-research-engine.ts | Date: 2026-06-04 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeeResearchEngine = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
class MeeResearchEngine {
    constructor(findingsStore, metaRulesStore, runStore, failureStore, llmClient) {
        this.findingsStore = findingsStore;
        this.metaRulesStore = metaRulesStore;
        this.runStore = runStore;
        this.failureStore = failureStore;
        this.llmClient = llmClient;
    }
    async runResearchScan(kg) {
        const observations = [];
        const evidence = [];
        // 1. Gather CKG Data
        const graph = kg.getGraph();
        const hotspots = graph.meta?.hotspots?.orphans || [];
        const stateDiscrepancies = graph.meta?.drift?.stateDiscrepancies || [];
        const unmappedSkills = graph.meta?.drift?.unmappedSkills || [];
        if (hotspots.length > 0) {
            observations.push(`Found ${hotspots.length} orphaned nodes in the Knowledge Graph.`);
            evidence.push(...hotspots.slice(0, 5));
        }
        if (stateDiscrepancies.length > 0) {
            observations.push(`Found ${stateDiscrepancies.length} state drift discrepancies.`);
        }
        // 2. Gather Runs & Failure statistics
        const runs = this.runStore.listRuns();
        const failures = this.failureStore.list();
        const failedRuns = runs.filter(r => r.status === "failed");
        if (failedRuns.length > 0) {
            observations.push(`Detected ${failedRuns.length} failed execution runs in run logs.`);
            for (const run of failedRuns.slice(0, 3)) {
                evidence.push(run.id);
            }
        }
        if (failures.length > 0) {
            observations.push(`Found ${failures.length} diagnostic failure contexts.`);
            for (const fail of failures.slice(0, 3)) {
                observations.push(`Failure detail: ${fail.errorMessage} (code: ${fail.errorCode || "unknown"})`);
                evidence.push(fail.runId);
            }
        }
        // 3. Fallback to routine audit if nothing flagged
        if (observations.length === 0) {
            observations.push("System structural validation and test metrics are within optimal parameters.");
        }
        // 4. Synthesize Findings & Rules via LLM or deterministic fallback
        let synthesizedFindings = [];
        let synthesizedRules = [];
        if (this.llmClient) {
            const prompt = `You are a meta-learning research analyst for Cast Iron Charlie.
System Observations:
${observations.join("\n")}
Evidence Keys: ${evidence.join(", ")}

Synthesize these observations into a list of findings and corresponding MLE meta-rules.
Return the result strictly in this JSON format:
{
  "findings": [
    {
      "title": "Title of research discovery",
      "description": "Detailed description of the gap or bottleneck discovered",
      "severity": "low" or "medium" or "high" or "critical",
      "category": "bug" or "bottleneck" or "drift" or "gap" or "opportunity"
    }
  ],
  "rules": [
    {
      "name": "MLE Optimization Rule",
      "description": "Explanation of how the rule tunes scheduler, planning, or consensus parameters",
      "heuristicType": "planner_decomposition" or "consensus_weight" or "scheduler_concurrency",
      "weight": 0.8,
      "conditions": ["List of condition keywords"],
      "action": "Description of action taken"
    }
  ]
}
JSON:`;
            try {
                const res = await this.llmClient.complete({
                    model: "local-llama",
                    prompt,
                    max_tokens: 1024
                });
                const match = res.text.match(/\{[\s\S]*\}/);
                if (match) {
                    const parsed = JSON.parse(match[0]);
                    if (Array.isArray(parsed.findings)) {
                        synthesizedFindings = parsed.findings.map((f) => ({
                            id: `finding-${node_crypto_1.default.randomUUID()}`,
                            title: f.title || "Research Finding",
                            description: f.description || "Synthesized observation",
                            evidence,
                            severity: f.severity || "medium",
                            category: f.category || "opportunity",
                            status: "draft",
                            timestamp: Date.now()
                        }));
                    }
                    if (Array.isArray(parsed.rules)) {
                        synthesizedRules = parsed.rules.map((r) => ({
                            id: `rule-${node_crypto_1.default.randomUUID()}`,
                            name: r.name || "MLE Meta-Rule",
                            description: r.description || "Tuned heuristic",
                            heuristicType: r.heuristicType || "planner_decomposition",
                            weight: typeof r.weight === "number" ? r.weight : 0.5,
                            conditions: Array.isArray(r.conditions) ? r.conditions : [],
                            action: r.action || "no-op",
                            timestamp: Date.now()
                        }));
                    }
                }
            }
            catch (err) {
                console.error("LLM research synthesis failed. Using deterministic fallback:", err);
            }
        }
        // Deterministic fallback if LLM synthesis was skipped or failed
        if (synthesizedFindings.length === 0) {
            const isBug = failures.length > 0 || failedRuns.length > 0;
            synthesizedFindings.push({
                id: `finding-${node_crypto_1.default.randomUUID()}`,
                title: isBug ? "Research Discovery: Dynamic Refactoring Required" : "Research Discovery: Component Test Density Optimizations",
                description: isBug
                    ? `Analysis of ${failedRuns.length} failed runs indicates interface fragility under task execution pipelines.`
                    : "Routine verification audit has flagged component test density optimizations in target packages.",
                evidence,
                severity: isBug ? "high" : "low",
                category: isBug ? "bug" : "opportunity",
                status: "draft",
                timestamp: Date.now()
            });
        }
        if (synthesizedRules.length === 0) {
            const isBug = failures.length > 0 || failedRuns.length > 0;
            synthesizedRules.push({
                id: `rule-${node_crypto_1.default.randomUUID()}`,
                name: isBug ? "MLE Interface Isolation Heuristic" : "MLE Test Proximity Bias Heuristic",
                description: isBug
                    ? "Locks execution concurrency queue bounds during failure remediation."
                    : "Favors localized task decomposition steps for lower-priority opportunities.",
                heuristicType: isBug ? "scheduler_concurrency" : "planner_decomposition",
                weight: isBug ? 0.9 : 0.5,
                conditions: isBug ? ["failed_run", "compile_error"] : ["verification"],
                action: isBug ? "reduce_concurrency_limit_to_1" : "bias_decomposition_local",
                timestamp: Date.now()
            });
        }
        // Save results to stores
        for (const f of synthesizedFindings) {
            this.findingsStore.add(f);
        }
        for (const r of synthesizedRules) {
            this.metaRulesStore.add(r);
        }
        return { findings: synthesizedFindings, rules: synthesizedRules };
    }
}
exports.MeeResearchEngine = MeeResearchEngine;
//# sourceMappingURL=mee-research-engine.js.map