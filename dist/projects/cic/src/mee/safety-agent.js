"use strict";
// File: projects/cic/src/mee/safety-agent.ts | Date: 2026-06-04 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafetyAgent = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
class SafetyAgent {
    constructor(id, role = "safety") {
        this.id = id;
        this.role = role;
        this.sensitiveFiles = [
            "package.json",
            "tsconfig.json",
            ".gitignore",
            "vite.config.ts",
            ".env"
        ];
    }
    async handleTask(task) {
        if (task.type === "critique") {
            const patches = (task.payload.patches || []);
            const critiques = [];
            for (const patch of patches) {
                // 1. Check for sensitive files
                if (this.sensitiveFiles.some(sf => patch.path.endsWith(sf))) {
                    critiques.push({
                        id: node_crypto_1.default.randomUUID(),
                        agentId: this.id,
                        targetAgentId: "agent-safety",
                        issue: `Safety check: Modification of sensitive configuration file detected: ${patch.path}`,
                        severity: "error",
                        suggestedFix: "Move configurations to non-system files or consult security audit.",
                        timestamp: new Date().toISOString()
                    });
                }
                // 2. Check for child_process exec
                if (/child_process\s*\.\s*(exec|spawn|fork|execSync|spawnSync)/g.test(patch.content)) {
                    critiques.push({
                        id: node_crypto_1.default.randomUUID(),
                        agentId: this.id,
                        targetAgentId: "agent-safety",
                        issue: `Safety check: Forbidden child_process execution pattern detected in file: ${patch.path}`,
                        severity: "error",
                        suggestedFix: "Refactor to use direct system APIs or modules instead of spawning commands.",
                        timestamp: new Date().toISOString()
                    });
                }
                // 3. Check for process.exit
                if (/process\s*\.\s*exit\s*\(/g.test(patch.content)) {
                    critiques.push({
                        id: node_crypto_1.default.randomUUID(),
                        agentId: this.id,
                        targetAgentId: "agent-safety",
                        issue: `Safety check: Forbidden process.exit() pattern detected in file: ${patch.path}`,
                        severity: "warn",
                        suggestedFix: "Throw errors or return failure codes instead of terminating the process.",
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
            const refinedPatches = patches.map(p => {
                let content = p.content;
                // Strip child_process or throw error inside if we find it
                if (/child_process\s*\.\s*(exec|spawn|fork|execSync|spawnSync)/g.test(content)) {
                    content = content.replace(/child_process\s*\.\s*(exec|spawn|fork|execSync|spawnSync)\((.*?)\)/g, "(() => { throw new Error('child_process calls disabled for safety'); })()");
                }
                if (/process\s*\.\s*exit\s*\(/g.test(content)) {
                    content = content.replace(/process\s*\.\s*exit\s*\((.*?)\)/g, "throw new Error('Exit code: ' + ($1 || 0))");
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
exports.SafetyAgent = SafetyAgent;
//# sourceMappingURL=safety-agent.js.map