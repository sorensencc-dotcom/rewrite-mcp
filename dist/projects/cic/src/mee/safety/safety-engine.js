"use strict";
// File: projects/cic/src/mee/safety/safety-engine.ts | Date: 2026-06-03 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeeSafetyEngine = void 0;
class MeeSafetyEngine {
    constructor() {
        this.forbiddenPatterns = [
            { regex: /eval\s*\(/g, name: "eval()" },
            { regex: /new\s+Function\s*\(/g, name: "new Function()" },
            { regex: /child_process\s*\.\s*(exec|spawn|fork|execSync|spawnSync)/g, name: "child_process execution call" },
            { regex: /process\s*\.\s*exit\s*\(/g, name: "process.exit()" }
        ];
        this.sensitiveFiles = [
            "package.json",
            "tsconfig.json",
            ".gitignore",
            "vite.config.ts",
            ".env"
        ];
    }
    analyze(patches) {
        const issues = [];
        let riskLevel = "low";
        // 1. Check for sensitive files
        const modifiedSensitive = patches.filter(p => this.sensitiveFiles.some(sf => p.path.endsWith(sf)));
        if (modifiedSensitive.length > 0) {
            riskLevel = "high";
            modifiedSensitive.forEach(p => {
                issues.push(`Modification of sensitive configuration file detected: ${p.path}`);
            });
        }
        // 2. Check for forbidden patterns in content
        let hasCriticalPattern = false;
        patches.forEach(p => {
            this.forbiddenPatterns.forEach(pattern => {
                if (pattern.regex.test(p.content)) {
                    hasCriticalPattern = true;
                    issues.push(`Forbidden pattern "${pattern.name}" detected in file: ${p.path}`);
                }
            });
        });
        if (hasCriticalPattern) {
            riskLevel = "critical";
        }
        // 3. Medium risk heuristic: multi-file modifications or file creations
        if (riskLevel === "low") {
            const createsFile = patches.some(p => p.type === "create");
            if (patches.length > 3 || createsFile) {
                riskLevel = "medium";
                if (createsFile) {
                    issues.push("Proposal creates one or more new files");
                }
                else {
                    issues.push(`Proposal modifies multiple files (${patches.length} files)`);
                }
            }
        }
        const passed = riskLevel === "low" || riskLevel === "medium";
        return {
            passed,
            riskLevel,
            issues
        };
    }
}
exports.MeeSafetyEngine = MeeSafetyEngine;
//# sourceMappingURL=safety-engine.js.map