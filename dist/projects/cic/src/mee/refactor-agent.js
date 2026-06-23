"use strict";
// File: projects/cic/src/mee/refactor-agent.ts | Date: 2026-06-04 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefactorAgent = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
class RefactorAgent {
    constructor(id, role = "refactor") {
        this.id = id;
        this.role = role;
    }
    async handleTask(task) {
        if (task.type === "critique") {
            const patches = (task.payload.patches || []);
            const critiques = [];
            for (const patch of patches) {
                if (patch.content.includes("eval(")) {
                    critiques.push({
                        id: node_crypto_1.default.randomUUID(),
                        agentId: this.id,
                        targetAgentId: "agent-refactor", // critiquing the patch/code producer
                        issue: `Forbidden pattern "eval" detected in file: ${patch.path}`,
                        severity: "error",
                        suggestedFix: "Use JSON.parse or a safe function evaluation library instead.",
                        timestamp: new Date().toISOString()
                    });
                }
                // Smell: check for long lines
                const lines = patch.content.split("\n");
                const hasLongLine = lines.some(line => line.length > 120);
                if (hasLongLine) {
                    critiques.push({
                        id: node_crypto_1.default.randomUUID(),
                        agentId: this.id,
                        targetAgentId: "agent-refactor",
                        issue: `Line length smell in: ${patch.path}`,
                        severity: "warn",
                        suggestedFix: "Wrap lines longer than 120 characters.",
                        timestamp: new Date().toISOString()
                    });
                }
                // Info: check if file lacks comments
                if (!patch.content.includes("//") && !patch.content.includes("/*")) {
                    critiques.push({
                        id: node_crypto_1.default.randomUUID(),
                        agentId: this.id,
                        targetAgentId: "agent-refactor",
                        issue: `Lack of comments/documentation in code: ${patch.path}`,
                        severity: "info",
                        suggestedFix: "Add brief inline comments explaining complex logic.",
                        timestamp: new Date().toISOString()
                    });
                }
            }
            return {
                id: node_crypto_1.default.randomUUID(),
                taskId: task.id,
                agentId: this.id,
                createdAt: new Date().toISOString(),
                direction: "response",
                content: JSON.stringify({ critiques }),
                metadata: { critiques }
            };
        }
        if (task.type === "refine") {
            const patches = (task.payload.patches || []);
            const critiques = (task.payload.critiques || []);
            // Apply refinements: e.g., fix eval or wrap long lines
            const refinedPatches = patches.map(p => {
                let content = p.content;
                // Heuristic fix: replace eval(xyz) with mock safe execution or remove it
                if (content.includes("eval(")) {
                    content = content.replace(/eval\((.*?)\)/g, "JSON.parse($1)");
                }
                // Wrap long lines or clean formatting
                const lines = content.split("\n");
                const wrappedLines = lines.map(line => {
                    if (line.length > 120 && line.includes("//")) {
                        // wrap comment
                        const idx = line.indexOf("//");
                        return line.substring(0, idx) + "\n  " + line.substring(idx);
                    }
                    return line;
                });
                // Add a header comment if info critique exists
                if (critiques.some(c => c.issue.includes("Lack of comments"))) {
                    content = `// Refined Refactor Patch | v1.0.1\n` + wrappedLines.join("\n");
                }
                else {
                    content = wrappedLines.join("\n");
                }
                return { ...p, content };
            });
            return {
                id: node_crypto_1.default.randomUUID(),
                taskId: task.id,
                agentId: this.id,
                createdAt: new Date().toISOString(),
                direction: "response",
                content: JSON.stringify({ refinedPatches }),
                metadata: { refinedPatches }
            };
        }
        return {
            id: node_crypto_1.default.randomUUID(),
            taskId: task.id,
            agentId: this.id,
            createdAt: new Date().toISOString(),
            direction: "response",
            content: JSON.stringify({ ok: true })
        };
    }
}
exports.RefactorAgent = RefactorAgent;
//# sourceMappingURL=refactor-agent.js.map