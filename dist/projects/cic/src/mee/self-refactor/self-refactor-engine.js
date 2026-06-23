"use strict";
// File: projects/cic/src/mee/self-refactor/self-refactor-engine.ts | Date: 2026-06-03 | v1.1.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelfRefactorEngine = void 0;
const static_analysis_js_1 = require("./static-analysis.js");
class SelfRefactorEngine {
    constructor() {
        this.analyzer = new static_analysis_js_1.StaticAnalysisEngine();
    }
    scan(files) {
        return files.flatMap((f) => this.analyzer.analyzeFile(f.path, f.content));
    }
    generatePlan(insights) {
        const patches = [];
        for (const insight of insights) {
            if (insight.type === "complexity" ||
                insight.type === "long_function" ||
                insight.type === "large_module") {
                patches.push({
                    path: insight.file,
                    type: "modify",
                    content: "// TODO: auto-refactor high complexity or size region\n" +
                        `// ${insight.message}\n`,
                });
            }
            else if (insight.type === "duplication") {
                patches.push({
                    path: insight.file,
                    type: "modify",
                    content: "// TODO: auto-refactor code duplication\n" +
                        `// ${insight.message}\n`,
                });
            }
            else if (insight.type === "dead_code" ||
                insight.type === "unused_import") {
                patches.push({
                    path: insight.file,
                    type: "modify",
                    content: "// TODO: auto-refactor unused declarations\n" +
                        `// ${insight.message}\n`,
                });
            }
            else if (insight.type === "drift" ||
                insight.type === "architecture" ||
                insight.type === "style") {
                patches.push({
                    path: insight.file,
                    type: "modify",
                    content: "// TODO: auto-refactor architectural rules violation\n" +
                        `// ${insight.message}\n`,
                });
            }
        }
        return {
            insights,
            patches,
            summary: `Generated ${patches.length} refactor patches`,
        };
    }
    toProposal(plan) {
        return {
            id: `refactor-${Date.now()}`,
            title: "CIC Self-Refactor Plan",
            status: "pending",
            planSummary: plan.summary,
            filesCreated: plan.patches.map(p => p.path),
            timestamp: Date.now(),
            refactorPlan: plan
        };
    }
}
exports.SelfRefactorEngine = SelfRefactorEngine;
//# sourceMappingURL=self-refactor-engine.js.map