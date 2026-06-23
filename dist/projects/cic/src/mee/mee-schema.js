"use strict";
// File: projects/cic/src/mee/mee-schema.ts | Date: 2026-06-03 | v1.1.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.isResearchFinding = isResearchFinding;
exports.isMeePhaseSpec = isMeePhaseSpec;
exports.isMeeMetaRule = isMeeMetaRule;
exports.isRefactorInsight = isRefactorInsight;
function isResearchFinding(obj) {
    if (!obj || typeof obj !== "object")
        return false;
    return (typeof obj.id === "string" &&
        typeof obj.title === "string" &&
        typeof obj.description === "string" &&
        Array.isArray(obj.evidence) &&
        obj.evidence.every((e) => typeof e === "string") &&
        ["low", "medium", "high", "critical"].includes(obj.severity) &&
        ["bug", "bottleneck", "drift", "gap", "opportunity"].includes(obj.category) &&
        typeof obj.timestamp === "number" &&
        (obj.status === undefined || ["draft", "approved", "rejected", "promoted"].includes(obj.status)));
}
function isMeePhaseSpec(obj) {
    if (!obj || typeof obj !== "object")
        return false;
    return (typeof obj.id === "string" &&
        typeof obj.phaseNumber === "number" &&
        typeof obj.title === "string" &&
        typeof obj.purpose === "string" &&
        Array.isArray(obj.objectives) &&
        obj.objectives.every((o) => typeof o === "string") &&
        Array.isArray(obj.tasks) &&
        obj.tasks.every((t) => typeof t === "string") &&
        Array.isArray(obj.requiredCapabilities) &&
        obj.requiredCapabilities.every((c) => typeof c === "string") &&
        typeof obj.estimatedImpact === "number" &&
        typeof obj.feasibility === "number" &&
        typeof obj.risk === "number" &&
        typeof obj.alignment === "number" &&
        typeof obj.score === "number" &&
        ["draft", "proposed", "approved", "rejected", "implemented"].includes(obj.status) &&
        Array.isArray(obj.findings) &&
        obj.findings.every(isResearchFinding) &&
        typeof obj.timestamp === "number");
}
function isMeeMetaRule(obj) {
    if (!obj || typeof obj !== "object")
        return false;
    return (typeof obj.id === "string" &&
        typeof obj.name === "string" &&
        typeof obj.description === "string" &&
        ["planner_decomposition", "consensus_weight", "scheduler_concurrency"].includes(obj.heuristicType) &&
        typeof obj.weight === "number" &&
        obj.weight >= 0.0 &&
        obj.weight <= 1.0 &&
        Array.isArray(obj.conditions) &&
        obj.conditions.every((c) => typeof c === "string") &&
        typeof obj.action === "string" &&
        typeof obj.timestamp === "number");
}
function isRefactorInsight(obj) {
    if (!obj || typeof obj !== "object")
        return false;
    return (typeof obj.id === "string" &&
        typeof obj.file === "string" &&
        ["complexity", "duplication", "dead_code", "unused_import", "long_function", "large_module", "drift", "style", "architecture"].includes(obj.type) &&
        typeof obj.message === "string" &&
        ["low", "medium", "high", "critical"].includes(obj.severity) &&
        (obj.location === undefined || (typeof obj.location === "object" && typeof obj.location.startLine === "number" && typeof obj.location.endLine === "number")));
}
//# sourceMappingURL=mee-schema.js.map