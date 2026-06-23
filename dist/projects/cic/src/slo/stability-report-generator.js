"use strict";
// File: projects/cic/src/slo/stability-report-generator.ts | Date: 2026-05-30 | v1.3.4
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStabilityReport = generateStabilityReport;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function generateStabilityReport(evals) {
    const lines = [];
    lines.push("# CIC Stability Report — v1.3.4");
    lines.push("");
    lines.push("Generated: " + new Date().toISOString());
    lines.push("");
    for (const e of evals) {
        lines.push(`## ${e.name}`);
        lines.push(`- OK: ${e.ok}`);
        lines.push(`- p95: ${e.value}`);
        lines.push(`- threshold: ${e.threshold}`);
        if (e.reason)
            lines.push(`- reason: ${e.reason}`);
        lines.push("");
    }
    const out = lines.join("\n");
    const targetPath = "projects/cic/docs/reports/stability/v1.3.4/stability-report.md";
    const dir = path_1.default.dirname(targetPath);
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
    fs_1.default.writeFileSync(targetPath, out);
    return out;
}
//# sourceMappingURL=stability-report-generator.js.map