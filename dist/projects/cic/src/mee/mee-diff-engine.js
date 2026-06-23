"use strict";
// File: projects/cic/src/mee/mee-diff-engine.ts | Date: 2026-06-03 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeeDiffEngine = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
class MeeDiffEngine {
    generateDiff(patch) {
        const full = node_path_1.default.join(process.cwd(), patch.path);
        const oldContent = node_fs_1.default.existsSync(full)
            ? node_fs_1.default.readFileSync(full, "utf8")
            : null;
        const newContent = patch.content;
        const oldLines = oldContent ? oldContent.split("\n") : [];
        const newLines = newContent.split("\n");
        const chunks = [];
        const max = Math.max(oldLines.length, newLines.length);
        for (let i = 0; i < max; i++) {
            const oldLine = oldLines[i] ?? null;
            const newLine = newLines[i] ?? null;
            if (oldLine === newLine) {
                chunks.push({
                    type: "context",
                    oldLine: i + 1,
                    newLine: i + 1,
                    content: oldLine ?? "",
                });
            }
            else {
                if (oldLine !== null) {
                    chunks.push({
                        type: "remove",
                        oldLine: i + 1,
                        newLine: null,
                        content: oldLine,
                    });
                }
                if (newLine !== null) {
                    chunks.push({
                        type: "add",
                        oldLine: null,
                        newLine: i + 1,
                        content: newLine,
                    });
                }
            }
        }
        return {
            path: patch.path,
            oldContent,
            newContent,
            chunks,
        };
    }
}
exports.MeeDiffEngine = MeeDiffEngine;
//# sourceMappingURL=mee-diff-engine.js.map